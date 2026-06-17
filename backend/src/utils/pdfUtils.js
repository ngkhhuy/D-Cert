const { PDFDocument, rgb, degrees } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const DEGREE_LABELS = {
    BACHELOR: 'Cử nhân',
    ENGINEER: 'Kỹ sư',
    ARCHITECT: 'Kiến trúc sư',
    MASTER: 'Thạc sĩ',
    DOCTOR: 'Tiến sĩ',
};

// Giữ export cũ để không phá code đang import TEMPLATE_MAP ở nơi khác.
const TEMPLATE_MAP = {
    BACHELOR: 'generated-layout',
    ENGINEER: 'generated-layout',
    ARCHITECT: 'generated-layout',
    MASTER: 'generated-layout',
    DOCTOR: 'generated-layout',
};

const COLORS = {
    ink: rgb(0.10, 0.13, 0.20),
    muted: rgb(0.55, 0.58, 0.66),
    faint: rgb(0.82, 0.84, 0.88),
    blue: rgb(0.00, 0.23, 0.45),
    blueSoft: rgb(0.88, 0.91, 0.97),
    gold: rgb(0.55, 0.27, 0.02),
    goldSoft: rgb(0.94, 0.87, 0.73),
    paper: rgb(1, 1, 1),
};

const PAGE = {
    width: 595.28,
    height: 841.89,
};

const safeText = (value, fallback = '') => {
    if (value === undefined || value === null) return fallback;
    const text = String(value).trim();
    return text || fallback;
};

const fitFontSize = (font, text, maxWidth, initialSize, minSize = 7) => {
    let size = initialSize;
    while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
        size -= 0.5;
    }
    return size;
};

const drawCentered = (page, text, x, y, font, size, color = COLORS.ink, maxWidth = 420) => {
    const value = safeText(text);
    const fittedSize = fitFontSize(font, value, maxWidth, size);
    const textWidth = font.widthOfTextAtSize(value, fittedSize);
    page.drawText(value, {
        x: x - textWidth / 2,
        y,
        size: fittedSize,
        font,
        color,
    });
};

const drawField = (page, label, value, x, y, fonts, maxWidth = 170) => {
    page.drawText(label, {
        x,
        y,
        size: 8,
        font: fonts.regular,
        color: COLORS.muted,
    });

    const displayValue = safeText(value, '-');
    const valueSize = fitFontSize(fonts.bold, displayValue, maxWidth, 10, 7);
    page.drawText(displayValue, {
        x,
        y: y - 15,
        size: valueSize,
        font: fonts.bold,
        color: COLORS.ink,
    });
};

const drawSeal = (page, x, y, fonts) => {
    page.drawCircle({
        x,
        y,
        size: 38,
        color: COLORS.blueSoft,
        borderColor: rgb(0.72, 0.77, 0.88),
        borderWidth: 2,
    });

    drawCentered(page, 'D-CERT', x, y - 4, fonts.bold, 11, rgb(0.39, 0.50, 0.70), 80);
};

const drawWatermark = (page, fonts) => {
    page.drawText('DUT D-CERT', {
        x: 138,
        y: 335,
        size: 38,
        font: fonts.bold,
        color: rgb(0.94, 0.96, 0.99),
        rotate: degrees(35),
        opacity: 0.65,
    });
};

const loadFonts = async (pdfDoc) => {
    pdfDoc.registerFontkit(fontkit);

    const fontPath = path.join(__dirname, '../assets/fonts/Roboto-Regular.ttf');
    const fontBoldPath = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');
    const regularBytes = fs.readFileSync(fontPath);
    const boldBytes = fs.readFileSync(fontBoldPath);

    return {
        regular: await pdfDoc.embedFont(regularBytes),
        bold: await pdfDoc.embedFont(boldBytes),
    };
};

/**
 * Sinh file PDF văn bằng từ layout vẽ trực tiếp bằng pdf-lib.
 * Layout này bám theo bản xem trước phôi bằng ở frontend, không phụ thuộc file phôi PDF.
 *
 * @param {Object} docData    - Document object từ MongoDB (đã lean/toObject)
 * @param {string} outputPath - Đường dẫn lưu file PDF đầu ra
 * @param {string} verifyUrl  - URL xác thực nhúng vào QR code
 * @returns {Promise<void>}
 */
const generateCertificatePDF = async (docData, outputPath, verifyUrl) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([PAGE.width, PAGE.height]);
    const fonts = await loadFonts(pdfDoc);

    const metadata = docData.metadata || {};
    const degreeLabel = DEGREE_LABELS[docData.degreeLevel] || 'Kỹ sư';
    const holderName = safeText(docData.holderName, 'TÊN SINH VIÊN').toUpperCase();
    const holderId = safeText(docData.holderId, 'MSSV');
    const major = safeText(metadata.major || metadata.nganhHoc, 'Công nghệ Thông tin');
    const classification = safeText(
        metadata.degreeClassification || metadata.classification || metadata.xepLoai,
        'Giỏi',
    );
    const graduationYear = safeText(metadata.graduationYear || metadata.namTotNghiep, String(new Date().getFullYear()));
    const docId = safeText(docData.docId, 'BKDN-2026-0001');

    page.drawRectangle({
        x: 0,
        y: 0,
        width: PAGE.width,
        height: PAGE.height,
        color: COLORS.paper,
    });

    page.drawRectangle({
        x: 58,
        y: 58,
        width: PAGE.width - 116,
        height: PAGE.height - 116,
        borderColor: COLORS.goldSoft,
        borderWidth: 16,
    });

    page.drawRectangle({
        x: 82,
        y: 82,
        width: PAGE.width - 164,
        height: PAGE.height - 164,
        borderColor: rgb(0.96, 0.92, 0.84),
        borderWidth: 1,
    });

    drawWatermark(page, fonts);
    drawSeal(page, PAGE.width / 2, 692, fonts);

    drawCentered(
        page,
        'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
        PAGE.width / 2,
        622,
        fonts.bold,
        10,
        COLORS.gold,
        420,
    );
    drawCentered(
        page,
        'Độc lập - Tự do - Hạnh phúc',
        PAGE.width / 2,
        606,
        fonts.regular,
        8,
        COLORS.muted,
        280,
    );
    page.drawLine({
        start: { x: PAGE.width / 2 - 54, y: 595 },
        end: { x: PAGE.width / 2 + 54, y: 595 },
        thickness: 0.8,
        color: rgb(0.76, 0.53, 0.28),
    });

    drawCentered(
        page,
        `BẰNG ${degreeLabel.toUpperCase()}`,
        PAGE.width / 2,
        552,
        fonts.bold,
        18,
        COLORS.blue,
        420,
    );

    drawCentered(page, 'Chứng nhận sinh viên:', PAGE.width / 2, 515, fonts.regular, 9, COLORS.muted, 260);
    drawCentered(page, holderName, PAGE.width / 2, 488, fonts.bold, 20, COLORS.ink, 390);

    drawField(page, 'Mã sinh viên:', holderId, 132, 430, fonts);
    drawField(page, 'Ngành học:', major, 332, 430, fonts);
    drawField(page, 'Xếp loại:', classification, 132, 370, fonts);
    drawField(page, 'Năm tốt nghiệp:', graduationYear, 332, 370, fonts);

    page.drawText(`Số hiệu: ${docId}`, {
        x: 132,
        y: 214,
        size: 9,
        font: fonts.bold,
        color: COLORS.muted,
    });

    drawCentered(page, 'Trưởng khoa', 170, 172, fonts.regular, 8, COLORS.muted, 120);
    drawCentered(page, 'Ký tên', 170, 128, fonts.bold, 8, COLORS.muted, 120);
    drawCentered(page, 'Hiệu trưởng', 425, 172, fonts.regular, 8, COLORS.muted, 120);
    drawCentered(page, 'Ký tên', 425, 128, fonts.bold, 8, COLORS.muted, 120);

    const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 240 });
    const qrImageBytes = Buffer.from(qrDataUrl.split(',')[1], 'base64');
    const qrImage = await pdfDoc.embedPng(qrImageBytes);

    page.drawText('Hiệu trưởng', {
        x: 396,
        y: 209,
        size: 7,
        font: fonts.regular,
        color: COLORS.muted,
    });
    page.drawRectangle({
        x: 390,
        y: 116,
        width: 74,
        height: 74,
        color: rgb(0.97, 0.98, 0.99),
        borderColor: COLORS.faint,
        borderWidth: 1,
    });
    page.drawImage(qrImage, {
        x: 399,
        y: 125,
        width: 56,
        height: 56,
    });

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
};

module.exports = { generateCertificatePDF, TEMPLATE_MAP };
