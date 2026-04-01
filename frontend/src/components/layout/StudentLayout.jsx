import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_LINKS = [
    { to: '/student',           label: 'Trang chủ',            exact: true },
    { to: '/student/diplomas',  label: 'Văn bằng của tôi',     exact: false },
    { to: '/student/requests',  label: 'Yêu cầu cấp giấy tờ', exact: false },
];

const MOBILE_NAV = [
    { to: '/student',          label: 'Trang chủ',   icon: 'home',          fill: true },
    { to: '/student/diplomas', label: 'Văn bằng',    icon: 'verified',      fill: false },
    { to: '/student/requests', label: 'Yêu cầu',     icon: 'request_quote', fill: false },
    { to: '/student/profile',  label: 'Cá nhân',     icon: 'person',        fill: false },
];

export default function StudentLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const initials = user?.fullName
        ?.split(' ')
        .slice(-2)
        .map((w) => w[0])
        .join('')
        .toUpperCase() || 'SV';

    return (
        <div className="bg-[#f7f9fb] text-[#191c1e] min-h-screen" style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* ── TopNavBar ── */}
            <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
                <div className="flex justify-between items-center h-16 px-6 md:px-12 w-full max-w-screen-2xl mx-auto">
                    {/* Brand */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#003b73] rounded-lg flex items-center justify-center">
                            <span
                                className="material-symbols-outlined text-white"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                                verified_user
                            </span>
                        </div>
                        <span
                            className="text-xl font-extrabold text-blue-900 tracking-tighter"
                            style={{ fontFamily: 'Manrope, sans-serif' }}
                        >
                            DUT D-Cert
                        </span>
                    </div>

                    {/* Desktop nav links */}
                    <div
                        className="hidden md:flex items-center gap-8 text-sm font-bold tracking-tight"
                        style={{ fontFamily: 'Manrope, sans-serif' }}
                    >
                        {NAV_LINKS.map(({ to, label, exact }) => (
                            <NavLink
                                key={to}
                                to={to}
                                end={exact}
                                className={({ isActive }) =>
                                    isActive
                                        ? 'text-blue-900 border-b-2 border-blue-900 pb-1'
                                        : 'text-slate-500 hover:text-blue-800 transition-colors'
                                }
                            >
                                {label}
                            </NavLink>
                        ))}
                    </div>

                    {/* Right: notifications + user */}
                    <div className="flex items-center gap-4">
                        {/* Notification bell */}
                        <button className="p-2 text-[#424751] hover:bg-slate-50 rounded-lg transition-all relative">
                            <span className="material-symbols-outlined">notifications</span>
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                        </button>

                        {/* User info + avatar dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setMenuOpen((v) => !v)}
                                className="flex items-center gap-3 pl-4 border-l border-slate-200"
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-xs font-bold text-[#003b73] leading-tight">
                                        SV: {user?.fullName || user?.username}
                                    </p>
                                    <p className="text-[10px] text-[#424751] leading-tight">
                                        {user?.studentId || user?.username}
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-[#003b73] flex items-center justify-center text-white text-sm font-bold border-2 border-blue-100 shrink-0">
                                    {initials}
                                </div>
                            </button>

                            {menuOpen && (
                                <div className="absolute right-0 top-14 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">logout</span>
                                        Đăng xuất
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* ── Page content ── */}
            <main
                className="pt-24 pb-20 md:pb-12 px-6 md:px-12 w-full max-w-screen-2xl mx-auto"
                onClick={() => menuOpen && setMenuOpen(false)}
            >
                <Outlet />
            </main>

            {/* ── Mobile bottom nav ── */}
            <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 flex justify-around items-center h-16 px-4 z-50">
                {MOBILE_NAV.map(({ to, label, icon, fill }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/student'}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-1 ${isActive ? 'text-[#003b73]' : 'text-slate-400'}`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontVariationSettings: isActive && fill ? "'FILL' 1" : "'FILL' 0" }}
                                >
                                    {icon}
                                </span>
                                <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                                    {label}
                                </span>
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </div>
    );
}
