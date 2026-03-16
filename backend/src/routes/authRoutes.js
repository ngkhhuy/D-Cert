const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.post('/login', login);

router.get('/me', protect, (req, res) => {
    res.status(200).json({ success: true, user: req.user });
});

module.exports = router;