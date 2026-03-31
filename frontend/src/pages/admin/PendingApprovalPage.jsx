import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const DEGREE_LABELS = {
    BACHELOR: 'Cử nhân', ENGINEER: 'Kỹ sư',
    ARCHITECT: 'Kiến trúc sư', MASTER: 'Thạc sĩ', DOCTOR: 'Tiến sĩ',
};

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    return `${Math.floor(h / 24)} ngày trước`;
}

// ────────── Confirm Modal ──────────
function ConfirmModal({ doc, onConfirm, onCancel, loading }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="bg-[#003b73] px-6 py-4">
                    <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        Xác nhận Ký duyệt
                    </h3>
                </div>
                <div className="p-6">
                    <div className="flex items-start gap-3 mb-5">
                        <div className="p-2 bg-yellow-100 rounded-lg shrink-0">
                            <span className="material-symbols-outlined text-yellow-700 text-[22px]">warning</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            Bạn sắp <strong>ký duyệt</strong> và ghi hash văn bằng lên{' '}
                            <strong className="text-[#003b73]">Sepolia Blockchain</strong>. Thao tác này{' '}
                            <strong className="text-red-600">không thể hoàn tác</strong>.
                        </p>
                    </div>

                    <div className="bg-[#f7f9fb] rounded-xl p-4 space-y-2 text-sm mb-6">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Mã văn bản</span>
                            <span className="font-semibold text-gray-800 font-mono">{doc.docId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Sinh viên</span>
                            <span className="font-semibold text-gray-800">{doc.holderName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Bậc đào tạo</span>
                            <span className="font-semibold text-gray-800">{DEGREE_LABELS[doc.degreeLevel] || doc.degreeLevel}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className="flex-1 bg-[#2e7d32] hover:bg-[#1b5e20] disabled:opacity-60 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                            style={{ fontFamily: 'Manrope, sans-serif' }}
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Đang ghi lên Blockchain...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[18px]">assured_workload</span>
                                    Xác nhận Ký duyệt
                                </>
                            )}
                        </button>
                        <button
                            onClick={onCancel}
                            disabled={loading}
                            className="px-5 py-3 border border-gray-200 text-gray-500 hover:bg-gray-50 rounded-xl text-sm transition-colors"
                        >
                            Hủy
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ────────── Doc Row ──────────
function DraftRow({ doc, onIssue, issuingId }) {
    const isLoading = issuingId === doc._id;
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-5 hover:shadow-md transition-shadow">
            {/* Icon */}
            <div className="p-3 bg-blue-900/8 rounded-xl shrink-0">
                <span className="material-symbols-outlined text-[28px] text-[#003b73]">description</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-semibold text-[#003b73] text-sm">{doc.docId}</span>
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                        DRAFT
                    </span>
                </div>
                <p className="font-semibold text-gray-800 truncate" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {doc.holderName}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                    {DEGREE_LABELS[doc.degreeLevel] || doc.docType}
                    {doc.metadata?.major ? ` · ${doc.metadata.major}` : ''}
                    <span className="ml-2">· {timeAgo(doc.createdAt)}</span>
                </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
                <Link
                    to={`/admin/docs/${doc._id}`}
                    className="p-2 text-gray-400 hover:text-[#003b73] hover:bg-blue-50 rounded-lg transition-colors"
                    title="Xem chi tiết"
                >
                    <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                </Link>
                <button
                    onClick={() => onIssue(doc)}
                    disabled={issuingId !== null}
                    className="flex items-center gap-2 bg-[#003b73] hover:bg-[#002855] disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-colors"
                    style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                    {isLoading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Đang xử lý...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-[18px]">verified</span>
                            Ký duyệt &amp; Push Blockchain
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

// ────────── Issued Row ──────────
function IssuedRow({ doc }) {
    return (
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-5 opacity-80">
            <div className="p-3 bg-green-50 rounded-xl shrink-0">
                <span className="material-symbols-outlined text-[28px] text-green-600">task_alt</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-semibold text-gray-600 text-sm">{doc.docId}</span>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                        ACTIVE
                    </span>
                </div>
                <p className="font-semibold text-gray-700 truncate" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {doc.holderName}
                </p>
                {doc.txHash && (
                    <a
                        href={`https://sepolia.etherscan.io/tx/${doc.txHash}`}
                        target="_blank" rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline font-mono mt-0.5 flex items-center gap-1 w-fit"
                    >
                        <span className="material-symbols-outlined text-[13px]">link</span>
                        {doc.txHash.slice(0, 20)}...
                    </a>
                )}
            </div>
            <Link to={`/admin/docs/${doc._id}`}
                className="p-2 text-gray-300 hover:text-gray-500 hover:bg-gray-50 rounded-lg transition-colors">
                <span className="material-symbols-outlined text-[20px]">open_in_new</span>
            </Link>
        </div>
    );
}

// ────────── Main Page ──────────
export default function PendingApprovalPage() {
    const { user } = useAuth();
    const [allDocs, setAllDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [issuingId, setIssuingId] = useState(null);
    const [confirmDoc, setConfirmDoc] = useState(null);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'issued'

    const fetchDocs = useCallback(() => {
        api.get('/docs')
            .then((res) => setAllDocs(res.data.data || []))
            .catch(() => toast.error('Không thể tải danh sách văn bằng'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchDocs(); }, [fetchDocs]);

    const pendingDocs = allDocs.filter((d) => d.status === 'DRAFT');
    const issuedDocs = allDocs.filter((d) => d.status === 'ACTIVE');

    const handleIssueConfirm = async () => {
        if (!confirmDoc) return;
        setIssuingId(confirmDoc._id);
        setConfirmDoc(null);
        try {
            await api.post(`/docs/issue/${confirmDoc._id}`);
            toast.success(`✅ Đã ký duyệt và ghi lên Blockchain!`);
            fetchDocs(); // reload
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi phát hành');
        } finally {
            setIssuingId(null);
        }
    };

    const todayIssued = issuedDocs.filter(
        (d) => new Date(d.createdAt).toDateString() === new Date().toDateString()
    ).length;

    return (
        <>
            {confirmDoc && (
                <ConfirmModal
                    doc={confirmDoc}
                    loading={issuingId !== null}
                    onConfirm={handleIssueConfirm}
                    onCancel={() => setConfirmDoc(null)}
                />
            )}

            <div className="p-8">
                {/* ── Header ── */}
                <div className="mb-8">
                    <h2
                        className="text-3xl font-extrabold text-[#003b73] tracking-tight mb-1"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                        Phê duyệt &amp; Ký Văn bằng
                    </h2>
                    <p className="text-gray-500 text-sm">
                        Xin chào, <span className="font-semibold text-[#003b73]">{user?.fullName}</span>.
                        Hiện có <span className="font-semibold text-orange-600">{pendingDocs.length}</span> bản nháp đang chờ ký duyệt.
                    </p>
                </div>

                {/* ── Stats ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    <StatCard
                        icon="pending_actions" iconBg="bg-orange-100" iconColor="text-[#893b01]"
                        borderColor="border-l-[#893b01]" color="#893b01"
                        label="Đang chờ ký duyệt" value={pendingDocs.length}
                    />
                    <StatCard
                        icon="task_alt" iconBg="bg-green-100" iconColor="text-green-700"
                        borderColor="border-l-green-600" color="#2e7d32"
                        label="Đã phát hành hôm nay" value={todayIssued}
                    />
                    <StatCard
                        icon="assured_workload" iconBg="bg-blue-100" iconColor="text-[#003b73]"
                        borderColor="border-l-[#003b73]" color="#003b73"
                        label="Tổng đã phát hành" value={issuedDocs.length}
                    />
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5 w-fit">
                    {[
                        { key: 'pending', label: `Chờ duyệt (${pendingDocs.length})`, icon: 'pending_actions' },
                        { key: 'issued', label: `Đã phát hành (${issuedDocs.length})`, icon: 'task_alt' },
                    ].map(({ key, label, icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            className={`flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-colors ${
                                activeTab === key
                                    ? 'bg-white text-[#003b73] shadow-sm font-semibold'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{icon}</span>
                            {label}
                        </button>
                    ))}
                </div>

                {/* ── List ── */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#003b73] border-t-transparent" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeTab === 'pending' && (
                            pendingDocs.length === 0 ? (
                                <EmptyState icon="check_circle" message="Không có bản nháp nào đang chờ duyệt" color="text-green-500" />
                            ) : (
                                pendingDocs.map((doc) => (
                                    <DraftRow key={doc._id} doc={doc} onIssue={setConfirmDoc} issuingId={issuingId} />
                                ))
                            )
                        )}
                        {activeTab === 'issued' && (
                            issuedDocs.length === 0 ? (
                                <EmptyState icon="description" message="Chưa có văn bằng nào được phát hành" color="text-gray-400" />
                            ) : (
                                issuedDocs.map((doc) => (
                                    <IssuedRow key={doc._id} doc={doc} />
                                ))
                            )
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

function StatCard({ label, value, icon, iconBg, iconColor, borderColor, color }) {
    return (
        <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${borderColor} hover:scale-[1.02] transition-transform duration-200`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
                    <h3 className="text-4xl font-extrabold" style={{ fontFamily: 'Manrope, sans-serif', color }}>
                        {value}
                    </h3>
                </div>
                <div className={`p-3 ${iconBg} rounded-lg`}>
                    <span className={`material-symbols-outlined text-3xl ${iconColor}`}>{icon}</span>
                </div>
            </div>
        </div>
    );
}

function EmptyState({ icon, message, color }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <span className={`material-symbols-outlined text-5xl mb-3 opacity-40 ${color}`}>{icon}</span>
            <p className="text-sm">{message}</p>
        </div>
    );
}
