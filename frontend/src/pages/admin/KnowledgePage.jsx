import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ── Constants ────────────────────────────────────────────────────────────────
const DOC_TYPES = [
    { value: 'REGULATION',   label: 'Quy chế' },
    { value: 'DECISION',     label: 'Quyết định' },
    { value: 'ANNOUNCEMENT', label: 'Thông báo' },
    { value: 'GUIDELINE',    label: 'Hướng dẫn' },
    { value: 'FAQ',          label: 'FAQ' },
    { value: 'OTHER',        label: 'Khác' },
];

const STATUS_BADGE = {
    DRAFT:     'bg-amber-100 text-amber-700 border-amber-200',
    PUBLISHED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    ARCHIVED:  'bg-slate-200 text-slate-600 border-slate-300',
};
const STATUS_LABEL = { DRAFT: 'Nháp', PUBLISHED: 'Công khai', ARCHIVED: 'Lưu trữ' };

const AI_BADGE = {
    NOT_INDEXED: 'bg-slate-100 text-slate-500 border-slate-200',
    INDEXING:    'bg-yellow-100 text-yellow-700 border-yellow-200',
    INDEXED:     'bg-emerald-100 text-emerald-700 border-emerald-200',
    FAILED:      'bg-red-100 text-red-700 border-red-200',
};
const AI_LABEL = {
    NOT_INDEXED: 'Chưa index',
    INDEXING:    'Đang index...',
    INDEXED:     'Đã index',
    FAILED:      'Thất bại',
};

const EMPTY_FORM = {
    title: '',
    type: 'REGULATION',
    sourceUnit: 'Phòng Đào tạo',
    issuedDate: '',
    effectiveFrom: '',
    effectiveTo: '',
};

function formatDate(val) {
    if (!val) return '—';
    try { return new Date(val).toLocaleDateString('vi-VN'); } catch { return val; }
}

function EffectivePeriod({ from, to }) {
    if (!from && !to) return <span className="text-slate-400 text-xs">—</span>;
    if (from && !to) return <span className="text-xs text-emerald-600">{formatDate(from)} – Không thời hạn</span>;
    return <span className="text-xs text-slate-600">{formatDate(from)} – {formatDate(to)}</span>;
}

function Badge({ cls, label }) {
    return (
        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
            {label}
        </span>
    );
}

// ── Upload form ───────────────────────────────────────────────────────────────
function UploadForm({ onUploaded }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [file, setFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) { toast.error('Vui lòng nhập tên văn bản'); return; }
        if (!file) { toast.error('Vui lòng chọn file'); return; }

        const fd = new FormData();
        fd.append('file', file);
        fd.append('title', form.title.trim());
        fd.append('type', form.type);
        if (form.sourceUnit.trim()) fd.append('sourceUnit', form.sourceUnit.trim());
        if (form.issuedDate) fd.append('issuedDate', form.issuedDate);
        if (form.effectiveFrom) fd.append('effectiveFrom', form.effectiveFrom);
        if (form.effectiveTo) fd.append('effectiveTo', form.effectiveTo);

        setSubmitting(true);
        try {
            await api.post('/knowledge', fd, { headers: { 'Content-Type': undefined } });
            toast.success('Upload văn bản thành công. Văn bản đang ở trạng thái DRAFT.');
            setForm(EMPTY_FORM);
            setFile(null);
            e.target.reset();
            onUploaded();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Upload thất bại');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-[#003b73] text-base mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                Upload văn bản mới
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tên văn bản <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        value={form.title}
                        onChange={(e) => set('title', e.target.value)}
                        placeholder="VD: Quy chế học vụ 2025"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                        required
                    />
                </div>

                {/* Type */}
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Loại văn bản <span className="text-red-500">*</span></label>
                    <select
                        value={form.type}
                        onChange={(e) => set('type', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                    >
                        {DOC_TYPES.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>

                {/* Source unit */}
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Đơn vị ban hành</label>
                    <input
                        type="text"
                        value={form.sourceUnit}
                        onChange={(e) => set('sourceUnit', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                </div>

                {/* Dates */}
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày ban hành</label>
                    <input type="date" value={form.issuedDate} onChange={(e) => set('issuedDate', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Hiệu lực từ</label>
                    <input type="date" value={form.effectiveFrom} onChange={(e) => set('effectiveFrom', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Hiệu lực đến</label>
                    <input type="date" value={form.effectiveTo} onChange={(e) => set('effectiveTo', e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>

                {/* File */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">File văn bản (PDF, DOCX, TXT — tối đa 20MB) <span className="text-red-500">*</span></label>
                    <input
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        required
                    />
                </div>

                <div className="md:col-span-2 flex justify-end">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-[#003b73] hover:bg-blue-800 disabled:bg-slate-300 text-white font-semibold px-6 py-2 rounded-xl text-sm transition-colors flex items-center gap-2"
                    >
                        {submitting && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
                        {submitting ? 'Đang upload...' : 'Upload văn bản'}
                    </button>
                </div>
            </form>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function KnowledgePage() {
    const { user } = useAuth();
    const role = user?.role;
    const canUpload  = ['SYS_ADMIN', 'OFFICER'].includes(role);
    const canPublish = ['SYS_ADMIN', 'SIGNER'].includes(role);
    const canArchive = ['SYS_ADMIN', 'SIGNER'].includes(role);
    const canReindex = ['SYS_ADMIN', 'SIGNER'].includes(role);

    const [docs, setDocs]           = useState([]);
    const [loading, setLoading]     = useState(false);
    const [actionId, setActionId]   = useState(null); // id of doc currently being acted on
    const [page, setPage]           = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [filters, setFilters] = useState({
        search: '', status: '', type: '', aiIndexStatus: '',
    });
    const [pendingSearch, setPendingSearch] = useState('');

    const fetchDocs = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const params = { page: p, limit: 10 };
            if (filters.search)       params.search       = filters.search;
            if (filters.status)       params.status       = filters.status;
            if (filters.type)         params.type         = filters.type;
            if (filters.aiIndexStatus) params.aiIndexStatus = filters.aiIndexStatus;

            const res = await api.get('/knowledge', { params });
            setDocs(res.data.data?.items ?? []);
            setTotalPages(res.data.data?.pagination?.totalPages ?? 1);
            setPage(p);
        } catch {
            toast.error('Không thể tải danh sách văn bản');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { fetchDocs(1); }, [fetchDocs]);

    const handleSearch = () => {
        setFilters((f) => ({ ...f, search: pendingSearch }));
    };

    const setFilter = (k, v) => {
        setFilters((f) => ({ ...f, [k]: v }));
    };

    // ── Actions ────────────────────────────────────────────────────────────
    const handlePublish = async (doc) => {
        setActionId(doc._id);
        try {
            const res = await api.patch(`/knowledge/${doc._id}/publish`);
            const data = res.data?.data;
            if (data?.aiIndexStatus === 'FAILED') {
                toast('Publish thành công nhưng AI index thất bại. Có thể bấm Reindex.', {
                    icon: '⚠️', duration: 5000,
                });
            } else {
                toast.success('Publish văn bản thành công và đã gửi index sang AI Service.');
            }
            fetchDocs(page);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Publish thất bại');
        } finally {
            setActionId(null);
        }
    };

    const handleReindex = async (doc) => {
        setActionId(doc._id);
        try {
            await api.post(`/knowledge/${doc._id}/reindex`);
            toast.success('Reindex thành công');
            fetchDocs(page);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Reindex thất bại');
        } finally {
            setActionId(null);
        }
    };

    const handleArchive = async (doc) => {
        if (!window.confirm('Bạn có chắc muốn lưu trữ văn bản này? Chatbot sẽ không ưu tiên sử dụng văn bản này nữa.')) return;
        setActionId(doc._id);
        try {
            await api.patch(`/knowledge/${doc._id}/archive`);
            toast.success('Đã lưu trữ văn bản');
            fetchDocs(page);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Archive thất bại');
        } finally {
            setActionId(null);
        }
    };

    const typeLabel = (t) => DOC_TYPES.find((d) => d.value === t)?.label ?? t;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold text-[#003b73] tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Kho văn bản học vụ
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    Quản lý quy chế, quyết định, thông báo và tài liệu dùng cho trợ lý học vụ AI.
                </p>
            </div>

            {/* Upload form (admin/officer only) */}
            {canUpload && <UploadForm onUploaded={() => fetchDocs(1)} />}

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[180px]">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Tìm kiếm</label>
                    <input
                        type="text"
                        value={pendingSearch}
                        onChange={(e) => setPendingSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Tên văn bản..."
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Trạng thái</label>
                    <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white">
                        <option value="">Tất cả</option>
                        <option value="DRAFT">Nháp</option>
                        <option value="PUBLISHED">Công khai</option>
                        <option value="ARCHIVED">Lưu trữ</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Loại</label>
                    <select value={filters.type} onChange={(e) => setFilter('type', e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white">
                        <option value="">Tất cả</option>
                        {DOC_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">AI Index</label>
                    <select value={filters.aiIndexStatus} onChange={(e) => setFilter('aiIndexStatus', e.target.value)}
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none bg-white">
                        <option value="">Tất cả</option>
                        <option value="NOT_INDEXED">Chưa index</option>
                        <option value="INDEXING">Đang index</option>
                        <option value="INDEXED">Đã index</option>
                        <option value="FAILED">Thất bại</option>
                    </select>
                </div>
                <button onClick={handleSearch}
                    className="bg-[#003b73] text-white text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">search</span>
                    Tìm kiếm
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48 text-slate-400 gap-2 text-sm">
                        <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                        Đang tải...
                    </div>
                ) : docs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
                        <span className="material-symbols-outlined text-3xl">library_books</span>
                        <p className="text-sm">Chưa có văn bản nào</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    <th className="text-left px-4 py-3">Tên văn bản</th>
                                    <th className="text-left px-4 py-3">Loại</th>
                                    <th className="text-left px-4 py-3 hidden lg:table-cell">Đơn vị</th>
                                    <th className="text-left px-4 py-3 hidden xl:table-cell">Ngày ban hành</th>
                                    <th className="text-left px-4 py-3 hidden xl:table-cell">Hiệu lực</th>
                                    <th className="text-left px-4 py-3">Trạng thái</th>
                                    <th className="text-left px-4 py-3">AI Index</th>
                                    <th className="text-left px-4 py-3">Lỗi AI</th>
                                    <th className="text-right px-4 py-3">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {docs.map((doc) => {
                                    const busy = actionId === doc._id;
                                    return (
                                        <tr key={doc._id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            {/* Title */}
                                            <td className="px-4 py-3 max-w-[200px]">
                                                <p className="font-medium text-slate-800 truncate" title={doc.title}>{doc.title}</p>
                                            </td>

                                            {/* Type */}
                                            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{typeLabel(doc.type)}</td>

                                            {/* Source unit */}
                                            <td className="px-4 py-3 text-slate-500 hidden lg:table-cell whitespace-nowrap">{doc.sourceUnit || '—'}</td>

                                            {/* Issued date */}
                                            <td className="px-4 py-3 text-slate-500 hidden xl:table-cell whitespace-nowrap">{formatDate(doc.issuedDate)}</td>

                                            {/* Effective period */}
                                            <td className="px-4 py-3 hidden xl:table-cell">
                                                <EffectivePeriod from={doc.effectiveFrom} to={doc.effectiveTo} />
                                            </td>

                                            {/* Status badge */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <Badge cls={STATUS_BADGE[doc.status] ?? ''} label={STATUS_LABEL[doc.status] ?? doc.status} />
                                            </td>

                                            {/* AI Index badge */}
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <Badge cls={AI_BADGE[doc.aiIndexStatus] ?? ''} label={AI_LABEL[doc.aiIndexStatus] ?? doc.aiIndexStatus} />
                                            </td>

                                            {/* AI index error */}
                                            <td className="px-4 py-3 max-w-[220px]">
                                                {doc.indexError ? (
                                                    <p className="text-xs text-red-600 line-clamp-2" title={doc.indexError}>
                                                        {doc.indexError}
                                                    </p>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-end gap-2">
                                                    {doc.status === 'DRAFT' && canPublish && (
                                                        <button onClick={() => handlePublish(doc)} disabled={busy}
                                                            className="text-xs font-semibold px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors whitespace-nowrap">
                                                            {busy ? '...' : 'Publish'}
                                                        </button>
                                                    )}
                                                    {doc.status === 'PUBLISHED' && canReindex && (
                                                        <button onClick={() => handleReindex(doc)} disabled={busy}
                                                            className="text-xs font-semibold px-3 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 transition-colors whitespace-nowrap">
                                                            {busy ? '...' : 'Reindex'}
                                                        </button>
                                                    )}
                                                    {doc.status === 'PUBLISHED' && canArchive && (
                                                        <button onClick={() => handleArchive(doc)} disabled={busy}
                                                            className="text-xs font-semibold px-3 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 disabled:opacity-50 transition-colors whitespace-nowrap">
                                                            {busy ? '...' : 'Archive'}
                                                        </button>
                                                    )}
                                                    {doc.status === 'ARCHIVED' && (
                                                        <span className="text-[11px] text-slate-400 italic">Đã lưu trữ</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                        <p className="text-xs text-slate-400">Trang {page} / {totalPages}</p>
                        <div className="flex gap-2">
                            <button onClick={() => fetchDocs(page - 1)} disabled={page <= 1}
                                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                                ← Trước
                            </button>
                            <button onClick={() => fetchDocs(page + 1)} disabled={page >= totalPages}
                                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                                Sau →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
