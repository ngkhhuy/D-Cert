const User = require('../models/User');

const publicUserFields = '-password';

const listUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select(publicUserFields)
      .sort({ role: 1, username: 1 });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('List Users Error:', error);
    res.status(500).json({ success: false, message: 'Loi may chu noi bo' });
  }
};

const createUser = async (req, res) => {
  try {
    const { username, password, fullName, email, role, studentId, walletAddress } = req.body;

    if (!username || !password || !fullName || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Vui long nhap day du username, password, fullName, email va role',
      });
    }

    const existed = await User.findOne({ $or: [{ username }, { email }] });
    if (existed) {
      return res.status(409).json({ success: false, message: 'Username hoac email da ton tai' });
    }

    const user = await User.create({
      username,
      password,
      fullName,
      email,
      role,
      studentId: studentId || undefined,
      walletAddress: walletAddress || undefined,
      status: 'ACTIVE',
    });

    const data = user.toObject();
    delete data.password;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Create User Error:', error);
    res.status(500).json({ success: false, message: 'Loi may chu noi bo' });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'LOCKED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Trang thai khong hop le' });
    }

    if (req.params.id === req.user._id.toString() && status === 'LOCKED') {
      return res.status(400).json({ success: false, message: 'Khong the khoa chinh tai khoan dang dang nhap' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).select(publicUserFields);

    if (!user) return res.status(404).json({ success: false, message: 'Khong tim thay user' });
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Update User Status Error:', error);
    res.status(500).json({ success: false, message: 'Loi may chu noi bo' });
  }
};

module.exports = {
  listUsers,
  createUser,
  updateUserStatus,
};
