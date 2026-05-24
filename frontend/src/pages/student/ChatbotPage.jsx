import { useState, useRef, useEffect, useMemo } from 'react';
import api from '../../services/api';

const generateSessionId = () => `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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

    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    const bottomRef = useRef(null);
    const inputRef = useRef(null);
    const sessionIdRef = useRef(generateSessionId());

    // Load history on mount
    useEffect(() => {
        api.get('/ai/history?limit=50')
            .then((res) => setHistory(res.data.data || []))
            .catch(() => {})
            .finally(() => setHistoryLoading(false));
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Group sessions by date (newest day first)
    const groupedHistory = useMemo(() => {
        const groups = {};
        history.forEach((session) => {
            const day = new Date(session.startedAt).toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
            if (!groups[day]) groups[day] = [];
            groups[day].push(session);
        });
        return Object.entries(groups);
    }, [history]);

    const startNewChat = () => {
        setMessages([]);
        setError(null);
        sessionIdRef.current = generateSessionId();
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const loadHistorySession = (session) => {
        const msgs = session.messages.flatMap((m) => [
            {
                id: `h-u-${m._id}`,
                role: 'user',
                content: m.question,
                sources: [],
                fallback: false,
                usedLlm: false,
                createdAt: m.createdAt,
            },
            {
                id: `h-a-${m._id}`,
                role: 'assistant',
                content: m.answer,
                sources: m.sources ?? [],
                fallback: m.fallback ?? false,
                usedLlm: m.usedLlm ?? false,
                createdAt: m.createdAt,
            },
        ]);
        setMessages(msgs);
        setError(null);
    };

    const handleDeleteHistory = async () => {
        try {
            await api.delete('/ai/history');
            setHistory([]);
            setMessages([]);
            setDeleteConfirm(false);
        } catch {
            setDeleteConfirm(false);
        }
    };

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
            const res = await api.post('/ai/chat', { question: text, sessionId: sessionIdRef.current });
            const { answer, sources, fallback, usedLlm } = res.data.data;
            const botMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: answer,
                sources: sources ?? [],
                fallback: fallback ?? false,
                usedLlm: usedLlm ?? false,
                createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, botMsg]);
            // Update session in sidebar history cache
            const newMsg = {
                _id: `new-${Date.now()}`,
                question: text,
                answer,
                sources: sources ?? [],
                fallback: fallback ?? false,
                usedLlm: usedLlm ?? false,
                createdAt: new Date().toISOString(),
            };
            setHistory((prev) => {
                const idx = prev.findIndex((s) => s.sessionId === sessionIdRef.current);
                if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = { ...updated[idx], messages: [...updated[idx].messages, newMsg] };
                    return updated;
                }
                return [{ sessionId: sessionIdRef.current, startedAt: new Date().toISOString(), messages: [newMsg] }, ...prev];
            });
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
        <div className="flex gap-4" style={{ height: 'calc(100vh - 140px)', minHeight: '560px' }}>

            {/* ── History Sidebar ── */}
            {sidebarOpen && (
                <aside className="w-64 shrink-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Sidebar header */}
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#003b73] text-[18px]">history</span>
                            <span
                                className="text-sm font-bold text-[#003b73]"
                                style={{ fontFamily: 'Manrope, sans-serif' }}
                            >
                                Lịch sử
                            </span>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            title="Ẩn lịch sử"
                        >
                            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                        </button>
                    </div>

                    {/* New chat button */}
                    <div className="px-3 py-2 border-b border-slate-50">
                        <button
                            onClick={startNewChat}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[#003b73] border border-[#003b73]/20 hover:bg-[#003b73]/5 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Cuộc trò chuyện mới
                        </button>
                    </div>

                    {/* History list */}
                    <div className="flex-1 overflow-y-auto py-1">
                        {historyLoading ? (
                            <div className="space-y-2 px-3 pt-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-9 bg-slate-100 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : groupedHistory.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center mt-10 px-4">
                                Chưa có lịch sử trò chuyện.
                            </p>
                        ) : (
                            groupedHistory.map(([day, items]) => (
                                <div key={day} className="mb-1">
                                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase text-slate-400 tracking-wide">
                                        {day}
                                    </p>
                                    {items.map((session) => {
                                        const preview = session.messages[0]?.question ?? '';
                                        return (
                                            <button
                                                key={session.sessionId}
                                                onClick={() => loadHistorySession(session)}
                                                title={preview}
                                                className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 hover:text-[#003b73] transition-colors"
                                            >
                                                <span className="flex items-center justify-between gap-1">
                                                    <span className="block truncate flex-1">
                                                        {preview.length > 42 ? preview.slice(0, 42) + '…' : preview}
                                                    </span>
                                                    {session.messages.length > 1 && (
                                                        <span className="shrink-0 text-[10px] bg-slate-100 text-slate-400 rounded-full px-1.5 py-0.5">
                                                            {session.messages.length}
                                                        </span>
                                                    )}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Delete all */}
                    {history.length > 0 && (
                        <div className="px-3 py-3 border-t border-slate-100">
                            {deleteConfirm ? (
                                <div className="space-y-1.5">
                                    <p className="text-[11px] text-red-600 text-center font-medium">Xóa toàn bộ lịch sử?</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleDeleteHistory}
                                            className="flex-1 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
                                        >
                                            Xóa
                                        </button>
                                        <button
                                            onClick={() => setDeleteConfirm(false)}
                                            className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition-colors"
                                        >
                                            Hủy
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setDeleteConfirm(true)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[14px]">delete</span>
                                    Xóa toàn bộ lịch sử
                                </button>
                            )}
                        </div>
                    )}
                </aside>
            )}

            {/* ── Main Chat Panel ── */}
            <div className="flex-1 min-w-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Chat header */}
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                    {!sidebarOpen && (
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                            title="Xem lịch sử"
                        >
                            <span className="material-symbols-outlined text-[18px]">history</span>
                        </button>
                    )}
                    <div className="flex-1 min-w-0">
                        <h1
                            className="text-base font-extrabold text-[#003b73] tracking-tight leading-tight"
                            style={{ fontFamily: 'Manrope, sans-serif' }}
                        >
                            Trợ lý học vụ
                        </h1>
                        <p className="text-xs text-slate-400">
                            Hỏi đáp quy chế, thông báo và văn bản học vụ đã được công khai.
                        </p>
                    </div>
                    <button
                        onClick={startNewChat}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#003b73] border border-[#003b73]/20 hover:bg-[#003b73]/5 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        Mới
                    </button>
                </div>

                {/* Message list */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                    {messages.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-10">
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[#003b73] text-3xl">smart_toy</span>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-700 text-sm">Xin chào! Tôi là trợ lý học vụ D-Cert.</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                                    Bạn có thể hỏi về quy chế học vụ, điều kiện xét tốt nghiệp, thông báo nhận bằng hoặc các văn bản đã được nhà trường công khai.
                                </p>
                            </div>
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
        </div>
    );
}
