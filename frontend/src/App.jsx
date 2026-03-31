import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ui/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';

import LoginPage           from './pages/admin/LoginPage';
import DashboardPage       from './pages/admin/DashboardPage';
import DocsListPage        from './pages/admin/DocsListPage';
import CreateDraftPage     from './pages/admin/CreateDraftPage';
import DocDetailPage       from './pages/admin/DocDetailPage';
import VerifyPage          from './pages/admin/VerifyPage';
import PendingApprovalPage from './pages/admin/PendingApprovalPage';

export default function App() {
    return (
        <AuthProvider>
            <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
            <BrowserRouter>
                <Routes>
                    {/* Public */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Admin — cần đăng nhập */}
                    <Route path="/admin" element={
                        <ProtectedRoute>
                            <AdminLayout />
                        </ProtectedRoute>
                    }>
                        {/* Index: redirect ngay theo role */}
                        <Route index element={<DashboardPage />} />

                        {/* OFFICER: tạo bản nháp */}
                        <Route path="docs/new" element={
                            <ProtectedRoute roles={['OFFICER']}>
                                <CreateDraftPage />
                            </ProtectedRoute>
                        } />

                        {/* SYS_ADMIN / SIGNER: danh sách chờ ký */}
                        <Route path="pending" element={
                            <ProtectedRoute roles={['SYS_ADMIN', 'SIGNER']}>
                                <PendingApprovalPage />
                            </ProtectedRoute>
                        } />

                        <Route path="docs" element={<DocsListPage />} />
                        <Route path="docs/:id" element={<DocDetailPage />} />
                        <Route path="verify" element={<VerifyPage />} />
                    </Route>

                    {/* Redirect gốc */}
                    <Route path="/" element={<Navigate to="/admin" replace />} />
                    <Route path="*" element={<Navigate to="/admin" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
