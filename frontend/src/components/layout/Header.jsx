/**
 * Header Component
 * Top bar with search, notifications, theme toggle, and user info
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { notificationsAPI } from '../../services/api';
import {
    HiOutlineBell, HiOutlineSun, HiOutlineMoon,
    HiOutlineBars3, HiOutlineMagnifyingGlass
} from 'react-icons/hi2';

const Header = ({ onMobileToggle }) => {
    const { user } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const res = await notificationsAPI.getAll({ limit: 1 });
            setUnreadCount(res.data.data.unreadCount || 0);
        } catch (err) {
            // Silent fail for header notification count
        }
    };

    return (
        <header className="app-header">
            {/* Left: Mobile menu + Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Mobile hamburger — only visible below lg */}
                <button
                    onClick={onMobileToggle}
                    className="btn-icon btn-secondary"
                    style={{ display: 'none' }}
                    id="mobile-menu-btn"
                >
                    <HiOutlineBars3 style={{ width: 20, height: 20 }} />
                </button>
                <style>{`
                    @media (max-width: 1023px) {
                        #mobile-menu-btn { display: inline-flex !important; }
                    }
                `}</style>

                {/* Search bar — hidden on small mobile */}
                <div style={{ position: 'relative' }} className="header-search-container">
                    <HiOutlineMagnifyingGlass
                        style={{
                            position: 'absolute',
                            left: 12,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 16,
                            height: 16,
                            color: 'var(--text-muted)',
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Search books, students..."
                        className="input-field"
                        style={{ paddingLeft: 40, width: 256 }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.target.value) {
                                navigate(`/books?search=${e.target.value}`);
                            }
                        }}
                    />
                </div>
                <style>{`
                    @media (max-width: 639px) {
                        .header-search-container { display: none; }
                    }
                `}</style>
            </div>

            {/* Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="btn-icon btn-secondary"
                    title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    style={{ position: 'relative' }}
                >
                    {isDark ? (
                        <HiOutlineSun style={{ width: 20, height: 20, color: '#fbbf24' }} />
                    ) : (
                        <HiOutlineMoon style={{ width: 20, height: 20, color: '#6366f1' }} />
                    )}
                </button>

                {/* Notifications */}
                <button
                    onClick={() => navigate('/notifications')}
                    className="btn-icon btn-secondary"
                    title="Notifications"
                    style={{ position: 'relative' }}
                >
                    <HiOutlineBell style={{ width: 20, height: 20 }} />
                    {unreadCount > 0 && (
                        <span className="notification-dot" />
                    )}
                </button>

                {/* User Avatar */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        paddingLeft: 12,
                        borderLeft: '1px solid var(--border-color)',
                    }}
                >
                    <div
                        className="gradient-primary"
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <span style={{ color: 'white', fontWeight: 600, fontSize: '0.875rem' }}>
                            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                        </span>
                    </div>
                    <div className="header-user-info">
                        <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {user?.name || 'Admin'}
                        </p>
                        <p style={{ fontSize: '0.75rem', textTransform: 'capitalize', color: 'var(--text-muted)' }}>
                            {user?.role || 'admin'}
                        </p>
                    </div>
                    <style>{`
                        @media (max-width: 767px) {
                            .header-user-info { display: none; }
                        }
                    `}</style>
                </div>
            </div>
        </header>
    );
};

export default Header;
