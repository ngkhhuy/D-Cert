const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const QRCode = require('qrcode');
const Document = require('../models/Document');
const ShortLink = require('../models/ShortLink');
const { generateCertificatePDF } = require('../utils/pdfUtils');
const { hashFile } = require('../utils/hashUtils');
const { generateShortCode } = require('../utils/stringUtils');
const blockchainService = require('../services/blockchainService');

/**
 * @route   POST /api/docs/draft
 * @desc    Tạo bản nháp văn bằng (Chưa có Hash, chưa lên Blockchain)
 * @access  Private (Chỉ OFFICER hoặc SYS_ADMIN)
 */
const VALID_DEGREE_LEVELS = ['BACHELOR', 'ENGINEER', 'ARCHITECT', 'MASTER', 'DOCTOR'];

const parseMetadata = (rawMetadata) => {
    if (!rawMetadata) return {};
    if (typeof rawMetadata === 'object') return rawMetadata;
    try {
        return JSON.parse(rawMetadata);
    } catch {
        return null;
    }
};

const genUploadDocId = () => `UP-${new Date().getFullYear()}-${generateShortCode(8).toUpperCase()}`;

const stampPdfWithQr = async (inputPath, outputPath, qrText) => {
    const inputBytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.load(inputBytes);
    const qrDataUrl = await QRCode.toDataURL(qrText, { margin: 1, width: 256 });
    const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    const qrImage = await pdfDoc.embedPng(qrImageBytes);

    const page = pdfDoc.getPages()[0];
    const size = 90;
    const margin = 20;
    const x = Math.max(margin, page.getWidth() - size - margin);
    const y = margin;

    page.drawImage(qrImage, { x, y, width: size, height: size });

    const outputBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, outputBytes);
};

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
 * @route   POST /api/docs/draft/upload
 * @desc    Tạo bản nháp từ file PDF tải lên (chưa ký, chưa lên blockchain)
 * @access  Private (OFFICER hoặc SYS_ADMIN)
 */
const createDraftFromUpload = async (req, res) => {
    let stampedPath = null;
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng tải lên file PDF' });
        }

        const {
            docId,
            docType = 'DECISION',
            holderName,
            holderId,
            degreeLevel,
            metadata,
        } = req.body;

        const resolvedDocId = (docId || '').trim() || genUploadDocId();
        const inferredHolderName =
            (holderName || '').trim() ||
            path.parse(req.file.originalname).name ||
            `Van ban ${resolvedDocId}`;

        const validTypes = ['DIPLOMA', 'DECISION', 'TRANSCRIPT'];
        if (!validTypes.includes(docType)) {
            return res.status(400).json({
                success: false,
                message: `Loại văn bản không hợp lệ. Chỉ chấp nhận: ${validTypes.join(', ')}`,
            });
        }

        if (docType === 'DIPLOMA' && (!degreeLevel || !VALID_DEGREE_LEVELS.includes(degreeLevel))) {
            return res.status(400).json({
                success: false,
                message: `Vui lòng cung cấp degreeLevel hợp lệ. Chỉ chấp nhận: ${VALID_DEGREE_LEVELS.join(', ')}`,
            });
        }

        const existingDoc = await Document.findOne({ docId: resolvedDocId });
        if (existingDoc) {
            return res.status(400).json({
                success: false,
                message: `Mã văn bản ${resolvedDocId} đã tồn tại trong hệ thống`,
            });
        }

        const metadataObj = parseMetadata(metadata);
        if (metadata && metadataObj === null) {
            return res.status(400).json({ success: false, message: 'metadata phải là JSON hợp lệ' });
        }

        const draftQrText = `D-CERT-DRAFT:${resolvedDocId}`;
        stampedPath = path.join(path.dirname(req.file.path), `${resolvedDocId}-${req.file.filename}.pdf`);
        await stampPdfWithQr(req.file.path, stampedPath, draftQrText);
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        const newDoc = await Document.create({
            docId: resolvedDocId,
            docType,
            degreeLevel,
            holderName: inferredHolderName,
            holderId,
            metadata: {
                ...(metadataObj || {}),
                sourcePdf: {
                    mode: 'uploaded',
                    storedName: path.basename(stampedPath),
                    originalName: req.file.originalname,
                    draftQrText,
                },
            },
            issuer: req.user._id,
        });

        return res.status(201).json({
            success: true,
            message: 'Tạo bản nháp từ PDF thành công',
            data: newDoc,
        });
    } catch (error) {
        // Nếu tạo draft lỗi thì dọn file đã tải lên để tránh rác
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        if (stampedPath && fs.existsSync(stampedPath)) {
            fs.unlinkSync(stampedPath);
        }
        console.error('Create Draft From Upload Error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ khi tạo bản nháp từ PDF' });
    }
};

/**
 * @route   POST /api/docs/issue/:id
 * @desc    Ký & Phát hành văn bằng: Sinh PDF -> QR -> Hash -> Cập nhật DB
 * @access  Private (Chỉ SIGNER hoặc SYS_ADMIN)
 */
const issueDocument = async (req, res) => {
    let outputPath = null;
    let uploadedDraftPath = null;
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

        // Bước 3: Tạo file PDF đầu ra
        const uploadDir = path.join(__dirname, '../../public/uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        outputPath = path.join(uploadDir, `${doc.docId}.pdf`);

        // Nếu draft được tạo từ file PDF upload, dùng file đó làm source để ký duyệt.
        const uploadedStoredName = doc.metadata?.sourcePdf?.storedName;
        if (uploadedStoredName) {
            uploadedDraftPath = path.join(uploadDir, 'drafts', uploadedStoredName);
            if (!fs.existsSync(uploadedDraftPath)) {
                return res.status(400).json({
                    success: false,
                    message: 'Không tìm thấy file PDF bản nháp đã upload. Vui lòng tải lại file.',
                });
            }
            fs.copyFileSync(uploadedDraftPath, outputPath);
            await stampPdfWithQr(outputPath, outputPath, verifyUrl);
        } else {
            // Đổ khuôn từ dữ liệu nếu không có file upload
            await generateCertificatePDF(doc.toObject(), outputPath, verifyUrl);
        }

        // Bước 4: Băm SHA256 file PDF vừa sinh
        const docHash = await hashFile(outputPath);

        // Bước 5: Ghi hash lên Sepolia Blockchain
        const txHash = await blockchainService.issueOnChain(docHash);

        // Bước 6: Cập nhật Document trong DB
        doc.docHash  = docHash;
        doc.txHash   = txHash;
        doc.status   = 'ACTIVE';
        await doc.save();

        // Bước 7: Tạo bản ghi ShortLink
        await ShortLink.create({
            shortCode,
            document: doc._id,
            docHash,
        });

        // Dọn file draft upload sau khi đã phát hành thành công
        if (uploadedDraftPath && fs.existsSync(uploadedDraftPath)) {
            fs.unlinkSync(uploadedDraftPath);
        }

        res.status(200).json({
            success: true,
            message: 'Phát hành văn bằng thành công',
            data: {
                docId:     doc.docId,
                docHash,
                txHash,
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

/**
 * @route   GET /api/docs
 * @desc    Lấy danh sách tất cả văn bằng (có phân trang)
 * @access  Private
 */
const getAllDocs = async (req, res) => {
    try {
        const docs = await Document.find()
            .sort({ createdAt: -1 })
            .select('docId docType degreeLevel holderName holderId status txHash createdAt');
        res.json({ success: true, count: docs.length, data: docs });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

/**
 * @route   GET /api/docs/:id
 * @desc    Lấy chi tiết một văn bằng theo MongoDB _id
 * @access  Private
 */
const getDocById = async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id)
            .populate('issuer', 'fullName username role');
        if (!doc) return res.status(404).json({ success: false, message: 'Không tìm thấy văn bằng' });
        res.json({ success: true, data: doc });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

module.exports = { createDraft, createDraftFromUpload, issueDocument, getAllDocs, getDocById };