const path = require('path');
const axios = require('axios');

const getAiServiceUrl = () => (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');
const getPublicAppUrl = () => (
    process.env.PUBLIC_APP_URL
    || process.env.FRONTEND_URL
    || process.env.BASE_URL
    || ''
).replace(/\/$/, '');

const normalizeDate = (value) => {
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : value;
};

/**
 * Ask the FastAPI AI service to ingest a published knowledge document.
 * Prefer a public file URL so the AI service can run on another machine
 * such as RunPod. Keep file_path as a local fallback for development.
 */
const ingestKnowledgeDocument = async (doc) => {
    const filePath = path.resolve(doc.filePath);
    const publicAppUrl = getPublicAppUrl();
    const fileUrl = publicAppUrl && doc.fileUrl
        ? `${publicAppUrl}${doc.fileUrl.startsWith('/') ? '' : '/'}${doc.fileUrl}`
        : null;

    const body = {
        document_id: doc._id.toString(),
        title: doc.title,
        type: doc.type,
        file_path: filePath,
        file_url: fileUrl,
        source_unit: doc.sourceUnit,
        issued_date: normalizeDate(doc.issuedDate),
        effective_from: normalizeDate(doc.effectiveFrom),
        effective_to: normalizeDate(doc.effectiveTo),
    };

    try {
        const response = await axios.post(`${getAiServiceUrl()}/ingest`, body, {
            timeout: 60_000,
            headers: { 'Content-Type': 'application/json' },
        });
        return response.data;
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            throw new Error('AI Service timeout sau 60 giây');
        }
        const message = error.response?.data?.detail
            || error.response?.data?.message
            || error.response?.data?.error
            || error.message
            || 'AI Service ingest thất bại';
        throw new Error(message);
    }
};

const archiveKnowledgeDocument = async (documentId) => {
    const body = { document_id: documentId.toString() };

    try {
        const response = await axios.post(`${getAiServiceUrl()}/knowledge/archive`, body, {
            timeout: 60_000,
            headers: { 'Content-Type': 'application/json' },
        });
        return response.data;
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            throw new Error('AI Service timeout sau 60 giây');
        }
        const message = error.response?.data?.detail
            || error.response?.data?.message
            || error.response?.data?.error
            || error.message
            || 'AI Service archive thất bại';
        throw new Error(message);
    }
};

module.exports = { ingestKnowledgeDocument, archiveKnowledgeDocument };
