const express = require('express');
const router = express.Router();
const { createDraft, issueDocument, getAllDocs, getDocById } = require('../controllers/docController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Lấy danh sách & chi tiết — mọi role đã đăng nhập
router.get('/', protect, getAllDocs);
router.get('/:id', protect, getDocById);

// Chỉ cho phép OFFICER (Giáo vụ) và SYS_ADMIN (Đào tạo) được phép tạo nháp
router.post('/draft', protect, authorize('OFFICER', 'SYS_ADMIN'), createDraft);

// Chỉ SIGNER (Hiệu trưởng/Ký duyệt) và SYS_ADMIN mới được phát hành
router.post('/issue/:id', protect, authorize('SIGNER', 'SYS_ADMIN'), issueDocument);

module.exports = router;