const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  docId: { type: String, required: true, unique: true },
  docType: { type: String, enum: ['DIPLOMA', 'DECISION', 'TRANSCRIPT'], required: true },
  holderName: { type: String, required: true },
  holderId: { type: String },
  
  // Lưu trữ dữ liệu linh hoạt (điểm số, môn học...)
  metadata: { type: mongoose.Schema.Types.Mixed }, 
  
  // Các mã Hash quan trọng để đối chiếu Blockchain
  // Không required vì lúc tạo DRAFT chưa có các giá trị này
  docHash: { type: String, unique: true, sparse: true }, 
  ipfsHash: { type: String }, 
  txHash: { type: String }, 
  
  issuer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['DRAFT', 'ACTIVE', 'REVOKED'], default: 'DRAFT' }
}, { timestamps: true });

module.exports = mongoose.model('Document', DocumentSchema);