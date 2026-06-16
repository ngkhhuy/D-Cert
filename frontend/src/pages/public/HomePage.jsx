import { Link } from 'react-router-dom';
import {
    ArrowRight,
    BadgeCheck,
    Building2,
    GraduationCap,
    LayoutDashboard,
    QrCode,
    ShieldCheck,
    Sparkles,
    UserRoundCheck,
} from 'lucide-react';

const entryPoints = [
    {
        title: 'Trang quản trị',
        desc: 'Dành cho phòng đào tạo, người ký duyệt và quản trị hệ thống.',
        to: '/login',
        icon: LayoutDashboard,
        cta: 'Đăng nhập quản trị',
        tone: 'bg-[#003b73] text-white hover:bg-[#00529c]',
    },
    {
        title: 'Cổng sinh viên',
        desc: 'Xem văn bằng, văn bản học vụ và trợ lý AI dành cho sinh viên.',
        to: '/student/login',
        icon: GraduationCap,
        cta: 'Vào cổng sinh viên',
        tone: 'bg-emerald-700 text-white hover:bg-emerald-800',
    },
    {
        title: 'Nhà tuyển dụng',
        desc: 'Quét QR hoặc tải PDF để xác thực văn bằng công khai.',
        to: '/verify',
        icon: Building2,
        cta: 'Xác thực văn bằng',
        tone: 'bg-amber-600 text-white hover:bg-amber-700',
    },
];

const stats = [
    ['Blockchain', 'Đối chiếu hash minh bạch'],
    ['QR Verify', 'Tra cứu nhanh bằng mã xác thực'],
    ['AI học vụ', 'Hỏi đáp văn bản đào tạo'],
];

export default function HomePage() {
    return (
        <div className="min-h-screen bg-[#f7f9fb] text-slate-900">
            <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#003b73] text-white">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <p className="text-lg font-black tracking-tight text-[#003b73]">DUT D-Cert</p>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                Digital Certificate
                            </p>
                        </div>
                    </Link>

                    <nav className="hidden items-center gap-2 md:flex">
                        <Link to="/verify" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                            Xác thực
                        </Link>
                        <Link to="/login" className="rounded-lg bg-[#003b73] px-4 py-2 text-sm font-semibold text-white hover:bg-[#00529c]">
                            Đăng nhập
                        </Link>
                    </nav>
                </div>
            </header>

            <main>
                <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                            <Sparkles size={16} />
                            Xác thực văn bằng số cho Đại học Bách khoa Đà Nẵng
                        </div>

                        <div className="space-y-5">
                            <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-[#003b73] md:text-6xl">
                                D-Cert
                            </h1>
                            <p className="max-w-2xl text-lg leading-8 text-slate-600">
                                Nền tảng quản lý, phát hành và xác thực văn bằng số bằng QR, blockchain và kho văn bản học vụ tích hợp AI.
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            {stats.map(([title, desc]) => (
                                <div key={title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                                    <p className="font-bold text-slate-900">{title}</p>
                                    <p className="mt-1 text-sm leading-5 text-slate-500">{desc}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            {entryPoints.map(({ title, desc, to, icon: Icon, cta, tone }) => (
                                <Link
                                    key={title}
                                    to={to}
                                    className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                                >
                                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-[#003b73]">
                                        <Icon size={23} />
                                    </div>
                                    <h2 className="text-base font-black text-slate-900">{title}</h2>
                                    <p className="mt-2 min-h-[60px] text-sm leading-6 text-slate-500">{desc}</p>
                                    <span className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition ${tone}`}>
                                        {cta}
                                        <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="relative">
                        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
                            <div className="rounded-lg border border-[#d6e4f2] bg-[#f9fbfd] p-6">
                                <div className="flex items-start justify-between gap-5 border-b border-slate-200 pb-5">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                                            Digital Diploma
                                        </p>
                                        <h3 className="mt-2 text-2xl font-black text-[#003b73]">Văn bằng đã xác thực</h3>
                                    </div>
                                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#003b73] text-white">
                                        <QrCode size={34} />
                                    </div>
                                </div>

                                <div className="grid gap-4 py-6">
                                    {[
                                        ['Sinh viên', 'Nguyễn Văn A'],
                                        ['Mã văn bằng', 'BKDN-2026-0001'],
                                        ['Trạng thái', 'ACTIVE'],
                                    ].map(([label, value]) => (
                                        <div key={label} className="flex items-center justify-between gap-4 rounded-lg bg-white px-4 py-3">
                                            <span className="text-sm font-semibold text-slate-500">{label}</span>
                                            <span className="text-sm font-black text-slate-900">{value}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-lg bg-emerald-50 p-4 text-emerald-700">
                                        <BadgeCheck size={22} />
                                        <p className="mt-2 text-sm font-black">Hash hợp lệ</p>
                                    </div>
                                    <div className="rounded-lg bg-amber-50 p-4 text-amber-700">
                                        <UserRoundCheck size={22} />
                                        <p className="mt-2 text-sm font-black">Đã ký duyệt</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="border-t border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
                    <p className="font-semibold">© 2026 DUT D-Cert</p>
                    <p>Trường Đại học Bách khoa - Đại học Đà Nẵng</p>
                </div>
            </footer>
        </div>
    );
}
