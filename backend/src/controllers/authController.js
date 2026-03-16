const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '1d',
    });
};

/**
 * @route   POST /api/auth/login
 * @desc    Đăng nhập hệ thống & Lấy token
 * @access  Public
 */
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Kiểm tra dữ liệu đầu vào
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Vui lòng cung cấp username và password' });
        }

        // 2. Tìm user trong DB
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác' });
        }

        // 3. Kiểm tra trạng thái tài khoản
        if (user.status === 'LOCKED') {
            return res.status(403).json({ success: false, message: 'Tài khoản này đã bị khóa hệ thống' });
        }

        // 4. So sánh mật khẩu (Gọi hàm matchPassword đã viết trong Mongoose Schema)
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Tài khoản hoặc mật khẩu không chính xác' });
        }

        // 5. Đăng nhập thành công -> Trả về Token và thông tin user (loại bỏ password)
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(200).json({
            success: true,
            token: generateToken(user._id),
            user: userResponse
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ' });
    }
};

module.exports = { login };