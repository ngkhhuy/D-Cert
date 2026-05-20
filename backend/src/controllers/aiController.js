const axios = require('axios');
const ChatMessage = require('../models/ChatMessage');

const MAX_QUESTION_LENGTH = 1000;

const getAiServiceUrl = () => (process.env.AI_SERVICE_URL || '').replace(/\/$/, '');

const chatWithAI = async (req, res) => {
    try {
        const { question } = req.body;

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

module.exports = { chatWithAI };
