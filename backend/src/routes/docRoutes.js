const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { createDraft, createDraftFromUpload, importDraftsFromCsv, issueDocument, batchIssue, getAllDocs, getDocById } = require('../controllers/docController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const draftUploadDir = path.join(__dirname, '../../public/uploads/drafts');
if (!fs.existsSync(draftUploadDir)) fs.mkdirSync(draftUploadDir, { recursive: true });

const tmpUploadDir = path.join(__dirname, '../../public/uploads/tmp');
if (!fs.existsSync(tmpUploadDir)) fs.mkdirSync(tmpUploadDir, { recursive: true });

const uploadDraftPdf = multer({
	dest: draftUploadDir,
	limits: { fileSize: 20 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (file.mimetype === 'application/pdf') return cb(null, true);
		cb(new Error('Chỉ chấp nhận file PDF'));
	},
});

const uploadCsv = multer({
	dest: tmpUploadDir,
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		const ok = file.mimetype === 'text/csv'
			|| file.mimetype === 'application/vnd.ms-excel'
			|| file.mimetype === 'text/plain'
			|| file.originalname.endsWith('.csv');
		if (ok) return cb(null, true);
		cb(new Error('Chỉ chấp nhận file CSV'));
	},
});

const handleUploadError = (err, req, res, next) => {
	if (err instanceof multer.MulterError || err.message === 'Chỉ chấp nhận file PDF') {
		return res.status(400).json({ success: false, message: err.message });
	}
	return next(err);
};

// Lấy danh sách & chi tiết — mọi role đã đăng nhập
router.get('/', protect, getAllDocs);
router.get('/:id', protect, getDocById);

// Chỉ cho phép OFFICER (Giáo vụ) và SYS_ADMIN (Đào tạo) được phép tạo nháp
router.post('/draft', protect, authorize('OFFICER', 'SYS_ADMIN'), createDraft);
router.post(
	'/draft/upload',
	protect,
	authorize('OFFICER', 'SYS_ADMIN'),
	uploadDraftPdf.single('file'),
	handleUploadError,
	createDraftFromUpload,
);
// Import hàng loạt từ CSV
router.post(
	'/draft/import-csv',
	protect,
	authorize('OFFICER', 'SYS_ADMIN'),
	uploadCsv.single('csv'),
	handleUploadError,
	importDraftsFromCsv,
);

// Chỉ SIGNER (Hiệu trưởng/Ký duyệt) và SYS_ADMIN mới được phát hành
router.post('/issue/batch', protect, authorize('SIGNER', 'SYS_ADMIN'), batchIssue);
router.post('/issue/:id', protect, authorize('SIGNER', 'SYS_ADMIN'), issueDocument);

module.exports = router;