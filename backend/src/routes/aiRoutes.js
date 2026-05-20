const express = require('express');
const { chatWithAI } = require('../controllers/aiController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/chat', protect, authorize('STUDENT', 'SYS_ADMIN'), chatWithAI);

module.exports = router;
