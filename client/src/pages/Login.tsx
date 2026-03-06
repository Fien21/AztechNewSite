import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, Monitor } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            // Re-fetch user since AuthProvider state might not have updated yet in this tick
            const stored = localStorage.getItem('aztech-auth');
            if (stored) {
                const { user } = JSON.parse(stored);
                if (user.role === 'USER') {
                    navigate('/price-check');
                } else {
                    navigate('/');
                }
            } else {
                navigate('/');
            }
        } catch (err: any) {
            Swal.fire({
                icon: 'error',
                title: 'Login Failed',
                text: err.response?.data?.error || 'Invalid credentials',
                background: '#132743',
                color: '#e8ecf4',
                confirmButtonColor: '#2563eb',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-bg-effects">
                <div className="orb orb-1" />
                <div className="orb orb-2" />
                <div className="orb orb-3" />
            </div>

            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">
                        <Monitor size={32} />
                    </div>
                    <h1>AZTECH</h1>
                    <p>Inventory & POS System</p>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <Mail size={18} className="input-icon" />
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <Lock size={18} className="input-icon" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button className="login-btn" type="submit" disabled={loading}>
                        {loading ? (
                            <span className="spinner-small" />
                        ) : (
                            <>
                                <LogIn size={18} /> Sign In
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    AZTECH Computer Enterprises Inc.
                </div>
            </div>
        </div>
    );
}
