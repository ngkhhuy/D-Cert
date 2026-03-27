// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title   DocumentRegistry
 * @author  D-Cert System
 * @notice  Hợp đồng lưu trữ và xác thực mã băm (SHA-256) của văn bằng trên Ethereum.
 *
 * ── TỐI ƯU GAS ──────────────────────────────────────────────────────────────
 *  1. `bytes32` thay vì `string` cho docHash:
 *     SHA-256 luôn là 32 bytes cố định. Dùng `bytes32` tiết kiệm chi phí
 *     so sánh (hashing mapping key) và không tốn overhead dynamic-length.
 *
 *  2. Struct packing (2 storage slots thay vì 4):
 *     Solidity đóng gói biến theo slot 32-byte. Đặt `address` (20 bytes) +
 *     `bool isValid` (1 byte) + `bool exists` (1 byte) = 22 bytes → 1 slot.
 *     `uint256 timestamp` = 1 slot riêng. Tổng: 2 slots / record.
 *
 *  3. `immutable` cho biến `admin`:
 *     Biến `immutable` được nhúng thẳng vào bytecode lúc deploy, đọc nhanh
 *     hơn SLOAD (đọc từ storage) khoảng 2100 gas → ~97 gas.
 *
 *  4. Custom Errors thay vì `require("string")`:
 *     ABI-encode lỗi chỉ 4 bytes selector so với chuỗi text dài → tiết kiệm
 *     gas khi revert, đặc biệt hữu ích khi message dài.
 * ─────────────────────────────────────────────────────────────────────────────
 */
contract DocumentRegistry {

    // ─── CUSTOM ERRORS ────────────────────────────────────────────────────────
    /// Chỉ admin (địa chỉ deploy contract) mới được gọi hàm này
    error OnlyAdmin();
    /// Hash này đã tồn tại trong hệ thống, không được cấp lại
    error HashAlreadyExists();
    /// Hash này chưa được cấp phát trong hệ thống
    error HashNotFound();
    /// Văn bằng đã bị thu hồi trước đó, không thể thu hồi lại
    error AlreadyRevoked();

    // ─── STRUCT ───────────────────────────────────────────────────────────────
    /**
     * @dev Thông tin lưu trữ của một văn bằng.
     *      Layout tối ưu: address (20) + bool (1) + bool (1) = 22 bytes → slot 1
     *                     uint256 timestamp = 32 bytes → slot 2
     */
    struct DocumentRecord {
        address issuer;      // Ví của người ký cấp (SIGNER)
        bool    isValid;     // Trạng thái: true = hợp lệ, false = đã thu hồi
        bool    exists;      // Cờ kiểm tra tồn tại (tránh nhầm với zero-value)
        uint256 timestamp;   // Unix timestamp lúc cấp phát (block.timestamp)
    }

    // ─── STATE VARIABLES ──────────────────────────────────────────────────────

    /// Địa chỉ admin — bất biến sau khi deploy, đọc từ bytecode (tiết kiệm gas)
    address public immutable admin;

    /// Ánh xạ: bytes32(docHash) → DocumentRecord
    /// Backend cần chuyển hex string SHA-256 sang bytes32 trước khi gọi
    mapping(bytes32 => DocumentRecord) private _records;

    // ─── EVENTS ───────────────────────────────────────────────────────────────

    /**
     * @dev Phát ra khi một văn bằng được cấp phát thành công.
     * @param docHash   Mã băm SHA-256 của file PDF (dạng bytes32)
     * @param issuer    Địa chỉ ví người ký cấp
     * @param timestamp Thời điểm giao dịch (Unix)
     */
    event DocumentIssued(
        bytes32 indexed docHash,
        address indexed issuer,
        uint256         timestamp
    );

    /**
     * @dev Phát ra khi một văn bằng bị thu hồi.
     * @param docHash   Mã băm SHA-256 của văn bằng bị thu hồi
     * @param revokedBy Địa chỉ admin thực hiện thu hồi
     */
    event DocumentRevoked(
        bytes32 indexed docHash,
        address indexed revokedBy
    );

    // ─── MODIFIER ─────────────────────────────────────────────────────────────

    /// Bảo vệ hàm — chỉ admin mới được thực thi
    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    // ─── CONSTRUCTOR ──────────────────────────────────────────────────────────

    /**
     * @dev Gán người deploy làm admin duy nhất của contract.
     */
    constructor() {
        admin = msg.sender;
    }

    // ─── WRITE FUNCTIONS ──────────────────────────────────────────────────────

    /**
     * @notice Cấp phát văn bằng: lưu mã băm của file PDF lên blockchain.
     * @dev    Chỉ admin mới gọi được. Hash phải chưa tồn tại.
     *         Backend truyền vào bytes32 = abi.encode của chuỗi SHA-256 hex.
     * @param  _docHash  bytes32 đại diện cho mã SHA-256 của file PDF văn bằng
     */
    function issueDocument(bytes32 _docHash) external onlyAdmin {
        // Kiểm tra hash chưa được cấp trước đó
        if (_records[_docHash].exists) revert HashAlreadyExists();

        // Lưu record — ghi 2 storage slots
        _records[_docHash] = DocumentRecord({
            issuer:    msg.sender,
            isValid:   true,
            exists:    true,
            timestamp: block.timestamp
        });

        emit DocumentIssued(_docHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Thu hồi văn bằng: đánh dấu hash là không còn hợp lệ.
     * @dev    Chỉ admin mới gọi được. Hash phải tồn tại và đang còn hiệu lực.
     *         Không xóa record để giữ lịch sử on-chain.
     * @param  _docHash  bytes32 của văn bằng cần thu hồi
     */
    function revokeDocument(bytes32 _docHash) external onlyAdmin {
        DocumentRecord storage rec = _records[_docHash];

        if (!rec.exists)  revert HashNotFound();
        if (!rec.isValid) revert AlreadyRevoked();

        // Chỉ cập nhật 1 bit trong slot 1 — tốn ít gas hơn ghi toàn bộ struct
        rec.isValid = false;

        emit DocumentRevoked(_docHash, msg.sender);
    }

    // ─── READ FUNCTIONS ───────────────────────────────────────────────────────

    /**
     * @notice Xác thực văn bằng — ai cũng có thể gọi, KHÔNG tốn gas (view).
     * @param  _docHash  bytes32 của văn bằng cần tra cứu
     * @return isValid   true nếu văn bằng hợp lệ, false nếu đã thu hồi
     * @return issuer    Địa chỉ ví người đã ký cấp văn bằng
     * @return timestamp Thời điểm cấp phát (Unix timestamp)
     */
    function verifyDocument(bytes32 _docHash)
        external
        view
        returns (bool isValid, address issuer, uint256 timestamp)
    {
        DocumentRecord storage rec = _records[_docHash];
        if (!rec.exists) revert HashNotFound();

        return (rec.isValid, rec.issuer, rec.timestamp);
    }
}
