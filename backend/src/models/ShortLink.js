const mongoose = require('mongoose');

const ShortLinkSchema = new mongoose.Schema({
  shortCode: { type: String, required: true, unique: true }, // VD: A7k9Xm
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  // Lưu thêm docHash để tra cứu nhanh không cần populate
  docHash: { type: String, required: true },
  clicks: { type: Number, default: 0 },
  lastAccessed: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('ShortLink', ShortLinkSchema);