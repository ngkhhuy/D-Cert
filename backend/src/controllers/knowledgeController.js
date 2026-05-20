const fs = require('fs');
const mongoose = require('mongoose');
const KnowledgeDocument = require('../models/KnowledgeDocument');
const { DOCUMENT_TYPES, DOCUMENT_STATUSES, AI_INDEX_STATUSES } = require('../models/KnowledgeDocument');
const aiService = require('../services/aiService');

const jsonError = (res, status, message, data) => res.status(status).json({
    success: false,
    message,
    ...(data ? { data } : {}),
});

const parseOptionalDate = (value, fieldName) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`${fieldName} không phải là ngày hợp lệ`);
    }
    return date;
};

const removeUploadedFile = (file) => {
    if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
    }
};

const populateKnowledgeDocument = (query) => query
    .populate('uploadedBy', 'fullName username role')
    .populate('publishedBy', 'fullName username role')
    .populate('archivedBy', 'fullName username role');

const validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const validateEnumQuery = (value, allowedValues, fieldName) => {
    if (!value) return null;
    if (!allowedValues.includes(value)) {
        throw new Error(`${fieldName} không hợp lệ. Chỉ chấp nhận: ${allowedValues.join(', ')}`);
    }
    return value;
};

const runIngestAndPersistResult = async (doc) => {
    try {
        await aiService.ingestKnowledgeDocument(doc);
        doc.aiIndexStatus = 'INDEXED';
        doc.indexedAt = new Date();
        doc.indexError = null;
        await doc.save();
        return { indexed: true, doc };
    } catch (error) {
        doc.aiIndexStatus = 'FAILED';
        doc.indexError = error.message || 'AI index thất bại';
        await doc.save();
        return { indexed: false, doc, error };
    }
};

const uploadKnowledgeDocument = async (req, res) => {
    try {
        if (!req.file) {
            return jsonError(res, 400, 'Vui lòng tải lên file văn bản');
        }

        const { title, type, sourceUnit } = req.body;
        if (!title?.trim()) {
            removeUploadedFile(req.file);
            return jsonError(res, 400, 'Vui lòng nhập title');
        }
        if (!type || !DOCUMENT_TYPES.includes(type)) {
            removeUploadedFile(req.file);
            return jsonError(res, 400, `type không hợp lệ. Chỉ chấp nhận: ${DOCUMENT_TYPES.join(', ')}`);
        }

        let issuedDate;
        let effectiveFrom;
        let effectiveTo;
        try {
            issuedDate = parseOptionalDate(req.body.issuedDate, 'issuedDate');
            effectiveFrom = parseOptionalDate(req.body.effectiveFrom, 'effectiveFrom');
            effectiveTo = parseOptionalDate(req.body.effectiveTo, 'effectiveTo');
        } catch (error) {
            removeUploadedFile(req.file);
            return jsonError(res, 400, error.message);
        }

        const doc = await KnowledgeDocument.create({
            title: title.trim(),
            type,
            fileUrl: `/uploads/knowledge/${req.file.filename}`,
            filePath: req.file.path,
            originalFileName: req.file.originalname,
            mimeType: req.file.mimetype,
            fileSize: req.file.size,
            sourceUnit: sourceUnit?.trim() || 'Phòng Đào tạo',
            issuedDate,
            effectiveFrom,
            effectiveTo,
            uploadedBy: req.user._id,
        });

        return res.status(201).json({
            success: true,
            message: 'Upload văn bản thành công. Văn bản đang ở trạng thái DRAFT.',
            data: doc,
        });
    } catch (error) {
        removeUploadedFile(req.file);
        console.error('uploadKnowledgeDocument error:', error);
        return jsonError(res, 500, 'Lỗi máy chủ khi upload văn bản');
    }
};

const getKnowledgeDocuments = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
        const skip = (page - 1) * limit;

        const filter = {};
        try {
            const status = validateEnumQuery(req.query.status, DOCUMENT_STATUSES, 'status');
            const type = validateEnumQuery(req.query.type, DOCUMENT_TYPES, 'type');
            const aiIndexStatus = validateEnumQuery(req.query.aiIndexStatus, AI_INDEX_STATUSES, 'aiIndexStatus');
            if (status) filter.status = status;
            if (type) filter.type = type;
            if (aiIndexStatus) filter.aiIndexStatus = aiIndexStatus;
        } catch (error) {
            return jsonError(res, 400, error.message);
        }
        if (req.query.search?.trim()) {
            filter.title = { $regex: req.query.search.trim(), $options: 'i' };
        }

        const [items, total] = await Promise.all([
            populateKnowledgeDocument(KnowledgeDocument.find(filter))
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            KnowledgeDocument.countDocuments(filter),
        ]);

        return res.json({
            success: true,
            message: 'Lấy danh sách văn bản thành công',
            data: {
                items,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit) || 1,
                },
            },
        });
    } catch (error) {
        console.error('getKnowledgeDocuments error:', error);
        return jsonError(res, 500, 'Lỗi máy chủ khi lấy danh sách văn bản');
    }
};

const getKnowledgeDocumentById = async (req, res) => {
    try {
        if (!validateObjectId(req.params.id)) {
            return jsonError(res, 400, 'ID văn bản không hợp lệ');
        }
        const doc = await populateKnowledgeDocument(KnowledgeDocument.findById(req.params.id));
        if (!doc) return jsonError(res, 404, 'Không tìm thấy văn bản');

        return res.json({
            success: true,
            message: 'Lấy chi tiết văn bản thành công',
            data: doc,
        });
    } catch (error) {
        console.error('getKnowledgeDocumentById error:', error);
        return jsonError(res, 500, 'Lỗi máy chủ khi lấy chi tiết văn bản');
    }
};

const publishKnowledgeDocument = async (req, res) => {
    try {
        if (!validateObjectId(req.params.id)) {
            return jsonError(res, 400, 'ID văn bản không hợp lệ');
        }
        const doc = await KnowledgeDocument.findById(req.params.id);
        if (!doc) return jsonError(res, 404, 'Không tìm thấy văn bản');
        if (doc.status === 'ARCHIVED') {
            return jsonError(res, 400, 'Văn bản đã ARCHIVED, không thể publish');
        }

        doc.status = 'PUBLISHED';
        doc.publishedBy = req.user._id;
        doc.publishedAt = new Date();
        doc.aiIndexStatus = 'INDEXING';
        doc.indexError = null;
        await doc.save();

        const result = await runIngestAndPersistResult(doc);
        const populated = await populateKnowledgeDocument(KnowledgeDocument.findById(doc._id));

        return res.json({
            success: true,
            message: result.indexed
                ? 'Publish văn bản thành công và đã gửi index sang AI Service.'
                : 'Publish văn bản thành công nhưng AI index thất bại.',
            data: populated,
        });
    } catch (error) {
        console.error('publishKnowledgeDocument error:', error);
        return jsonError(res, 500, 'Lỗi máy chủ khi publish văn bản');
    }
};

const archiveKnowledgeDocument = async (req, res) => {
    try {
        if (!validateObjectId(req.params.id)) {
            return jsonError(res, 400, 'ID văn bản không hợp lệ');
        }
        const doc = await KnowledgeDocument.findById(req.params.id);
        if (!doc) return jsonError(res, 404, 'Không tìm thấy văn bản');

        doc.status = 'ARCHIVED';
        doc.archivedBy = req.user._id;
        doc.archivedAt = new Date();
        await doc.save();

        try {
            await aiService.archiveKnowledgeDocument(doc._id);
        } catch (aiError) {
            doc.indexError = aiError.message;
            await doc.save();
            const populated = await populateKnowledgeDocument(KnowledgeDocument.findById(doc._id));
            return res.json({
                success: true,
                message: 'Đã lưu trữ văn bản trong hệ thống, nhưng cập nhật AI index thất bại. Có thể cần rebuild index.',
                data: populated,
            });
        }

        const populated = await populateKnowledgeDocument(KnowledgeDocument.findById(doc._id));
        return res.json({
            success: true,
            message: 'Đã lưu trữ văn bản và cập nhật trạng thái trong AI index.',
            data: populated,
        });
    } catch (error) {
        console.error('archiveKnowledgeDocument error:', error);
        return jsonError(res, 500, 'Lỗi máy chủ khi archive văn bản');
    }
};

const reindexKnowledgeDocument = async (req, res) => {
    try {
        if (!validateObjectId(req.params.id)) {
            return jsonError(res, 400, 'ID văn bản không hợp lệ');
        }
        const doc = await KnowledgeDocument.findById(req.params.id);
        if (!doc) return jsonError(res, 404, 'Không tìm thấy văn bản');
        if (doc.status !== 'PUBLISHED') {
            return jsonError(res, 400, 'Chỉ văn bản PUBLISHED mới được reindex');
        }

        doc.aiIndexStatus = 'INDEXING';
        doc.indexError = null;
        await doc.save();

        const result = await runIngestAndPersistResult(doc);
        const populated = await populateKnowledgeDocument(KnowledgeDocument.findById(doc._id));

        return res.json({
            success: true,
            message: result.indexed
                ? 'Reindex văn bản thành công.'
                : 'Reindex văn bản thất bại.',
            data: populated,
        });
    } catch (error) {
        console.error('reindexKnowledgeDocument error:', error);
        return jsonError(res, 500, 'Lỗi máy chủ khi reindex văn bản');
    }
};

module.exports = {
    uploadKnowledgeDocument,
    getKnowledgeDocuments,
    getKnowledgeDocumentById,
    publishKnowledgeDocument,
    archiveKnowledgeDocument,
    reindexKnowledgeDocument,
};
