import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'aztech-auth';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const { user: savedUser, token: savedToken } = JSON.parse(stored);
                setUser(savedUser);
                setToken(savedToken);
                axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
            } catch {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
        setLoading(false);
    }, []);

    // Interceptors for robust auth handling
    useEffect(() => {
        const requestInterceptor = axios.interceptors.request.use(
            (config) => {
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        const responseInterceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    logout();
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, [token]);

    const login = async (email: string, password: string) => {
        const res = await axios.post('/api/auth/login', { email, password });
        const { token: newToken, user: newUser } = res.data;

        setUser(newUser);
        setToken(newToken);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: newUser, token: newToken }));
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem(STORAGE_KEY);
        delete axios.defaults.headers.common['Authorization'];

        // Use a slight delay for redirect to allow extension/background processes to settle
        // This helps prevent the "message channel closed" console error
        setTimeout(() => {
            if (window.location.pathname !== '/login') {
                navigate('/login', { replace: true });
            }
        }, 100);
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
