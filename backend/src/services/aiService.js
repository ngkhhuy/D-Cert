const path = require('path');
const axios = require('axios');

const getAiServiceUrl = () => (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/$/, '');

const normalizeDate = (value) => {
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : value;
};

/**
 * Ask the FastAPI AI service to ingest a published knowledge document.
 * The AI service runs on the same local machine during development, so it
 * receives the absolute file path instead of a multipart file upload.
 */
const ingestKnowledgeDocument = async (doc) => {
    const filePath = path.resolve(doc.filePath);
    const body = {
        document_id: doc._id.toString(),
        title: doc.title,
        type: doc.type,
        file_path: filePath,
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

module.exports = { ingestKnowledgeDocument };
