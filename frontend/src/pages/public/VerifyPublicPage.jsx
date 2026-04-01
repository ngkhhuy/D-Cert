import { useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const pub = axios.create({ baseURL: '/' });

const DEGREE_LABELS = {
    BACHELOR: 'Cử nhân', ENGINEER: 'Kỹ sư',
    ARCHITECT: 'Kiến trúc sư', MASTER: 'Thạc sĩ', DOCTOR: 'Tiến sĩ',
};

function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ResultCard({ result }) {
    const isValid = result?.success && result?.data?.status === 'ACTIVE';
    const d = result?.data;

    if (!isValid) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-5 flex items-start gap-4">
                <span className="material-symbols-outlined text-red-500 text-3xl shrink-0 mt-0.5"
                    style={{ fontVariationSettings: "'FILL' 1" }}>gpp_bad</span>
                <div>
                    <h3 className="font-bold text-red-700 text-lg mb-1">Trạng thái: KHÔNG HỢP LỆ</h3>
                    <p className="text-red-600 text-sm">{result?.message || 'Văn bằng không tồn tại hoặc đã bị chỉnh sửa'}</p>
                    {d?.computedHash && (
                        <div className="mt-3 p-3 rounded-lg bg-white/70 border border-red-100">
                            <p className="text-xs text-gray-500 mb-1 font-semibold">Hash tính được từ file:</p>
                            <p className="font-mono text-[11px] text-gray-600 break-all">{d.computedHash}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-xl overflow-hidden">
            <div className="bg-[#e7f5ed] border border-[#a6d8bc] p-6 flex items-start gap-4">
                <div className="mt-1 shrink-0">
                    <span className="material-symbols-outlined text-[#2d8a57] text-3xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                </div>
                <div className="space-y-4 flex-1 min-w-0">
                    <div>
                        <h3 className="text-lg font-extrabold text-[#1b5e3a]"
                            style={{ fontFamily: 'Manrope, sans-serif' }}>Trạng thái: HỢP LỆ</h3>
                        <div className="mt-2 space-y-1">
                            {[
                                ['Sinh viên', d.holderName],
                                ['MSSV', d.holderId],
                                d.metadata?.major      ? ['Ngành', d.metadata.major] : null,
                                d.degreeLevel          ? ['Bằng cấp', DEGREE_LABELS[d.degreeLevel] || d.degreeLevel] : null,
                                d.metadata?.classification ? ['Xếp loại', d.metadata.classification] : null,
                                ['Đơn vị cấp', 'Trường Đại học Bách Khoa – ĐHĐN'],
                                d.issuedAt             ? ['Ngày cấp', fmtDate(d.issuedAt)] : null,
                            ].filter(Boolean).map(([label, value]) => (
                                <p key={label} className="text-[#2d8a57] font-medium flex items-center gap-2 flex-wrap">
                                    <span className="text-sm uppercase tracking-wider opacity-70">{label}:</span>
                                    <span className="text-gray-800 font-bold">{value}</span>
                                </p>
                            ))}
                        </div>
                    </div>
                    {d.txHash && (
                        <div className="pt-2 flex items-center justify-between border-t border-[#a6d8bc]/50 flex-wrap gap-2">
                            <a href={`https://sepolia.etherscan.io/tx/${d.txHash}`}
                                target="_blank" rel="noreferrer"
                                className="flex items-center gap-1.5 text-[#1d5fa9] font-semibold text-sm hover:underline decoration-2 underline-offset-4 group">
                                <span className="material-symbols-outlined text-sm">database</span>
                                Xem biên lai Blockchain
                                <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </a>
                            <span className="text-[10px] text-slate-400 font-mono">
                                TX: {d.txHash.slice(0, 6)}...{d.txHash.slice(-4)}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function VerifyPublicPage() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef();

    const handleFile = (f) => {
        if (!f || f.type !== 'application/pdf') { toast.error('Chỉ chấp nhận file PDF'); return; }
        setFile(f); setResult(null);
    };

    const handleDrop = (e) => {
        e.preventDefault(); setDragging(false);
        handleFile(e.dataTransfer.files?.[0]);
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!file) { toast.error('Vui lòng chọn file PDF'); return; }
        setLoading(true); setResult(null);
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await pub.post('/api/verify/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            setResult(res.data);
        } catch (err) {
            setResult({ success: false, message: err.response?.data?.message || 'Không tìm thấy hoặc file đã bị chỉnh sửa', data: err.response?.data });
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f7f9fb', fontFamily: 'Inter, sans-serif' }}>
            {/* Top Nav */}
            <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-[#00529c] shadow-xl">
                <div className="text-xl font-extrabold text-white uppercase tracking-tight"
                    style={{ fontFamily: 'Manrope, sans-serif' }}>DUT D-CERT</div>
                <div className="hidden md:block flex-1 max-w-2xl px-12">
                    <p className="font-bold tracking-tight text-center text-white text-sm"
                        style={{ fontFamily: 'Manrope, sans-serif' }}>HỆ THỐNG XÁC THỰC VĂN BẰNG DUT D-CERT</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="material-symbols-outlined text-white p-2 hover:bg-white/10 transition-all rounded-full">language</button>
                    <button className="material-symbols-outlined text-white p-2 hover:bg-white/10 transition-all rounded-full">help_outline</button>
                </div>
            </nav>

            {/* Body */}
            <div className="flex pt-20 flex-1">
                {/* Sidebar */}
                <aside className="hidden lg:flex flex-col h-[calc(100vh-80px)] sticky top-20 w-64 bg-slate-50 shadow-2xl border-r border-slate-100 shrink-0">
                    <div className="p-6">
                        <h2 className="text-[#00529c] font-black text-2xl" style={{ fontFamily: 'Manrope, sans-serif' }}>DUT D-CERT</h2>
                        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mt-0.5">Academic Verification</p>
                    </div>
                    <nav className="flex-1 px-3 space-y-1">
                        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 text-[#00529c] font-bold text-sm rounded-r-full">
                            <span className="material-symbols-outlined text-[20px]">upload_file</span>
                            Tra cứu bằng File PDF
                        </div>
                    </nav>
                </aside>

                {/* Main */}
                <main className="flex-1 p-6 md:p-12 flex flex-col items-center justify-start">
                    <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl shadow-[#003b73]/5 overflow-hidden border-t-4 border-[#003b73]">
                        <form onSubmit={handleVerify}>
                            <div className="p-8 md:p-12 space-y-8">
                                {/* Header */}
                                <div className="text-center space-y-3">
                                    <h1 className="text-4xl font-extrabold tracking-tight text-[#003b73]"
                                        style={{ fontFamily: 'Manrope, sans-serif' }}>Xác thực văn bằng</h1>
                                    <p className="text-gray-500">Tải lên tệp tin PDF chứng chỉ của bạn để kiểm tra tính hợp lệ trên Blockchain.</p>
                                </div>

                                {/* Drop zone */}
                                <div
                                    className={`cursor-pointer border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center space-y-4 transition-colors ${
                                        dragging ? 'border-[#003b73] bg-blue-50' : 'border-gray-300 bg-[#f2f4f6] hover:border-[#00529c]'
                                    }`}
                                    onClick={() => inputRef.current?.click()}
                                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={handleDrop}
                                >
                                    <input ref={inputRef} type="file" accept=".pdf,application/pdf"
                                        className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                                    <div className="w-16 h-16 rounded-full bg-[#d5e3ff] flex items-center justify-center">
                                        <span className="material-symbols-outlined text-4xl text-[#003b73]"
                                            style={{ fontVariationSettings: file ? "'FILL' 1" : "'FILL' 0" }}>
                                            {file ? 'cloud_done' : 'upload_file'}
                                        </span>
                                    </div>
                                    {file ? (
                                        <div className="text-center">
                                            <p className="font-bold text-gray-800">{file.name}</p>
                                            <p className="text-sm text-gray-500">Kích thước: {(file.size / 1024 / 1024).toFixed(1)} MB</p>
                                        </div>
                                    ) : (
                                        <div className="text-center">
                                            <p className="font-semibold text-gray-700">Kéo thả file PDF vào đây</p>
                                            <p className="text-sm text-gray-400">hoặc nhấn để chọn file</p>
                                        </div>
                                    )}
                                </div>

                                {/* Button */}
                                <div className="flex justify-center">
                                    <button type="submit" disabled={loading || !file}
                                        className="w-full md:w-auto px-10 py-4 bg-[#003b73] text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#00529c] transition-all active:scale-95 shadow-lg shadow-[#003b73]/20 disabled:opacity-50"
                                        style={{ fontFamily: 'Manrope, sans-serif' }}>
                                        {loading
                                            ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Đang xác thực...</>
                                            : 'Xác thực ngay'}
                                    </button>
                                </div>

                                {/* Result */}
                                {result && <ResultCard result={result} />}
                            </div>
                            <div className="h-2 bg-gradient-to-r from-[#003b73] via-[#00529c] to-[#003b73]" />
                        </form>
                    </div>

                    {/* Info cards */}
                    <div className="mt-10 max-w-2xl w-full grid grid-cols-1 md:grid-cols-2 gap-5">
                        {[
                            { icon: 'verified_user', title: 'Tính bảo mật cao', desc: 'Sử dụng công nghệ Blockchain tiên tiến nhất để lưu trữ và bảo vệ dữ liệu.' },
                            { icon: 'bolt',          title: 'Xác thực tức thì',  desc: 'Tiết kiệm thời gian và quy trình hành chính rườm rà.' },
                        ].map(({ icon, title, desc }) => (
                            <div key={title} className="bg-[#f2f4f6] p-6 rounded-xl flex items-center gap-4">
                                <span className="material-symbols-outlined text-[#003b73] text-3xl shrink-0">{icon}</span>
                                <div>
                                    <h4 className="font-bold text-sm text-gray-800 mb-1">{title}</h4>
                                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>

            {/* Footer */}
            <footer className="bg-slate-50 border-t border-slate-200">
                <div className="w-full py-8 px-6 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto gap-4">
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
                        <div className="font-bold text-[#00529c] uppercase text-sm"
                            style={{ fontFamily: 'Manrope, sans-serif' }}>DUT D-CERT</div>
                        <p className="text-xs uppercase tracking-widest text-slate-500">
                            © 2026 Đại học Bách khoa – ĐHĐN (DUT). Tất cả quyền được bảo lưu.
                        </p>
                    </div>
                    <div className="flex items-center gap-6">
                        {['Quy định bảo mật', 'Hướng dẫn sử dụng', 'Liên hệ'].map((t) => (
                            <a key={t} href="#"
                                className="text-xs uppercase tracking-widest text-slate-500 hover:text-[#003b73] hover:underline decoration-2 underline-offset-4 transition-opacity">
                                {t}
                            </a>
                        ))}
                    </div>
                </div>
            </footer>

            <div className="fixed -bottom-20 -right-20 w-96 h-96 opacity-[0.03] pointer-events-none select-none">
                <span className="material-symbols-outlined text-[320px] text-[#003b73] -rotate-12 block">hub</span>
            </div>
        </div>
    );
}
