import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpenCheck, GraduationCap, MessageCircleQuestion } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function StudentLoginPage() {
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
            if (profile.role !== 'STUDENT') {
                logout();
                toast.error('Tài khoản cán bộ vui lòng đăng nhập tại Cổng quản trị');
                navigate('/login', { replace: true });
                return;
            }

            toast.success('Đăng nhập sinh viên thành công');
            navigate('/student', { replace: true });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Sai mã sinh viên hoặc mật khẩu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#eef7f2] flex items-center justify-center p-6">
            <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-xl border border-emerald-100 bg-white shadow-xl lg:grid-cols-[0.95fr_1.05fr]">
                <section className="bg-emerald-700 p-8 text-white lg:p-10">
                    <Link to="/" className="inline-flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/15">
                            <GraduationCap size={25} />
                        </div>
                        <div>
                            <p className="text-xl font-black">DUT D-Cert</p>
                            <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">Student Portal</p>
                        </div>
                    </Link>

                    <div className="mt-14 space-y-5">
                        <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-100">Cổng sinh viên</p>
                        <h1 className="text-4xl font-black leading-tight">Tra cứu văn bằng và văn bản học vụ cá nhân</h1>
                        <p className="leading-7 text-emerald-50">
                            Sinh viên đăng nhập để xem văn bằng đã phát hành, nhận tài liệu và hỏi đáp với trợ lý học vụ AI.
                        </p>
                    </div>

                    <div className="mt-10 grid gap-3">
                        {[
                            [BookOpenCheck, 'Văn bằng cá nhân'],
                            [MessageCircleQuestion, 'Trợ lý học vụ AI'],
                        ].map(([Icon, label]) => (
                            <div key={label} className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3">
                                <Icon size={20} />
                                <span className="text-sm font-semibold">{label}</span>
                            </div>
                        ))}
                    </div>
                </section>

                <main className="p-8 lg:p-10">
                    <div className="mx-auto max-w-md">
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-slate-900">Đăng nhập sinh viên</h2>
                            <p className="mt-1 text-sm text-slate-500">Sử dụng tài khoản sinh viên được cấp trong hệ thống.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Mã sinh viên hoặc username</label>
                                <input
                                    type="text"
                                    required
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                    placeholder="102220001"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-semibold text-slate-700">Mật khẩu</label>
                                <input
                                    type="password"
                                    required
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                    placeholder="••••••••"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                            >
                                {loading ? 'Đang đăng nhập...' : 'Đăng nhập sinh viên'}
                            </button>
                        </form>

                        <div className="mt-5 text-center text-sm text-slate-500">
                            Cán bộ nhà trường?{' '}
                            <Link to="/login" className="font-semibold text-emerald-700 hover:underline">
                                Vào cổng quản trị
                            </Link>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
