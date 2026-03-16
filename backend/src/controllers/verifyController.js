const fs = require('fs');
const Document = require('../models/Document');
const ShortLink = require('../models/ShortLink');
const { hashFile } = require('../utils/hashUtils');

/**
 * @route   GET /v/:shortCode
 * @desc    Khớp mã rút gọn, tăng clicks, trả về thông tin xác thực
 * @access  Public
 */
const redirectShortLink = async (req, res) => {
    try {
        const { shortCode } = req.params;

        const shortLink = await ShortLink.findOne({ shortCode }).populate('document');
        if (!shortLink) {
            return res.status(404).json({ success: false, message: 'Mã tra cứu không tồn tại hoặc đã hết hiệu lực' });
        }

        // Tăng click & cập nhật thời gian truy cập cuối
        shortLink.clicks += 1;
        shortLink.lastAccessed = new Date();
        await shortLink.save();

        const doc = shortLink.document;
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Văn bản liên kết không còn tồn tại' });
        }

        return res.status(200).json({
            success: true,
            data: buildVerifyResponse(doc),
        });

    } catch (error) {
        console.error('ShortLink Redirect Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};

/**
 * @route   GET /api/verify/hash/:hash
 * @desc    Tra cứu văn bằng theo docHash (SHA256) — đối chiếu DB, Phase 2 sẽ thêm on-chain lookup
 * @access  Public
 */
const verifyByHash = async (req, res) => {
    try {
        const { hash } = req.params;

        if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
            return res.status(400).json({ success: false, message: 'Hash không hợp lệ. Cần chuỗi SHA256 64 ký tự hex' });
        }

        const doc = await Document.findOne({ docHash: hash }).populate('issuer', 'fullName email role');
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy văn bằng khớp với mã hash này' });
        }

        return res.status(200).json({
            success: true,
            data: buildVerifyResponse(doc),
        });

    } catch (error) {
        console.error('Verify By Hash Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};

/**
 * @route   POST /api/verify/upload
 * @desc    Upload file PDF → băm lại SHA256 → so khớp docHash trong DB
 * @access  Public
 */
const verifyByUpload = async (req, res) => {
    // Multer đã lưu file tạm vào req.file
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Vui lòng upload file PDF' });
    }

    const tempPath = req.file.path;
    try {
        // Băm file vừa upload
        const computedHash = await hashFile(tempPath);

        const doc = await Document.findOne({ docHash: computedHash }).populate('issuer', 'fullName email role');
        if (!doc) {
            return res.status(404).json({
                success: false,
                message: 'Văn bằng không hợp lệ hoặc đã bị chỉnh sửa. Không tìm thấy khớp trong hệ thống',
                computedHash,
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Văn bằng hợp lệ. Dữ liệu toàn vẹn.',
            data: buildVerifyResponse(doc),
        });

    } catch (error) {
        console.error('Verify By Upload Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ khi xử lý file' });
    } finally {
        // Luôn xóa file tạm dù thành công hay lỗi — tránh rác trên ổ cứng
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
};

// Helper: Chọn lọc trường trả về cho client — không lộ _id nội bộ, issuer chi tiết
const buildVerifyResponse = (doc) => ({
    docId:       doc.docId,
    docType:     doc.docType,
    degreeLevel: doc.degreeLevel,
    holderName:  doc.holderName,
    holderId:    doc.holderId,
    metadata:    doc.metadata,
    docHash:     doc.docHash,
    txHash:      doc.txHash,
    ipfsHash:    doc.ipfsHash,
    status:      doc.status,
    issuedAt:    doc.updatedAt,
    issuer:      doc.issuer,
});

module.exports = { redirectShortLink, verifyByHash, verifyByUpload };
