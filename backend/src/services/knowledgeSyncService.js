const fs = require('fs');
const path = require('path');
const KnowledgeDocument = require('../models/KnowledgeDocument');
const aiService = require('./aiService');

const KNOWLEDGE_SYNC_STATUS = {
    INDEXED: 'INDEXED',
    FAILED: 'FAILED',
    SKIPPED: 'SKIPPED',
    EXISTS: 'EXISTS',
};

const dateOrNull = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const saveSyncResult = async (doc, status, fields = {}) => {
    const knowledgeSync = doc.metadata?.knowledgeSync;
    if (!knowledgeSync) return;

    doc.metadata = {
        ...(doc.metadata || {}),
        knowledgeSync: {
            ...knowledgeSync,
            status,
            attemptedAt: new Date(),
            ...fields,
        },
    };
    await doc.save();
};

const createKnowledgeDocument = async (doc, issuedPdfPath, publishedBy) => {
    const sync = doc.metadata.knowledgeSync;
    const stats = fs.statSync(issuedPdfPath);

    return KnowledgeDocument.create({
        title: sync.title,
        type: sync.type,
        fileUrl: `/uploads/${doc.docId}.pdf`,
        filePath: path.resolve(issuedPdfPath),
        originalFileName: `${doc.docId}.pdf`,
        mimeType: 'application/pdf',
        fileSize: stats.size,
        sourceUnit: sync.sourceUnit || 'Phòng Đào tạo',
        issuedDate: dateOrNull(sync.issuedDate),
        effectiveFrom: dateOrNull(sync.effectiveFrom),
        effectiveTo: dateOrNull(sync.effectiveTo),
        status: 'PUBLISHED',
        aiIndexStatus: 'INDEXING',
        uploadedBy: doc.issuer,
        publishedBy,
        publishedAt: new Date(),
        origin: 'ISSUED_DOCUMENT',
        sourceDocument: doc._id,
    });
};

const syncIssuedDocumentToKnowledge = async (doc, issuedPdfPath, publishedBy) => {
    const sync = doc.metadata?.knowledgeSync;
    if (!sync?.sendToKnowledge) {
        return { attempted: false, status: KNOWLEDGE_SYNC_STATUS.SKIPPED };
    }

    try {
        if (!issuedPdfPath || !fs.existsSync(issuedPdfPath)) {
            throw new Error('Không tìm thấy PDF đã phát hành để đưa vào Kho văn bản AI');
        }

        const existing = await KnowledgeDocument.findOne({ sourceDocument: doc._id });
        if (existing) {
            await saveSyncResult(doc, KNOWLEDGE_SYNC_STATUS.EXISTS, {
                knowledgeDocument: existing._id,
                error: null,
            });
            return {
                attempted: true,
                status: KNOWLEDGE_SYNC_STATUS.EXISTS,
                knowledgeDocumentId: existing._id,
            };
        }

        const knowledge = await createKnowledgeDocument(doc, issuedPdfPath, publishedBy);

        try {
            await aiService.ingestKnowledgeDocument(knowledge);
            knowledge.aiIndexStatus = 'INDEXED';
            knowledge.indexedAt = new Date();
            knowledge.indexError = null;
            await knowledge.save();
            await saveSyncResult(doc, KNOWLEDGE_SYNC_STATUS.INDEXED, {
                knowledgeDocument: knowledge._id,
                error: null,
            });

            return {
                attempted: true,
                success: true,
                status: KNOWLEDGE_SYNC_STATUS.INDEXED,
                knowledgeDocumentId: knowledge._id,
            };
        } catch (error) {
            knowledge.aiIndexStatus = 'FAILED';
            knowledge.indexError = error.message || 'AI index thất bại';
            await knowledge.save();
            await saveSyncResult(doc, KNOWLEDGE_SYNC_STATUS.FAILED, {
                knowledgeDocument: knowledge._id,
                error: knowledge.indexError,
            });

            return {
                attempted: true,
                success: false,
                status: KNOWLEDGE_SYNC_STATUS.FAILED,
                knowledgeDocumentId: knowledge._id,
                message: knowledge.indexError,
            };
        }
    } catch (error) {
        const message = error.message || 'Không thể đồng bộ tài liệu đã phát hành sang Kho văn bản AI';
        await saveSyncResult(doc, KNOWLEDGE_SYNC_STATUS.FAILED, { error: message });
        return {
            attempted: true,
            success: false,
            status: KNOWLEDGE_SYNC_STATUS.FAILED,
            message,
        };
    }
};

module.exports = { syncIssuedDocumentToKnowledge };
