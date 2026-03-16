const express = require('express');
const router = express.Router();
const { createDraft, issueDocument } = require('../controllers/docController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Chỉ cho phép OFFICER (Giáo vụ) và SYS_ADMIN (Đạo tạo) được phép tạo nháp
router.post('/draft', protect, authorize('OFFICER', 'SYS_ADMIN'), createDraft);

// Chỉ SIGNER (Hiệu trưởng/Ký duyệt) và SYS_ADMIN mới được phát hành
router.post('/issue/:id', protect, authorize('SIGNER', 'SYS_ADMIN'), issueDocument);

module.exports = router;