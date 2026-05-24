const express = require('express');
const { chatWithAI, getChatHistory, deleteChatHistory } = require('../controllers/aiController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/chat', protect, authorize('STUDENT', 'SYS_ADMIN'), chatWithAI);
router.get('/history', protect, authorize('STUDENT', 'SYS_ADMIN'), getChatHistory);
router.delete('/history', protect, authorize('STUDENT', 'SYS_ADMIN'), deleteChatHistory);

module.exports = router;
