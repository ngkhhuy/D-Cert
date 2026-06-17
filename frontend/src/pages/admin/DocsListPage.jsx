import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Search, FileText, Trash2 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const STATUS_BADGE = {
    ACTIVE: 'bg-green-100 text-green-700',
    DRAFT:  'bg-yellow-100 text-yellow-700',
    REVOKED: 'bg-red-100 text-red-700',
};

export default function DocsListPage() {
    const { user } = useAuth();
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [search, setSearch] = useState('');

    const fetchDocs = () => {
        setLoading(true);
        api.get('/docs')
            .then((res) => setDocs(res.data.data || []))
            .catch(() => toast.error('Không thể tải danh sách văn bằng'))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchDocs();
    }, []);

    const canDeleteDrafts = ['OFFICER', 'SYS_ADMIN'].includes(user?.role);

    const handleDeleteDraft = async (doc) => {
        if (deletingId) return;
        const ok = window.confirm(`Xóa bản nháp ${doc.docId}? Thao tác này không thể hoàn tác.`);
        if (!ok) return;

        setDeletingId(doc._id);
        try {
            await api.delete(`/docs/${doc._id}`);
            setDocs((current) => current.filter((item) => item._id !== doc._id));
            toast.success('Đã xóa bản nháp');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Không thể xóa bản nháp');
        } finally {
            setDeletingId(null);
        }
    };

    const filtered = docs.filter((d) =>
        d.docId?.toLowerCase().includes(search.toLowerCase()) ||
        d.holderName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Danh sách văn bằng</h1>
                {user?.role === 'OFFICER' && (
                <Link
                    to="/admin/docs/new"
                    className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                    <PlusCircle size={16} />
                    Tạo bản nháp
                </Link>
                )}
            </div>

            {/* Search */}
            <div className="relative mb-5 max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo mã hoặc tên..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center py-12 text-gray-400">
                        <FileText size={40} className="mb-2 opacity-30" />
                        <p className="text-sm">Chưa có văn bằng nào</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-3 text-left">Mã văn bản</th>
                                <th className="px-5 py-3 text-left">Họ tên</th>
                                <th className="px-5 py-3 text-left">Loại</th>
                                <th className="px-5 py-3 text-left">Trạng thái</th>
                                <th className="px-5 py-3 text-left">Ngày tạo</th>
                                <th className="px-5 py-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.map((doc) => (
                                <tr key={doc._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-3 font-mono font-medium text-gray-700">{doc.docId}</td>
                                    <td className="px-5 py-3 text-gray-700">{doc.holderName}</td>
                                    <td className="px-5 py-3 text-gray-500">{doc.docType}</td>
                                    <td className="px-5 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[doc.status]}`}>
                                            {doc.status}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3 text-gray-400">
                                        {new Date(doc.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="px-5 py-3">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link
                                                to={`/admin/docs/${doc._id}`}
                                                className="text-blue-600 hover:underline text-xs font-medium"
                                            >
                                                Chi tiết →
                                            </Link>
                                            {canDeleteDrafts && doc.status === 'DRAFT' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteDraft(doc)}
                                                    disabled={deletingId === doc._id}
                                                    className="inline-flex items-center justify-center rounded-md p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
                                                    title="Xóa bản nháp"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
