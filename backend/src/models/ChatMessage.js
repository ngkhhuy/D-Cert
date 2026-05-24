const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        studentId: {
            type: String,
            default: null,
        },
        question: {
            type: String,
            required: true,
            trim: true,
        },
        answer: {
            type: String,
            required: true,
        },
        sources: {
            type: Array,
            default: [],
        },
        fallback: {
            type: Boolean,
            default: false,
        },
        usedLlm: {
            type: Boolean,
            default: false,
        },
        sessionId: {
            type: String,
            default: null,
        },
        llmError: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
