const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
    uploadKnowledgeDocument,
    getKnowledgeDocuments,
    getKnowledgeDocumentById,
    publishKnowledgeDocument,
    archiveKnowledgeDocument,
    reindexKnowledgeDocument,
} = require('../controllers/knowledgeController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

const knowledgeUploadDir = path.join(__dirname, '../../uploads/knowledge');
if (!fs.existsSync(knowledgeUploadDir)) {
    fs.mkdirSync(knowledgeUploadDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
];

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, knowledgeUploadDir),
    filename: (req, file, cb) => {
        const safeBaseName = path.basename(file.originalname, path.extname(file.originalname))
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9-_]/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 80) || 'knowledge';
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${safeBaseName}${ext}`);
    },
});

const uploadKnowledgeFile = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) return cb(null, true);
        return cb(new Error('Chỉ chấp nhận file PDF, DOCX hoặc TXT'));
    },
});

const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'File vượt quá giới hạn 20MB'
            : err.message;
        return res.status(400).json({ success: false, message });
    }
    if (err?.message === 'Chỉ chấp nhận file PDF, DOCX hoặc TXT') {
        return res.status(400).json({ success: false, message: err.message });
    }
    return next(err);
};

router.post(
    '/',
    protect,
    authorize('OFFICER', 'SYS_ADMIN'),
    uploadKnowledgeFile.single('file'),
    handleUploadError,
    uploadKnowledgeDocument,
);

router.get('/', protect, authorize('SYS_ADMIN', 'OFFICER', 'SIGNER'), getKnowledgeDocuments);
router.get('/:id', protect, authorize('SYS_ADMIN', 'OFFICER', 'SIGNER'), getKnowledgeDocumentById);
router.patch('/:id/publish', protect, authorize('SYS_ADMIN', 'SIGNER'), publishKnowledgeDocument);
router.patch('/:id/archive', protect, authorize('SYS_ADMIN', 'SIGNER'), archiveKnowledgeDocument);
router.post('/:id/reindex', protect, authorize('SYS_ADMIN', 'SIGNER'), reindexKnowledgeDocument);

module.exports = router;
