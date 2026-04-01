import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function DashboardPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;
        if (user.role === 'STUDENT') {
            navigate('/student', { replace: true });
        } else if (user.role === 'OFFICER') {
            navigate('/admin/docs/new', { replace: true });
        } else {
            // SYS_ADMIN, SIGNER
            navigate('/admin/pending', { replace: true });
        }
    }, [user, navigate]);

    return (
        <div className="flex h-full items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#003b73] border-t-transparent" />
        </div>
    );
}
