/**
 * Login Page
 * Professional login screen with gradient background
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { HiOutlineEnvelope, HiOutlineLockClosed, HiOutlineEye, HiOutlineEyeSlash } from 'react-icons/hi2';

const LoginPage = () => {
    const { login } = useAuth();
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            toast.success('Welcome to ELVORA!');
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                position: 'relative',
                overflow: 'hidden',
                background: isDark
                    ? 'linear-gradient(135deg, #0f0d1a 0%, #1a1145 30%, #0d0b15 70%, #1e1b4b 100%)'
                    : 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 30%, #f8fafc 70%, #e0e7ff 100%)'
            }}
        >
            {/* Decorative circles */}
            <div style={{
                position: 'absolute', top: -100, right: -100, width: 400, height: 400,
                borderRadius: '50%', opacity: 0.2,
                background: 'radial-gradient(circle, #6366f1, transparent)'
            }} />
            <div style={{
                position: 'absolute', bottom: -150, left: -150, width: 500, height: 500,
                borderRadius: '50%', opacity: 0.15,
                background: 'radial-gradient(circle, #06b6d4, transparent)'
            }} />

            <div className="animate-scale-in" style={{ width: '100%', maxWidth: 448 }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div className="gradient-primary" style={{
                        width: 80, height: 80, borderRadius: 16, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', margin: '0 auto 16px',
                        boxShadow: '0 8px 32px rgba(99,102,241,0.25)'
                    }}>
                        <span style={{ color: 'white', fontWeight: 700, fontSize: '1.875rem' }}>E</span>
                    </div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>ELVORA</h1>
                    <p style={{
                        fontSize: '0.875rem', marginTop: 4, letterSpacing: '0.1em',
                        textTransform: 'uppercase', fontWeight: 500, color: 'var(--text-muted)'
                    }}>
                        Smart Library System
                    </p>
                </div>

                {/* Login Card */}
                <div className="glass-card" style={{ padding: 32 }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>
                        Welcome back
                    </h2>
                    <p style={{ fontSize: '0.875rem', marginBottom: 24, color: 'var(--text-secondary)' }}>
                        Sign in to your admin account
                    </p>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Email */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 8, color: 'var(--text-secondary)' }}>
                                Email Address
                            </label>
                            <div style={{ position: 'relative' }}>
                                <HiOutlineEnvelope style={{
                                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                                    width: 20, height: 20, color: 'var(--text-muted)'
                                }} />
                                <input
                                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@elvora.com" className="input-field"
                                    style={{ paddingLeft: 44 }} autoFocus
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 8, color: 'var(--text-secondary)' }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <HiOutlineLockClosed style={{
                                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                                    width: 20, height: 20, color: 'var(--text-muted)'
                                }} />
                                <input
                                    type={showPass ? 'text' : 'password'} value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password" className="input-field"
                                    style={{ paddingLeft: 44, paddingRight: 44 }}
                                />
                                <button
                                    type="button" onClick={() => setShowPass(prev => !prev)}
                                    style={{
                                        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                                        color: 'var(--text-muted)', background: 'none', border: 'none',
                                        cursor: 'pointer', padding: 0
                                    }}
                                >
                                    {showPass ? <HiOutlineEyeSlash style={{ width: 20, height: 20 }} /> : <HiOutlineEye style={{ width: 20, height: 20 }} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', height: 48, fontSize: '1rem' }}>
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite',
                                        display: 'inline-block'
                                    }} />
                                    Signing in...
                                </span>
                            ) : 'Sign In'}
                        </button>
                    </form>

                    {/* Demo Credentials */}
                    <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: 'var(--bg-tertiary)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>
                            Demo Credentials:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            <p><span style={{ fontWeight: 500 }}>Admin:</span> admin@elvora.com / admin123</p>
                            <p><span style={{ fontWeight: 500 }}>Librarian:</span> librarian@elvora.com / lib123</p>
                        </div>
                    </div>
                </div>

                <p style={{ textAlign: 'center', fontSize: '0.75rem', marginTop: 24, color: 'var(--text-muted)' }}>
                    ELVORA Smart Library Management System © 2024
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
