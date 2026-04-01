const express = require('express');
const router = express.Router();
const { getStudentFeed, getMyDiplomas, receiveDocument } = require('../controllers/docController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Feed văn bản mới nhất (DECISION, TRANSCRIPT)
router.get('/feed', protect, authorize('STUDENT'), getStudentFeed);

// Văn bằng cá nhân SV
router.get('/diplomas', protect, authorize('STUDENT'), getMyDiplomas);

// Nhận/tải văn bằng — ghi log receivedAt
router.post('/docs/:id/receive', protect, authorize('STUDENT'), receiveDocument);

module.exports = router;
