import { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const DEGREE_LABELS = {
    BACHELOR: 'Cử nhân',
    ENGINEER: 'Kỹ sư',
    ARCHITECT: 'Kiến trúc sư',
    MASTER: 'Thạc sĩ',
    DOCTOR: 'Tiến sĩ',
};

function shortTxHash(hash) {
    if (!hash) return null;
    const h = hash.startsWith('0x') ? hash : '0x' + hash;
    return `${h.slice(0, 6)}...${h.slice(-4)}`;
}

function DiplomaCard({ doc, onDownload, downloading }) {
    const degreeLabel = DEGREE_LABELS[doc.degreeLevel] || doc.degreeLevel;
    const txShort = shortTxHash(doc.txHash);
    const isDownloading = downloading === doc._id;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
            {/* Top accent bar */}
            <div className="h-1.5 bg-[#003b73]" />

            <div className="p-6">
                <div className="flex items-start gap-5">
                    {/* Icon */}
                    <div className="w-14 h-14 bg-[#d5e3ff] rounded-xl flex items-center justify-center shrink-0">
                        <span
                            className="material-symbols-outlined text-[30px] text-[#003b73]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            history_edu
                        </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-[#424751] font-semibold uppercase tracking-widest mb-1">
                            Văn bằng tốt nghiệp
                        </p>
                        <h3
                            className="text-xl font-extrabold text-[#003b73] leading-tight truncate"
                            style={{ fontFamily: 'Manrope, sans-serif' }}
                        >
                            {degreeLabel}
                        </h3>
                        <p className="text-base font-semibold text-[#191c1e] mt-1">
                            {doc.holderName}
                        </p>
                    </div>
                </div>

                {/* Details grid */}
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div>
                        <p className="text-[#424751] text-xs mb-0.5">Mã số SV</p>
                        <p className="font-bold font-mono text-[#191c1e]">{doc.holderId || '—'}</p>
                    </div>
                    <div>
                        <p className="text-[#424751] text-xs mb-0.5">Mã văn bằng</p>
                        <p className="font-bold font-mono text-[#003b73]">{doc.docId}</p>
                    </div>
                    {doc.metadata?.major && (
                        <div>
                            <p className="text-[#424751] text-xs mb-0.5">Ngành</p>
                            <p className="font-semibold text-[#191c1e]">{doc.metadata.major}</p>
                        </div>
                    )}
                    {doc.metadata?.graduationYear && (
                        <div>
                            <p className="text-[#424751] text-xs mb-0.5">Năm tốt nghiệp</p>
                            <p className="font-semibold text-[#191c1e]">{doc.metadata.graduationYear}</p>
                        </div>
                    )}
                </div>

                {/* Blockchain badge */}
                {txShort && (
                    <div className="mt-4 bg-[#d5e3ff] text-[#004788] px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 uppercase tracking-wider w-fit">
                        <span
                            className="material-symbols-outlined text-sm"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                            verified
                        </span>
                        Đã xác thực chuỗi khối · {txShort}
                    </div>
                )}

                {/* Received badge */}
                {doc.receivedAt && (
                    <div className="mt-2 text-xs text-green-700 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Đã nhận ngày{' '}
                        {new Date(doc.receivedAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                        })}
                    </div>
                )}

                {/* Actions */}
                <div className="mt-5 flex gap-3">
                    <button
                        onClick={() => onDownload(doc)}
                        disabled={isDownloading}
                        className="flex-1 flex items-center justify-center gap-2 bg-[#003b73] hover:bg-[#002855] disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                        {isDownloading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Đang tải...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]">download</span>
                                Tải xuống PDF
                            </>
                        )}
                    </button>
                    <a
                        href={`/uploads/${doc.docId}.pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 border border-[#003b73] text-[#003b73] hover:bg-[#003b73]/5 font-bold py-3 px-4 rounded-xl text-sm transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                        Xem
                    </a>
                </div>
            </div>
        </div>
    );
}

export default function StudentDiplomasPage() {
    const [diplomas, setDiplomas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(null);

    useEffect(() => {
        api.get('/student/diplomas')
            .then((res) => setDiplomas(res.data?.data || []))
            .catch(() => toast.error('Không thể tải danh sách văn bằng'))
            .finally(() => setLoading(false));
    }, []);

    const handleDownload = async (doc) => {
        setDownloading(doc._id);
        try {
            const res = await api.post(`/student/docs/${doc._id}/receive`);
            const pdfUrl = res.data?.pdfUrl;
            if (!pdfUrl) throw new Error();

            // Update receivedAt locally if first time
            setDiplomas((prev) =>
                prev.map((d) =>
                    d._id === doc._id && !d.receivedAt
                        ? { ...d, receivedAt: res.data.receivedAt }
                        : d
                )
            );

            // Trigger browser download
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `${doc.docId}.pdf`;
            link.click();

            toast.success('Tải xuống thành công!');
        } catch {
            toast.error('Không thể tải file. Vui lòng thử lại.');
        } finally {
            setDownloading(null);
        }
    };

    return (
        <div className="max-w-4xl">
            {/* Header */}
            <div className="mb-8">
                <h1
                    className="text-3xl font-extrabold text-[#003b73] tracking-tight"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                    Văn bằng của tôi
                </h1>
                <p className="text-[#424751] mt-1 text-sm">
                    Danh sách các văn bằng tốt nghiệp đã được ký số và xác thực chuỗi khối.
                </p>
            </div>

            {loading ? (
                <div className="grid sm:grid-cols-2 gap-6">
                    {[1, 2].map((i) => (
                        <div
                            key={i}
                            className="bg-white rounded-2xl shadow-sm h-64 animate-pulse"
                        />
                    ))}
                </div>
            ) : diplomas.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-slate-100">
                    <span className="material-symbols-outlined text-[64px] text-slate-200 block mb-4">
                        school
                    </span>
                    <h3
                        className="text-lg font-bold text-slate-400 mb-2"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                        Chưa có văn bằng nào
                    </h3>
                    <p className="text-sm text-slate-400">
                        Văn bằng sẽ xuất hiện tại đây sau khi được Hiệu trưởng ký duyệt và phát hành.
                    </p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-6">
                    {diplomas.map((doc) => (
                        <DiplomaCard
                            key={doc._id}
                            doc={doc}
                            onDownload={handleDownload}
                            downloading={downloading}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
