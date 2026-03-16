const crypto = require('crypto');
const fs = require('fs');


const hashText = (text) => {
    return crypto.createHash('sha256').update(text).digest('hex');
};

/**
 * Hàm băm một File (PDF, Ảnh) thành SHA-256
 * Dùng để băm file Bằng tốt nghiệp trước khi đẩy Hash lên Ethereum
 * @param {string} filePath - Đường dẫn tới file nằm trên server
 */
const hashFile = (filePath) => {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        // Đọc file theo dạng Stream (Từng phần nhỏ) để không bị tràn RAM nếu file quá lớn
        const stream = fs.createReadStream(filePath);

        stream.on('data', (data) => {
            hash.update(data);
        });

        stream.on('end', () => {
            // Trả về hex thuần, tầng BlockchainService tự thêm '0x' khi submit lên Ethereum
            resolve(hash.digest('hex'));
        });

        stream.on('error', (err) => {
            reject(err);
        });
    });
};

module.exports = {
    hashText,
    hashFile
};