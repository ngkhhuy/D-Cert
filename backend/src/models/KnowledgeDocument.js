const mongoose = require('mongoose');

const DOCUMENT_TYPES = [
    'REGULATION',
    'DECISION',
    'ANNOUNCEMENT',
    'GUIDELINE',
    'FAQ',
    'OTHER',
];

const DOCUMENT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const AI_INDEX_STATUSES = ['NOT_INDEXED', 'INDEXING', 'INDEXED', 'FAILED'];

const knowledgeDocumentSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        type: { type: String, enum: DOCUMENT_TYPES, required: true },

        fileUrl: { type: String, required: true },
        filePath: { type: String, required: true },
        originalFileName: { type: String },
        mimeType: { type: String },
        fileSize: { type: Number },

        sourceUnit: { type: String, default: 'Phòng Đào tạo' },
        issuedDate: { type: Date },
        effectiveFrom: { type: Date },
        effectiveTo: { type: Date },

        status: { type: String, enum: DOCUMENT_STATUSES, default: 'DRAFT' },
        aiIndexStatus: { type: String, enum: AI_INDEX_STATUSES, default: 'NOT_INDEXED' },
        indexedAt: { type: Date },
        indexError: { type: String },

        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        publishedAt: { type: Date },
        archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        archivedAt: { type: Date },
    },
    { timestamps: true }
);

knowledgeDocumentSchema.index({ title: 'text' });
knowledgeDocumentSchema.index({ status: 1, type: 1, aiIndexStatus: 1, createdAt: -1 });

module.exports = mongoose.model('KnowledgeDocument', knowledgeDocumentSchema);
module.exports.DOCUMENT_TYPES = DOCUMENT_TYPES;
module.exports.DOCUMENT_STATUSES = DOCUMENT_STATUSES;
module.exports.AI_INDEX_STATUSES = AI_INDEX_STATUSES;
