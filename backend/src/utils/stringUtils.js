const crypto = require('crypto');

/**
 * Hàm sinh chuỗi ngẫu nhiên gồm chữ hoa, chữ thường và số
 * Dùng crypto.randomBytes để đảm bảo an toàn, tránh predict shortCode
 * @param {number} length - Độ dài chuỗi (Mặc định 6)
 */
const generateShortCode = (length = 6) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto.randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[bytes[i] % chars.length];
    }
    return result;
};

module.exports = {
    generateShortCode
};