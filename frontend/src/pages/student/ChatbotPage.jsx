import { useState, useRef, useEffect } from 'react';
import api from '../../services/api';

const SUGGESTED_QUESTIONS = [
    'Điều kiện mở lớp học phần lý thuyết trong học kỳ hè là gì?',
    'Thời gian đăng ký học kỳ hè là khi nào?',
    'Học phí học kỳ hè được nộp khi nào?',
    'Học phần PBL có được tổ chức trong học kỳ hè không?',
];

const CHAT_ERROR_MESSAGE = 'Hiện tại chưa thể kết nối trợ lý học vụ. Vui lòng thử lại sau.';

function formatDate(dateStr) {
    if (!dateStr) return null;
    try {
        return new Date(dateStr).toLocaleDateString('vi-VN');
    } catch {
        return dateStr;
    }
}

function SourceCard({ source }) {
    return (
        <div className="mt-1 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
            <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-slate-700 leading-snug">{source.title}</span>
                <span className="shrink-0 text-slate-400">Trang {source.page}</span>
            </div>
            {source.source_unit && (
                <p className="text-slate-500">{source.source_unit}</p>
            )}
            {source.issued_date && (
                <p className="text-slate-400">Ban hành: {formatDate(source.issued_date)}</p>
            )}
            {source.excerpt && (
                <p className="text-slate-500 italic border-l-2 border-blue-200 pl-2 line-clamp-3">
                    {source.excerpt}
                </p>
            )}
        </div>
    );
}

function AssistantBubble({ msg }) {
    const [showSources, setShowSources] = useState(false);
    const sourceCount = msg.sources?.length ?? 0;

    return (
        <div className="flex gap-3 items-start">
            {/* Avatar */}
            <div className="shrink-0 w-8 h-8 rounded-full bg-[#003b73] flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[18px]">smart_toy</span>
            </div>

            <div className="flex-1 min-w-0 space-y-2">
                {/* Badge */}
                {!msg.fallback && (
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        msg.usedLlm
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                        <span className="material-symbols-outlined text-[12px]">
                            {msg.usedLlm ? 'auto_awesome' : 'search'}
                        </span>
                        {msg.usedLlm ? 'AI đã tổng hợp từ nguồn tài liệu' : 'Trả lời dựa trên đoạn tài liệu liên quan'}
                    </span>
                )}

                {/* Fallback warning */}
                {msg.fallback && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                        <span className="material-symbols-outlined text-[14px]">info</span>
                        Chưa tìm thấy thông tin trong kho văn bản hiện có.
                    </div>
                )}

                {/* Answer bubble */}
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap shadow-sm">
                    {msg.content}
                </div>

                {/* Sources */}
                {sourceCount > 0 && (
                    <div className="space-y-1.5">
                        <button
                            type="button"
                            onClick={() => setShowSources((value) => !value)}
                            aria-expanded={showSources}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                            <span className="material-symbols-outlined text-[15px]">
                                {showSources ? 'expand_less' : 'expand_more'}
                            </span>
                            Nguồn tham khảo ({sourceCount})
                        </button>
                        {showSources && (
                            <div className="space-y-1.5">
                                {msg.sources.map((src, i) => (
                                    <SourceCard key={i} source={src} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function UserBubble({ msg }) {
    return (
        <div className="flex gap-3 items-end justify-end">
            <div className="max-w-[75%] bg-[#003b73] text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-sm">
                {msg.content}
            </div>
        </div>
    );
}

function LoadingBubble() {
    return (
        <div className="flex gap-3 items-start">
            <div className="shrink-0 w-8 h-8 rounded-full bg-[#003b73] flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[18px]">smart_toy</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-400 italic shadow-sm">
                Đang tìm trong kho văn bản học vụ...
            </div>
        </div>
    );
}

export default function ChatbotPage() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const sendQuestion = async (question) => {
        const text = (question ?? input).trim();
        if (!text || loading) return;

        setError(null);
        setInput('');
        setMessages((prev) => [
            ...prev,
            {
                id: Date.now(),
                role: 'user',
                content: text,
                sources: [],
                fallback: false,
                usedLlm: false,
                createdAt: new Date().toISOString(),
            },
        ]);
        setLoading(true);

        try {
            const res = await api.post('/ai/chat', { question: text });
            const { answer, sources, fallback, usedLlm } = res.data.data;
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: answer,
                    sources: sources ?? [],
                    fallback: fallback ?? false,
                    usedLlm: usedLlm ?? false,
                    createdAt: new Date().toISOString(),
                },
            ]);
        } catch {
            setError(CHAT_ERROR_MESSAGE);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendQuestion();
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-4">
            {/* Header */}
            <div>
                <h1
                    className="text-2xl font-extrabold text-[#003b73] tracking-tight"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                    Trợ lý học vụ
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    Hỏi đáp quy chế, thông báo và văn bản học vụ đã được nhà trường công khai.
                </p>
            </div>

            {/* Chat box */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col" style={{ minHeight: '520px' }}>
                {/* Message list */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                    {messages.length === 0 && !loading && (
                        /* Empty state */
                        <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#003b73] text-3xl">smart_toy</span>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-700 text-sm">Xin chào! Tôi là trợ lý học vụ D-Cert.</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                    Bạn có thể hỏi về quy chế học vụ, điều kiện xét tốt nghiệp, thông báo nhận bằng hoặc các văn bản đã được nhà trường công khai.
                                </p>
                            </div>

                            {/* Suggested questions */}
                            <div className="flex flex-wrap gap-2 justify-center mt-1">
                                {SUGGESTED_QUESTIONS.map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => sendQuestion(q)}
                                        className="text-xs bg-slate-50 border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 rounded-full px-3 py-1.5 transition-colors"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg) =>
                        msg.role === 'user'
                            ? <UserBubble key={msg.id} msg={msg} />
                            : <AssistantBubble key={msg.id} msg={msg} />
                    )}

                    {loading && <LoadingBubble />}
                    {error && (
                        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            {error}
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100" />

                {/* Input area */}
                <div className="px-4 py-3 flex gap-3 items-end">
                    <textarea
                        ref={inputRef}
                        rows={1}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập câu hỏi của bạn..."
                        disabled={loading}
                        className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 disabled:opacity-50 transition"
                        style={{ maxHeight: '120px' }}
                    />
                    <button
                        onClick={() => sendQuestion()}
                        disabled={loading || !input.trim()}
                        className="shrink-0 w-10 h-10 rounded-xl bg-[#003b73] hover:bg-blue-800 disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center transition-colors"
                    >
                        <span className="material-symbols-outlined text-[20px]">send</span>
                    </button>
                </div>
            </div>

            {/* Suggested questions below chat (when messages exist) */}
            {messages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {SUGGESTED_QUESTIONS.map((q) => (
                        <button
                            key={q}
                            onClick={() => sendQuestion(q)}
                            disabled={loading}
                            className="text-xs bg-white border border-slate-200 text-slate-500 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 disabled:opacity-40 rounded-full px-3 py-1.5 transition-colors"
                        >
                            {q}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
