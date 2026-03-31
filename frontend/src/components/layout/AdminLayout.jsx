import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Nav items theo role
const OFFICER_NAV = [
    { to: '/admin/docs/new',  label: 'Create Draft',      icon: 'edit_document' },
    { to: '/admin/docs',      label: 'History',            icon: 'history' },
    { to: '/admin/verify',    label: 'Xác thực',           icon: 'verified_user' },
];

const ADMIN_NAV = [
    { to: '/admin/pending',   label: 'Pending Approval',   icon: 'pending_actions' },
    { to: '/admin/docs',      label: 'All Documents',      icon: 'folder_open' },
    { to: '/admin/verify',    label: 'Xác thực',           icon: 'verified_user' },
];

const ROLE_LABEL = {
    SYS_ADMIN: 'Quản trị viên',
    OFFICER: 'Cán bộ nhập liệu',
    SIGNER: 'Ban Giám Hiệu',
};

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const handleLogout = () => { logout(); navigate('/login'); };

    const navItems = user?.role === 'OFFICER' ? OFFICER_NAV : ADMIN_NAV;
    const homeRoute = user?.role === 'OFFICER' ? '/admin/docs/new' : '/admin/pending';
    const dashboardLabel = user?.role === 'OFFICER' ? 'Staff Dashboard' : 'Admin Dashboard';

    return (
        <div className="flex h-screen bg-[#f7f9fb] overflow-hidden">
            {/* ── Sidebar ── */}
            <aside className="w-64 bg-[#00529C] h-screen fixed left-0 top-0 flex flex-col py-6 shadow-2xl shadow-blue-900/20 z-50 overflow-y-auto">
                {/* Logo */}
                <div className="px-6 mb-8 cursor-pointer" onClick={() => navigate(homeRoute)}>
                    <h1 className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                        DUT D-Cert
                    </h1>
                    <p className="text-sm text-blue-100/70 mt-0.5">{dashboardLabel}</p>
                </div>

                {/* Nav */}
                <nav className="flex-grow space-y-1 px-2">
                    {navItems.map(({ to, label, icon, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-sm ` +
                                (isActive
                                    ? 'bg-[#003b73] text-white font-semibold'
                                    : 'text-blue-100/80 hover:bg-white/10')
                            }
                        >
                            <span className="material-symbols-outlined text-[20px]">{icon}</span>
                            {label}
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom */}
                <div className="px-4 mt-auto space-y-1">
                    {user?.role === 'OFFICER' && (
                        <button
                            onClick={() => navigate('/admin/docs/new')}
                            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 mb-4 transition-colors text-sm"
                            style={{ fontFamily: 'Manrope, sans-serif' }}
                        >
                            <span className="material-symbols-outlined text-[20px]">add_circle</span>
                            New Certificate
                        </button>
                    )}
                    <button className="flex items-center gap-3 px-4 py-3 text-blue-100/80 hover:bg-white/10 rounded-lg transition-all w-full text-sm">
                        <span className="material-symbols-outlined text-[20px]">settings</span>
                        Settings
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 text-blue-100/80 hover:bg-white/10 rounded-lg transition-all w-full text-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        Logout
                    </button>
                </div>
            </aside>

            {/* ── Right: Topbar + Content ── */}
            <div className="ml-64 flex flex-col flex-1 overflow-hidden">
                {/* Topbar */}
                <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-40">
                    <div className="flex justify-between items-center px-8 py-4">
                        <div className="relative max-w-xl w-full">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                            <input
                                className="w-full pl-10 pr-4 py-2 bg-[#f2f4f6] border-none rounded-full focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                                placeholder="Tìm kiếm hồ sơ, chứng chỉ..."
                            />
                        </div>
                        <div className="flex items-center gap-6 ml-8">
                            <div className="flex items-center gap-1">
                                <button className="p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors relative">
                                    <span className="material-symbols-outlined text-[22px]">notifications</span>
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                                </button>
                                <button className="p-2 text-gray-500 hover:bg-gray-50 rounded-full transition-colors">
                                    <span className="material-symbols-outlined text-[22px]">help</span>
                                </button>
                            </div>
                            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-[#003b73]">{user?.fullName || user?.username}</p>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                                        {ROLE_LABEL[user?.role] || user?.role}
                                    </p>
                                </div>
                                {/* Role badge avatar */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                    user?.role === 'OFFICER' ? 'bg-[#00529C]' : 'bg-[#893b01]'
                                }`}>
                                    {(user?.fullName || user?.username || 'A').charAt(0).toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

