const { PDFDocument, rgb, degrees } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Ánh xạ degreeLevel → tên file phôi trong src/templates/
const TEMPLATE_MAP = {
    BACHELOR:  'phoibang_cunhan.pdf',
    ENGINEER:  'phoibang_kysu.pdf',
    ARCHITECT: 'phoibang_kientrucsu.pdf',
    MASTER:    'phoibang_thacsi.pdf',
    DOCTOR:    'phoibang_tiensi.pdf',
};

// Tọa độ (x, y) và style cho từng trường trên phôi A4 ngang (842 × 595 pt)
// Chỉnh lại sau khi có file phôi thật và đo tọa độ chính xác
const FIELD_CONFIG = {
    holderName:           { x: 421, y: 320, size: 22, bold: true },
    holderId:             { x: 421, y: 285, size: 14 },
    major:                { x: 421, y: 255, size: 14 },
    degreeClassification: { x: 421, y: 225, size: 14 },
    graduationYear:       { x: 421, y: 195, size: 14 },
    docId:                { x: 150, y: 100, size: 11 },
    qrCode:               { x: 690, y: 30,  width: 100, height: 100 },
};

/**
 * Sinh file PDF văn bằng từ phôi + dữ liệu bản nháp
 * @param {Object} docData    - Document object từ MongoDB (đã lean/toObject)
 * @param {string} outputPath - Đường dẫn lưu file PDF đầu ra
 * @param {string} verifyUrl  - URL xác thực nhúng vào QR code
 * @returns {Promise<void>}
 */
const generateCertificatePDF = async (docData, outputPath, verifyUrl) => {
    // 1. Chọn đúng file phôi theo degreeLevel
    const templateFileName = TEMPLATE_MAP[docData.degreeLevel];
    if (!templateFileName) {
        throw new Error(`Loại bằng "${docData.degreeLevel}" chưa có phôi tương ứng trong TEMPLATE_MAP`);
    }

    const templatePath = path.join(__dirname, `../templates/${templateFileName}`);
    if (!fs.existsSync(templatePath)) {
        throw new Error(`Thiếu file phôi: ${templateFileName}. Vui lòng đặt file vào src/templates/`);
    }

    // 2. Load phôi PDF
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    pdfDoc.registerFontkit(fontkit);

    // 3. Load font hỗ trợ tiếng Việt
    // Đặt file font vào src/assets/fonts/Roboto-Regular.ttf và Roboto-Bold.ttf
    const fontPath     = path.join(__dirname, '../assets/fonts/Roboto-Regular.ttf');
    const fontBoldPath = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');
    const fontBytes     = fs.readFileSync(fontPath);
    const fontBoldBytes = fs.readFileSync(fontBoldPath);
    const font     = await pdfDoc.embedFont(fontBytes);
    const fontBold = await pdfDoc.embedFont(fontBoldBytes);

    const page = pdfDoc.getPages()[0];

    // Helper vẽ text lên trang, căn giữa theo trục X
    const drawCentered = (text, config) => {
        const selectedFont = config.bold ? fontBold : font;
        const textWidth = selectedFont.widthOfTextAtSize(String(text), config.size);
        page.drawText(String(text), {
            x: config.x - textWidth / 2,
            y: config.y,
            size: config.size,
            font: selectedFont,
            color: rgb(0.1, 0.1, 0.1),
        });
    };

    // 4. Đổ dữ liệu vào phôi
    drawCentered(docData.holderName, FIELD_CONFIG.holderName);

    if (docData.holderId)
        drawCentered(docData.holderId, FIELD_CONFIG.holderId);

    if (docData.metadata?.major)
        drawCentered(docData.metadata.major, FIELD_CONFIG.major);

    if (docData.metadata?.degreeClassification)
        drawCentered(docData.metadata.degreeClassification, FIELD_CONFIG.degreeClassification);

    if (docData.metadata?.graduationYear)
        drawCentered(String(docData.metadata.graduationYear), FIELD_CONFIG.graduationYear);

    drawCentered(`Số hiệu: ${docData.docId}`, FIELD_CONFIG.docId);

    // 5. Sinh QR code và đóng vào góc phôi
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
    const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    const qrImage = await pdfDoc.embedPng(qrImageBytes);
    const cfg = FIELD_CONFIG.qrCode;
    page.drawImage(qrImage, { x: cfg.x, y: cfg.y, width: cfg.width, height: cfg.height });

    // 6. Ghi file ra ổ cứng
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
};

module.exports = { generateCertificatePDF, TEMPLATE_MAP };
