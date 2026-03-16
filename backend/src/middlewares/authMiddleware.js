const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return res.status(401).json({ success: false, message: 'Người dùng không tồn tại!' });
            }

            if (user.status === 'LOCKED') {
                return res.status(403).json({ success: false, message: 'Tài khoản của bạn đã bị khóa!' });
            }

            req.user = user;
            next();
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc đã hết hạn!' });
        }
    } else {
        return res.status(401).json({ success: false, message: 'Không tìm thấy Token xác thực!' });
    }
};

// 2. Middleware Phân quyền (Role-Based Access Control)
// Cách dùng: router.post('/issue', protect, authorize('SIGNER', 'SYS_ADMIN'), controller.issueDoc)
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Quyền truy cập bị từ chối. Cấp bậc [${req.user.role}] không được phép thực hiện hành động này!` 
            });
        }
        next();
    };
};

module.exports = { protect, authorize };