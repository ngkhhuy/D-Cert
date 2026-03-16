const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { verifyByHash, verifyByUpload } = require('../controllers/verifyController');

// Cấu hình multer: lưu file tạm vào /tmp, chỉ chấp nhận PDF, giới hạn 10MB
const upload = multer({
    dest: '/tmp/',
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file PDF'), false);
        }
    },
});

// Middleware bắt lỗi multer (file sai định dạng, quá dung lượng)
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message === 'Chỉ chấp nhận file PDF') {
        return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
};

router.get('/hash/:hash', verifyByHash);
router.post('/upload', upload.single('file'), handleMulterError, verifyByUpload);

module.exports = router;
