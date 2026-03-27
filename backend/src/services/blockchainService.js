const { ethers } = require('ethers');

// ABI tối giản — chỉ các hàm cần dùng
// Lưu ý: ethers v6 không chấp nhận từ khóa "nonpayable" trong human-readable ABI
const CONTRACT_ABI = [
    "function issueDocument(bytes32 _docHash)",
    "function revokeDocument(bytes32 _docHash)",
    "function verifyDocument(bytes32 _docHash) view returns (bool isValid, address issuer, uint256 timestamp)",
];

/**
 * Tạo contract instance có Signer (dùng cho issueDocument, revokeDocument)
 */
function getSignerContract() {
    const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
    const signer = new ethers.Wallet(process.env.SIGNER_PRIVATE_KEY, provider);
    return new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

/**
 * Tạo contract instance chỉ đọc (dùng cho verifyDocument)
 */
function getReadonlyContract() {
    const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC_URL);
    return new ethers.Contract(process.env.CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

/**
 * Ghi hash văn bằng lên Sepolia, trả về txHash đã được xác nhận
 * @param {string} docHash - SHA256 hex string 64 ký tự (không có 0x)
 * @returns {Promise<string>} txHash giao dịch
 */
const issueOnChain = async (docHash) => {
    const contract = getSignerContract();
    const bytes32Hash = '0x' + docHash;
    const tx = await contract.issueDocument(bytes32Hash);
    const receipt = await tx.wait();
    return receipt.hash;
};

/**
 * Thu hồi văn bằng trên blockchain
 * @param {string} docHash - SHA256 hex string 64 ký tự (không có 0x)
 * @returns {Promise<string>} txHash giao dịch
 */
const revokeOnChain = async (docHash) => {
    const contract = getSignerContract();
    const bytes32Hash = '0x' + docHash;
    const tx = await contract.revokeDocument(bytes32Hash);
    const receipt = await tx.wait();
    return receipt.hash;
};

/**
 * Tra cứu trạng thái văn bằng trên blockchain (không tốn gas)
 * @param {string} docHash - SHA256 hex string 64 ký tự (không có 0x)
 * @returns {Promise<{isValid: boolean, issuer: string, issuedAt: string|null}>}
 */
const verifyOnChain = async (docHash) => {
    const contract = getReadonlyContract();
    const bytes32Hash = '0x' + docHash;
    const [isValid, issuer, timestamp] = await contract.verifyDocument(bytes32Hash);
    return {
        isValid,
        issuer,
        issuedAt: timestamp > 0n ? new Date(Number(timestamp) * 1000).toISOString() : null,
    };
};

module.exports = { issueOnChain, revokeOnChain, verifyOnChain };
