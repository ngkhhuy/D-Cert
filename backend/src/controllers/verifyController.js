const fs = require('fs');
const Document = require('../models/Document');
const ShortLink = require('../models/ShortLink');
const { hashFile } = require('../utils/hashUtils');
const blockchainService = require('../services/blockchainService');

const isLocalBackendRequest = (req) => {
    const host = req.get('host') || '';
    return host.startsWith('localhost:3000') || host.startsWith('127.0.0.1:3000');
};

const getPublicVerifyUrl = (req, shortCode) => {
    const baseUrl = process.env.FRONTEND_URL
        || process.env.PUBLIC_APP_URL
        || (isLocalBackendRequest(req) ? 'http://localhost:5173' : '');
    const path = `/verify?code=${encodeURIComponent(shortCode)}`;
    return baseUrl ? `${baseUrl.replace(/\/$/, '')}${path}` : path;
};

const findDocByShortCode = async (shortCode, { trackAccess = true } = {}) => {
    const shortLink = await ShortLink.findOne({ shortCode }).populate({
        path: 'document',
        populate: { path: 'issuer', select: 'fullName email role' },
    });
    if (!shortLink) return { shortLink: null, doc: null };

    if (trackAccess) {
        shortLink.clicks += 1;
        shortLink.lastAccessed = new Date();
        await shortLink.save();
    }

    return { shortLink, doc: shortLink.document };
};

/**
 * @route   GET /v/:shortCode
 * @desc    Khớp mã rút gọn, tăng clicks, trả về thông tin xác thực
 * @access  Public
 */
const redirectShortLink = async (req, res) => {
    try {
        const { shortCode } = req.params;

        const shouldRedirect = req.accepts('html') && !req.query.raw;
        const { shortLink, doc } = await findDocByShortCode(shortCode, { trackAccess: !shouldRedirect });
        if (!shortLink) {
            return res.status(404).json({ success: false, message: 'Mã tra cứu không tồn tại hoặc đã hết hiệu lực' });
        }

        if (!doc) {
            return res.status(404).json({ success: false, message: 'Văn bản liên kết không còn tồn tại' });
        }

        if (shouldRedirect) {
            return res.redirect(302, getPublicVerifyUrl(req, shortCode));
        }

        return res.status(200).json({
            success: true,
            data: await buildVerifyResponse(doc),
        });

    } catch (error) {
        console.error('ShortLink Redirect Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};

/**
 * @route   GET /verify?code=:shortCode
 * @desc    Tương thích với QR/link cũ trỏ thẳng vào backend, chuyển sang trang verify frontend
 * @access  Public
 */
const redirectVerifyPage = async (req, res) => {
    const shortCode = req.query.code || req.query.shortCode;
    if (!shortCode) {
        return res.status(400).json({ success: false, message: 'Thiếu mã xác thực trên URL' });
    }

    return res.redirect(302, getPublicVerifyUrl(req, String(shortCode)));
};

/**
 * @route   GET /api/verify/code/:shortCode
 * @desc    Tra cứu văn bằng bằng mã QR/shortCode
 * @access  Public
 */
const verifyByCode = async (req, res) => {
    try {
        const { shortCode } = req.params;
        const { shortLink, doc } = await findDocByShortCode(shortCode);

        if (!shortLink) {
            return res.status(404).json({ success: false, message: 'Mã tra cứu không tồn tại hoặc đã hết hiệu lực' });
        }
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Văn bản liên kết không còn tồn tại' });
        }

        return res.status(200).json({
            success: true,
            data: await buildVerifyResponse(doc),
        });
    } catch (error) {
        console.error('Verify By Code Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};

/**
 * @route   GET /api/verify/hash/:hash
 * @desc    Tra cứu văn bằng theo docHash (SHA256) — đối chiếu DB
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
            data: await buildVerifyResponse(doc),
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
    // Multer co the luu vao req.file (single) hoac req.files (fields)
    const uploadedFile = req.file || req.files?.file?.[0] || req.files?.pdf?.[0];
    if (!uploadedFile) {
        return res.status(400).json({ success: false, message: 'Vui lòng upload file PDF' });
    }

    const tempPath = uploadedFile.path;
    try {
        // Băm file vừa upload
        const computedHash = await hashFile(tempPath);

        const doc = await Document.findOne({ docHash: computedHash }).populate('issuer', 'fullName email role');
        if (!doc) {
            return res.status(404).json({
                success: false,
                message: 'Văn bằng không hợp lệ hoặc đã bị chỉnh sửa. Không tìm thấy khớp trong hệ thống',
                data: { computedHash },
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Văn bằng hợp lệ. Dữ liệu toàn vẹn.',
            data: {
                ...(await buildVerifyResponse(doc)),
                computedHash,
            },
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
const buildVerifyResponse = async (doc) => {
    let onChain = null;
    if (doc.docHash) {
        try {
            onChain = await blockchainService.verifyOnChain(doc.docHash);
        } catch (error) {
            onChain = {
                checked: false,
                error: error.shortMessage || error.message || 'Không thể đối chiếu blockchain',
            };
        }
    }

    return {
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
        onChain,
    };
};

module.exports = { redirectShortLink, redirectVerifyPage, verifyByCode, verifyByHash, verifyByUpload };
