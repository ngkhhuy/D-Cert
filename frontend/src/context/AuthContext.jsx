import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { setLoading(false); return; }

        api.get('/users/me')
            .then((res) => {
                const profile = res.data?.data || res.data?.user || null;
                setUser(profile);
            })
            .catch(() => localStorage.removeItem('token'))
            .finally(() => setLoading(false));
    }, []);

    const login = async (username, password) => {
        const res = await api.post('/auth/login', { username, password });
        const token = res.data?.token;
        const profile = res.data?.data || res.data?.user || null;

        if (!token || !profile) {
            throw new Error('Phan hoi dang nhap khong hop le');
        }

        localStorage.setItem('token', token);
        setUser(profile);
        return profile;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
