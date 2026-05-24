const axios = require('axios');
const ChatMessage = require('../models/ChatMessage');

const MAX_QUESTION_LENGTH = 1000;

const getAiServiceUrl = () => (process.env.AI_SERVICE_URL || '').replace(/\/$/, '');

const chatWithAI = async (req, res) => {
    try {
        const { question, sessionId } = req.body;

        if (!question || !question.trim()) {
            return res.status(400).json({ success: false, message: 'Câu hỏi không được để trống.' });
        }
        if (question.trim().length > MAX_QUESTION_LENGTH) {
            return res.status(400).json({
                success: false,
                message: `Câu hỏi không được vượt quá ${MAX_QUESTION_LENGTH} ký tự.`,
            });
        }

        const aiUrl = getAiServiceUrl();
        if (!aiUrl) {
            return res.status(500).json({ success: false, message: 'AI Service chưa được cấu hình (AI_SERVICE_URL).' });
        }

        const body = {
            question: question.trim(),
            student_id: req.user?.studentId || null,
        };

        let aiData;
        try {
            const response = await axios.post(`${aiUrl}/chat`, body, {
                timeout: 120_000,
                headers: { 'Content-Type': 'application/json' },
            });
            aiData = response.data;
        } catch (error) {
            if (error.code === 'ECONNABORTED') {
                return res.status(500).json({ success: false, message: 'AI Service timeout sau 120 giây.' });
            }
            const message = error.response?.data?.detail
                || error.response?.data?.message
                || error.message
                || 'Không thể kết nối AI Service.';
            return res.status(500).json({ success: false, message });
        }

        const {
            answer,
            sources = [],
            fallback = false,
            used_llm: usedLlm = false,
            llm_error: llmError = null,
        } = aiData;

        await ChatMessage.create({
            user: req.user._id,
            studentId: req.user?.studentId || null,
            sessionId: sessionId || null,
            question: question.trim(),
            answer,
            sources,
            fallback,
            usedLlm,
            llmError,
        });

        return res.json({
            success: true,
            message: 'Chatbot trả lời thành công.',
            data: { answer, sources, fallback, usedLlm, llmError },
        });
    } catch (error) {
        console.error('chatWithAI error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi xử lý chat.' });
    }
};

const getChatHistory = async (req, res) => {
    try {
        const messages = await ChatMessage.find({ user: req.user._id })
            .sort({ createdAt: 1 })
            .limit(300)
            .select('question answer sources fallback usedLlm sessionId createdAt');

        // Group by sessionId; old messages without sessionId each become their own session
        const sessionMap = new Map();
        for (const msg of messages) {
            const key = msg.sessionId || msg._id.toString();
            if (!sessionMap.has(key)) {
                sessionMap.set(key, { sessionId: key, startedAt: msg.createdAt, messages: [] });
            }
            sessionMap.get(key).messages.push({
                _id: msg._id,
                question: msg.question,
                answer: msg.answer,
                sources: msg.sources,
                fallback: msg.fallback,
                usedLlm: msg.usedLlm,
                createdAt: msg.createdAt,
            });
        }

        const sessions = [...sessionMap.values()].sort(
            (a, b) => new Date(b.startedAt) - new Date(a.startedAt)
        );

        return res.json({ success: true, data: sessions });
    } catch (error) {
        console.error('getChatHistory error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

const deleteChatHistory = async (req, res) => {
    try {
        await ChatMessage.deleteMany({ user: req.user._id });
        return res.json({ success: true, message: 'Đã xóa toàn bộ lịch sử trò chuyện.' });
    } catch (error) {
        console.error('deleteChatHistory error:', error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
    }
};

module.exports = { chatWithAI, getChatHistory, deleteChatHistory };
