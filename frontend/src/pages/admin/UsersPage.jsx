import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABEL = {
    SYS_ADMIN: 'Quan tri he thong',
    OFFICER: 'Can bo nhap lieu',
    SIGNER: 'Nguoi ky duyet',
    STUDENT: 'Sinh vien',
};

const emptyForm = {
    username: '',
    password: '123456',
    fullName: '',
    email: '',
    role: 'OFFICER',
    studentId: '',
    walletAddress: '',
};

export default function UsersPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(emptyForm);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users');
            setUsers(res.data.data || []);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Khong the tai danh sach tai khoan');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const updateForm = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const payload = {
                username: form.username.trim(),
                password: form.password,
                fullName: form.fullName.trim(),
                email: form.email.trim(),
                role: form.role,
                studentId: form.studentId.trim() || undefined,
                walletAddress: form.walletAddress.trim() || undefined,
            };

            await api.post('/users', payload);
            toast.success('Da tao tai khoan');
            setForm(emptyForm);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Tao tai khoan that bai');
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (target) => {
        const status = target.status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE';
        try {
            await api.patch(`/users/${target._id}/status`, { status });
            toast.success(status === 'ACTIVE' ? 'Da mo khoa tai khoan' : 'Da khoa tai khoan');
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Cap nhat tai khoan that bai');
        }
    };

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Quan ly tai khoan</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Chuc nang rieng cho SYS_ADMIN: tao user theo role va khoa/mo khoa tai khoan.
                </p>
            </div>

            <form onSubmit={handleCreate} className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Username"
                        value={form.username} onChange={(e) => updateForm('username', e.target.value)} required />
                    <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ho ten"
                        value={form.fullName} onChange={(e) => updateForm('fullName', e.target.value)} required />
                    <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Email"
                        type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} required />
                    <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Password"
                        type="text" value={form.password} onChange={(e) => updateForm('password', e.target.value)} required />
                    <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                        value={form.role} onChange={(e) => updateForm('role', e.target.value)}>
                        {Object.entries(ROLE_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm" placeholder="Ma sinh vien (neu co)"
                        value={form.studentId} onChange={(e) => updateForm('studentId', e.target.value)} />
                    <input className="border border-gray-200 rounded-lg px-3 py-2 text-sm md:col-span-2" placeholder="Wallet address (neu la SIGNER)"
                        value={form.walletAddress} onChange={(e) => updateForm('walletAddress', e.target.value)} />
                    <button type="submit" disabled={saving}
                        className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                        {saving ? 'Dang tao...' : 'Tao tai khoan'}
                    </button>
                </div>
            </form>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-5 py-3 text-left">Username</th>
                                <th className="px-5 py-3 text-left">Ho ten</th>
                                <th className="px-5 py-3 text-left">Email</th>
                                <th className="px-5 py-3 text-left">Role</th>
                                <th className="px-5 py-3 text-left">Trang thai</th>
                                <th className="px-5 py-3 text-right">Hanh dong</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users.map((item) => {
                                const isSelf = item._id === currentUser?._id;
                                return (
                                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-5 py-3 font-mono text-gray-700">{item.username}</td>
                                        <td className="px-5 py-3 text-gray-700">{item.fullName}</td>
                                        <td className="px-5 py-3 text-gray-500">{item.email}</td>
                                        <td className="px-5 py-3">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                                {ROLE_LABEL[item.role] || item.role}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <button
                                                onClick={() => toggleStatus(item)}
                                                disabled={isSelf}
                                                className="text-xs font-semibold px-3 py-1 rounded-lg border border-gray-200 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                {item.status === 'ACTIVE' ? 'Khoa' : 'Mo khoa'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
