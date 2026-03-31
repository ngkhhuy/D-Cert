import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Zap, ExternalLink, FileDown } from 'lucide-react';

const STATUS_BADGE = {
    ACTIVE:  'bg-green-100 text-green-700',
    DRAFT:   'bg-yellow-100 text-yellow-700',
    REVOKED: 'bg-red-100 text-red-700',
};

export default function DocDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [doc, setDoc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [issuing, setIssuing] = useState(false);

    useEffect(() => {
        api.get(`/docs/${id}`)
            .then((res) => setDoc(res.data.data))
            .catch(() => toast.error('Không tìm thấy văn bằng'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleIssue = async () => {
        if (!confirm('Xác nhận phát hành? Thao tác này sẽ ghi hash lên blockchain Sepolia và không thể hoàn tác.')) return;
        setIssuing(true);
        try {
            const res = await api.post(`/docs/issue/${id}`);
            setDoc((prev) => ({ ...prev, ...res.data.data, status: 'ACTIVE' }));
            toast.success('Phát hành thành công! Đã ghi lên Sepolia.');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Lỗi khi phát hành');
        } finally {
            setIssuing(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
    );

    if (!doc) return (
        <div className="p-8 text-gray-500">Không tìm thấy văn bằng.</div>
    );

    const canIssue = doc.status === 'DRAFT' && ['SIGNER', 'SYS_ADMIN'].includes(user?.role);

    return (
        <div className="p-8 max-w-3xl">
            <button onClick={() => navigate('/admin/docs')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors">
                <ArrowLeft size={16} /> Quay lại
            </button>

            <div className="flex items-start justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">{doc.docId}</h1>
                    <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[doc.status]}`}>
                        {doc.status}
                    </span>
                </div>
                {canIssue && (
                    <button onClick={handleIssue} disabled={issuing}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">
                        <Zap size={16} />
                        {issuing ? 'Đang phát hành...' : 'Phát hành & Ký'}
                    </button>
                )}
            </div>

            {/* Info card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                <InfoRow label="Họ và tên" value={doc.holderName} />
                <InfoRow label="Mã sinh viên" value={doc.holderId || '—'} />
                <InfoRow label="Loại văn bản" value={doc.docType} />
                {doc.degreeLevel && <InfoRow label="Bậc đào tạo" value={doc.degreeLevel} />}
                <InfoRow label="Ngày tạo" value={new Date(doc.createdAt).toLocaleString('vi-VN')} />
                {doc.docHash && (
                    <InfoRow label="SHA256 Hash" value={
                        <span className="font-mono text-xs break-all text-gray-600">{doc.docHash}</span>
                    } />
                )}
                {doc.txHash && (
                    <InfoRow label="Tx Hash (Sepolia)" value={
                        <a href={`https://sepolia.etherscan.io/tx/${doc.txHash}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline font-mono text-xs break-all">
                            {doc.txHash} <ExternalLink size={12} />
                        </a>
                    } />
                )}
                {doc.metadata && Object.keys(doc.metadata).length > 0 && (
                    <InfoRow label="Metadata" value={
                        <pre className="text-xs text-gray-600 bg-gray-50 rounded p-2 overflow-auto">
                            {JSON.stringify(doc.metadata, null, 2)}
                        </pre>
                    } />
                )}
            </div>

            {/* PDF download */}
            {doc.status === 'ACTIVE' && (
                <a href={`/uploads/${doc.docId}.pdf`} target="_blank" rel="noreferrer"
                    className="mt-5 flex items-center gap-2 text-sm text-blue-700 hover:underline font-medium">
                    <FileDown size={16} /> Tải xuống PDF văn bằng
                </a>
            )}
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div className="flex px-5 py-3 gap-4">
            <span className="text-sm text-gray-400 w-44 shrink-0">{label}</span>
            <span className="text-sm text-gray-800 flex-1">{value}</span>
        </div>
    );
}
