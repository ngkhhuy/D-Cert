import { useState, useEffect } from 'react';
import api from '../../services/api';

// ── helpers ──────────────────────────────────────────────────────────────────
function timeAgoVi(dateStr) {
    if (!dateStr) return 'Không rõ';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
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

// ── Document Card ─────────────────────────────────────────────────────────────
function DocCard({ doc }) {
    const icon = DOC_ICON[doc.docType] || 'description';
    const txShort = shortTxHash(doc.txHash);
    const unit = doc.metadata?.knowledgeSync?.sourceUnit || doc.metadata?.unit || doc.issuer?.fullName || 'Trường ĐHBK Đà Nẵng';
    const title = doc.metadata?.knowledgeSync?.title || doc.metadata?.title || doc.holderName || doc.docId;
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
                        <a
                            href={`https://sepolia.etherscan.io/tx/${doc.txHash.startsWith('0x') ? doc.txHash : '0x' + doc.txHash}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-[#d5e3ff] text-[#004788] px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider hover:bg-[#b8d0ff] transition-colors"
                        >
                            <span
                                className="material-symbols-outlined text-sm"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                verified
                            </span>
                            Xác thực chuỗi khối (TxHash: {txShort})
                            <span className="material-symbols-outlined text-xs">open_in_new</span>
                        </a>
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
        <div>
            {/* ── Document feed ── */}
            <div className="space-y-6">
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

        </div>
    );
}
