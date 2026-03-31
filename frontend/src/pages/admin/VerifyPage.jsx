import { useState } from 'react';
import { ShieldCheck, Upload, Hash, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function VerifyPage() {
    const [tab, setTab] = useState('hash'); // 'hash' | 'upload'
    const [hash, setHash] = useState('');
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const reset = () => setResult(null);

    const verifyByHash = async (e) => {
        e.preventDefault();
        setLoading(true); reset();
        try {
            const res = await api.get(`/verify/hash/${hash.trim()}`);
            setResult(res.data);
        } catch (err) {
            setResult({ success: false, message: err.response?.data?.message || 'Không tìm thấy' });
        } finally { setLoading(false); }
    };

    const verifyByUpload = async (e) => {
        e.preventDefault();
        if (!file) { toast.error('Vui lòng chọn file PDF'); return; }
        setLoading(true); reset();
        const fd = new FormData();
        fd.append('file', file);
        try {
            const res = await api.post('/verify/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setResult(res.data);
        } catch (err) {
            setResult({ success: false, message: err.response?.data?.message || 'Lỗi xác thực' });
        } finally { setLoading(false); }
    };

    return (
        <div className="p-8 max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
                <ShieldCheck size={28} className="text-blue-700" />
                <h1 className="text-2xl font-bold text-gray-800">Xác thực văn bằng</h1>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
                {[['hash', 'Theo Hash', Hash], ['upload', 'Upload PDF', Upload]].map(([key, label, Icon]) => (
                    <button key={key} onClick={() => { setTab(key); reset(); }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            tab === key ? 'bg-white shadow text-blue-700' : 'text-gray-500 hover:text-gray-700'
                        }`}>
                        <Icon size={15} />{label}
                    </button>
                ))}
            </div>

            {/* Hash form */}
            {tab === 'hash' && (
                <form onSubmit={verifyByHash} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <p className="text-sm text-gray-500">Nhập mã băm SHA256 của văn bằng (64 ký tự hex).</p>
                    <input required value={hash} onChange={(e) => setHash(e.target.value)}
                        className="input font-mono text-sm" placeholder="a3f0e1b2c4d5..." />
                    <button type="submit" disabled={loading}
                        className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
                        {loading ? 'Đang kiểm tra...' : 'Xác thực'}
                    </button>
                </form>
            )}

            {/* Upload form */}
            {tab === 'upload' && (
                <form onSubmit={verifyByUpload} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
                    <p className="text-sm text-gray-500">Upload file PDF — hệ thống sẽ băm lại và đối chiếu.</p>
                    <input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files[0])}
                        className="block text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium hover:file:bg-blue-100" />
                    <button type="submit" disabled={loading}
                        className="bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
                        {loading ? 'Đang xác thực...' : 'Xác thực'}
                    </button>
                </form>
            )}

            {/* Result */}
            {result && <VerifyResult result={result} />}
        </div>
    );
}

function VerifyResult({ result }) {
    const isValid = result.success && result.data?.status === 'ACTIVE';
    return (
        <div className={`mt-5 rounded-xl border p-5 ${isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-3">
                {isValid
                    ? <CheckCircle size={20} className="text-green-600" />
                    : <XCircle size={20} className="text-red-600" />
                }
                <span className={`font-semibold ${isValid ? 'text-green-700' : 'text-red-700'}`}>
                    {isValid ? 'Văn bằng HỢP LỆ' : 'Văn bằng KHÔNG hợp lệ'}
                </span>
            </div>
            {result.data && (
                <div className="text-sm space-y-1 text-gray-700">
                    {result.data.holderName && <p><span className="font-medium">Họ tên:</span> {result.data.holderName}</p>}
                    {result.data.docId && <p><span className="font-medium">Mã văn bản:</span> {result.data.docId}</p>}
                    {result.data.txHash && (
                        <p className="flex items-center gap-1">
                            <span className="font-medium">Sepolia Tx:</span>
                            <a href={`https://sepolia.etherscan.io/tx/${result.data.txHash}`}
                                target="_blank" rel="noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-xs">
                                {result.data.txHash.slice(0, 20)}... <ExternalLink size={11} />
                            </a>
                        </p>
                    )}
                </div>
            )}
            {!result.success && <p className="text-sm text-red-600">{result.message}</p>}
        </div>
    );
}
