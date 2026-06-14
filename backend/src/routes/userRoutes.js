const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { listUsers, createUser, updateUserStatus } = require('../controllers/userController');

const router = express.Router();

router.get('/me', protect, (req, res) => {
  res.json({ success: true, data: req.user });
});

router.get('/', protect, authorize('SYS_ADMIN'), listUsers);
router.post('/', protect, authorize('SYS_ADMIN'), createUser);
router.patch('/:id/status', protect, authorize('SYS_ADMIN'), updateUserStatus);

module.exports = router;
