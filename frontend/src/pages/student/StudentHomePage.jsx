import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

// ── helpers ──────────────────────────────────────────────────────────────────
function timeAgoVi(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d} ngày trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN');
}

function shortTxHash(hash) {
    if (!hash) return null;
    const h = hash.startsWith('0x') ? hash : '0x' + hash;
    return `${h.slice(0, 6)}...${h.slice(-4)}`;
}

const DOC_ICON = {
    DECISION:   'description',
    TRANSCRIPT: 'assignment',
    DIPLOMA:    'history_edu',
};

// ── AI Chat ──────────────────────────────────────────────────────────────────
const BOT_INTRO =
    'AI được huấn luyện dựa trên kho dữ liệu văn bản chính thức của DUT.';

function AiChat() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [thinking, setThinking] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, thinking]);

    const send = () => {
        const text = input.trim();
        if (!text) return;
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', text, time: new Date() }]);
        setThinking(true);

        // Simulated delay – replace with real RAG endpoint later
        setTimeout(() => {
            setThinking(false);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'bot',
                    text: 'Tính năng AI học vụ đang được phát triển. Vui lòng liên hệ Phòng CTSV để được hỗ trợ trực tiếp.',
                    time: new Date(),
                },
            ]);
        }, 1200);
    };

    const fmt = (d) =>
        d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="sticky top-24 bg-white rounded-xl overflow-hidden shadow-sm border-t-4 border-[#003b73] flex flex-col h-[calc(100vh-160px)]">
            {/* header */}
            <div className="p-5 border-b border-slate-100 bg-[#f7f9fb]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#d5e3ff] rounded-full flex items-center justify-center">
                        <span
                            className="material-symbols-outlined text-[#003b73]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            smart_toy
                        </span>
                    </div>
                    <div>
                        <h3
                            className="font-bold text-[#003b73] leading-tight text-sm"
                            style={{ fontFamily: 'Manrope, sans-serif' }}
                        >
                            Trợ lý AI Học vụ (RAG)
                        </h3>
                        <p className="text-[10px] text-[#424751] font-medium">
                            Hỗ trợ tra cứu quy chế 24/7
                        </p>
                    </div>
                </div>
            </div>

            {/* messages */}
            <div className="flex-1 p-5 overflow-y-auto space-y-5 text-sm bg-slate-50/40">
                <p className="text-xs text-center text-[#424751] italic px-4">{BOT_INTRO}</p>

                {messages.map((msg, i) =>
                    msg.role === 'user' ? (
                        <div key={i} className="flex flex-col items-end gap-1">
                            <div className="bg-[#003b73] text-white p-3 rounded-2xl rounded-tr-none max-w-[90%] text-sm leading-relaxed">
                                {msg.text}
                            </div>
                            <span className="text-[10px] text-[#424751]">{fmt(msg.time)}</span>
                        </div>
                    ) : (
                        <div key={i} className="flex flex-col items-start gap-1">
                            <div className="bg-[#e6e8ea] text-[#191c1e] p-3 rounded-2xl rounded-tl-none max-w-[90%] text-sm leading-relaxed border border-[#c2c6d3]">
                                {msg.text}
                            </div>
                            <div className="flex items-center gap-1.5 ml-1">
                                <span className="text-[10px] text-[#003b73] font-bold">D-Cert AI</span>
                                <span className="text-[10px] text-[#424751]">• {fmt(msg.time)}</span>
                            </div>
                        </div>
                    )
                )}

                {thinking && (
                    <div className="flex flex-col items-start gap-1">
                        <div className="bg-[#e6e8ea] text-[#424751] p-3 rounded-2xl rounded-tl-none flex items-center gap-2 text-sm border border-[#c2c6d3]">
                            <span className="flex gap-1">
                                {[0, 1, 2].map((i) => (
                                    <span
                                        key={i}
                                        className="w-1.5 h-1.5 bg-[#003b73] rounded-full animate-bounce"
                                        style={{ animationDelay: `${i * 150}ms` }}
                                    />
                                ))}
                            </span>
                            <span>Đang xử lý...</span>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* input */}
            <div className="p-4 border-t border-slate-100 bg-white">
                <div className="relative flex items-center">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && send()}
                        className="w-full bg-slate-100 border-none rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#003b73]/20 placeholder:text-slate-400"
                        placeholder="Hỏi về quy chế, văn bằng..."
                    />
                    <button
                        onClick={send}
                        className="absolute right-2 p-2 text-[#003b73] hover:bg-[#003b73]/10 rounded-lg transition-all"
                    >
                        <span className="material-symbols-outlined">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Document Card ─────────────────────────────────────────────────────────────
function DocCard({ doc }) {
    const icon = DOC_ICON[doc.docType] || 'description';
    const txShort = shortTxHash(doc.txHash);
    const unit = doc.metadata?.unit || doc.issuer?.fullName || 'Trường ĐHBK Đà Nẵng';
    const title = doc.metadata?.title || doc.holderName || doc.docId;
    const pdfUrl = `/uploads/${doc.docId}.pdf`;

    return (
        <div className="bg-white rounded-xl p-6 transition-all hover:translate-x-1 duration-200 border-l-4 border-[#003b73] shadow-sm flex gap-6">
            {/* icon */}
            <div className="w-12 h-12 bg-[#c8dbff] rounded-lg flex items-center justify-center shrink-0">
                <span
                    className="material-symbols-outlined text-[#003b73]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                >
                    {icon}
                </span>
            </div>

            {/* content */}
            <div className="flex-1 space-y-3 min-w-0">
                <div>
                    <h3
                        className="font-bold text-lg text-[#191c1e] leading-snug"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                        {title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-[#424751]">
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">calendar_today</span>
                            Ngày đăng: {timeAgoVi(doc.updatedAt || doc.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">account_balance</span>
                            Đơn vị: {unit}
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    {/* blockchain badge */}
                    {txShort && (
                        <div className="bg-[#d5e3ff] text-[#004788] px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider">
                            <span
                                className="material-symbols-outlined text-sm"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                verified
                            </span>
                            Xác thực chuỗi khối (TxHash: {txShort})
                        </div>
                    )}

                    {/* read PDF */}
                    <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-[#003b73] hover:bg-[#002855] text-white px-5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                        <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                        Đọc PDF
                    </a>
                </div>
            </div>
        </div>
    );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function StudentHomePage() {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/student/feed')
            .then((res) => setDocs(res.data?.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
            {/* ── Left: Document feed ── */}
            <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center justify-between">
                    <h2
                        className="text-2xl font-extrabold text-[#003b73] tracking-tight"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                        Văn bản &amp; Quyết định mới nhất
                    </h2>
                    <button className="text-sm font-semibold text-[#003b73] flex items-center gap-1 hover:underline">
                        Xem tất cả{' '}
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-white rounded-xl p-6 shadow-sm animate-pulse h-32" />
                        ))}
                    </div>
                ) : docs.length === 0 ? (
                    <div className="bg-white rounded-xl p-10 text-center shadow-sm">
                        <span className="material-symbols-outlined text-[48px] text-slate-300 block mb-3">
                            inbox
                        </span>
                        <p className="text-slate-400 text-sm">Chưa có văn bản nào được phát hành.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {docs.map((doc) => (
                            <DocCard key={doc._id} doc={doc} />
                        ))}
                    </div>
                )}
            </div>

            {/* ── Right: AI Chat ── */}
            <div className="lg:col-span-3">
                <AiChat />
            </div>
        </div>
    );
}
