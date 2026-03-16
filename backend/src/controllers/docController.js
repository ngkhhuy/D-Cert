const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const ShortLink = require('../models/ShortLink');
const { generateCertificatePDF } = require('../utils/pdfUtils');
const { hashFile } = require('../utils/hashUtils');
const { generateShortCode } = require('../utils/stringUtils');

/**
 * @route   POST /api/docs/draft
 * @desc    Tạo bản nháp văn bằng (Chưa có Hash, chưa lên Blockchain)
 * @access  Private (Chỉ OFFICER hoặc SYS_ADMIN)
 */
const VALID_DEGREE_LEVELS = ['BACHELOR', 'ENGINEER', 'ARCHITECT', 'MASTER', 'DOCTOR'];

const createDraft = async (req, res) => {
    try {
        const { docId, docType, holderName, holderId, degreeLevel, metadata } = req.body;

        if (!docId || !docType || !holderName) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp đầy đủ docId, docType và holderName' 
            });
        }

        const validTypes = ['DIPLOMA', 'DECISION', 'TRANSCRIPT'];
        if (!validTypes.includes(docType)) {
            return res.status(400).json({ 
                success: false, 
                message: `Loại văn bản không hợp lệ. Chỉ chấp nhận: ${validTypes.join(', ')}` 
            });
        }

        // degreeLevel bắt buộc và phải hợp lệ khi docType là DIPLOMA
        if (docType === 'DIPLOMA') {
            if (!degreeLevel || !VALID_DEGREE_LEVELS.includes(degreeLevel)) {
                return res.status(400).json({
                    success: false,
                    message: `Vui lòng cung cấp degreeLevel hợp lệ cho văn bằng DIPLOMA. Chỉ chấp nhận: ${VALID_DEGREE_LEVELS.join(', ')}`
                });
            }
        }

        const existingDoc = await Document.findOne({ docId });
        if (existingDoc) {
            return res.status(400).json({ 
                success: false, 
                message: `Mã văn bản ${docId} đã tồn tại trong hệ thống` 
            });
        }

        const newDoc = await Document.create({
            docId,
            docType,
            degreeLevel,
            holderName,
            holderId,
            metadata,
            issuer: req.user._id
        });

        res.status(201).json({
            success: true,
            message: 'Tạo bản nháp văn bản thành công',
            data: newDoc
        });

    } catch (error) {
        console.error('Create Draft Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ khi tạo bản nháp' });
    }
};

/**
 * @route   POST /api/docs/issue/:id
 * @desc    Ký & Phát hành văn bằng: Sinh PDF -> QR -> Hash -> Cập nhật DB
 * @access  Private (Chỉ SIGNER hoặc SYS_ADMIN)
 */
const issueDocument = async (req, res) => {
    const outputPath = null;
    try {
        // Bước 1: Lấy bản nháp, kiểm tra tồn tại và trạng thái
        const doc = await Document.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy văn bản' });
        }
        if (doc.status !== 'DRAFT') {
            return res.status(400).json({ success: false, message: `Văn bản đang ở trạng thái [${doc.status}], chỉ bản DRAFT mới được phát hành` });
        }

        // Bước 2: Tạo shortCode và URL xác thực để nhúng vào QR
        // Tạo shortCode trước khi sinh PDF vì QR cần URL này
        const shortCode = generateShortCode(6);
        const verifyUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/v/${shortCode}`;

        // Bước 3: Đổ khuôn — Sinh file PDF từ phôi + dữ liệu bản nháp
        const uploadDir = path.join(__dirname, '../../public/uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const resolvedOutputPath = path.join(uploadDir, `${doc.docId}.pdf`);

        await generateCertificatePDF(doc.toObject(), resolvedOutputPath, verifyUrl);

        // Bước 4: Băm SHA256 file PDF vừa sinh
        const docHash = await hashFile(resolvedOutputPath);

        // Bước 5: Giả lập txHash (Blockchain sẽ làm ở Giai đoạn 2)
        const mockTxHash = '0xMOCK_' + docHash.substring(0, 16).toUpperCase();

        // Bước 6: Cập nhật Document trong DB
        doc.docHash  = docHash;
        doc.txHash   = mockTxHash;
        doc.status   = 'ACTIVE';
        await doc.save();

        // Bước 7: Tạo bản ghi ShortLink
        await ShortLink.create({
            shortCode,
            document: doc._id,
            docHash,
        });

        res.status(200).json({
            success: true,
            message: 'Phát hành văn bằng thành công',
            data: {
                docId:     doc.docId,
                docHash,
                txHash:    mockTxHash,
                verifyUrl,
                pdfPath:   `/uploads/${doc.docId}.pdf`,
            }
        });

    } catch (error) {
        // Dọn file PDF nếu quá trình bị lỗi giữa chừng
        if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        console.error('Issue Document Error:', error);
        res.status(500).json({ success: false, message: error.message || 'Lỗi máy chủ nội bộ khi phát hành văn bằng' });
    }
};

module.exports = { createDraft, issueDocument };