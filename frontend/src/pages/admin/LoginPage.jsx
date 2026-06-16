import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
    const [form, setForm] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const { login, logout, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;
        navigate(user.role === 'STUDENT' ? '/student' : '/admin', { replace: true });
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const profile = await login(form.username, form.password);
            if (profile.role === 'STUDENT') {
                logout();
                toast.error('Tài khoản sinh viên vui lòng đăng nhập tại Cổng sinh viên');
                navigate('/student/login', { replace: true });
                return;
            }

            toast.success('Đăng nhập quản trị thành công');
            navigate('/admin', { replace: true });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Sai tên đăng nhập hoặc mật khẩu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f7f9fb] flex">
            <div className="hidden lg:flex w-[46%] bg-[#003b73] text-white p-12 flex-col justify-between">
                <Link to="/" className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-lg bg-white/12 flex items-center justify-center">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <p className="font-black text-xl">DUT D-Cert</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-blue-100">Admin Portal</p>
                    </div>
                </Link>

                <div className="max-w-lg">
                    <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-100">Cổng quản trị</p>
                    <h1 className="mt-4 text-5xl font-black leading-tight">Quản lý phát hành và xác thực văn bằng số</h1>
                    <p className="mt-5 text-base leading-7 text-blue-50">
                        Dành cho cán bộ phòng đào tạo, người ký duyệt và quản trị hệ thống.
                    </p>
                </div>

                <p className="text-sm text-blue-100">Trường Đại học Bách khoa - Đại học Đà Nẵng</p>
            </div>

            <main className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-xl p-8">
                        <div className="flex flex-col items-center mb-8 text-center">
                            <div className="bg-blue-100 p-4 rounded-lg mb-4">
                                <GraduationCap size={34} className="text-blue-700" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-800">Đăng nhập quản trị</h2>
                            <p className="text-sm text-gray-500 mt-1">SYS_ADMIN, OFFICER, SIGNER</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Tên đăng nhập</label>
                                <input
                                    type="text"
                                    required
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="admin"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu</label>
                                <input
                                    type="password"
                                    required
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="••••••••"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-bold py-2.5 rounded-lg transition-colors"
                            >
                                {loading ? 'Đang đăng nhập...' : 'Đăng nhập quản trị'}
                            </button>
                        </form>

                        <div className="mt-5 text-center text-sm text-gray-500">
                            Sinh viên?{' '}
                            <Link to="/student/login" className="font-semibold text-blue-700 hover:underline">
                                Vào cổng sinh viên
                            </Link>
                        </div>
                    </div>

                    <p className="text-center text-xs text-gray-400 mt-6">
                        ĐH Bách Khoa Đà Nẵng - Đồ án tốt nghiệp 2026
                    </p>
                </div>
            </main>
        </div>
    );
}
