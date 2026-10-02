/**
 * Sidebar Navigation Component
 * Main navigation for the dashboard layout
 */

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    HiOutlineHome, HiOutlineBookOpen, HiOutlineAcademicCap,
    HiOutlineArrowsRightLeft, HiOutlineQrCode, HiOutlineBell,
    HiOutlineArrowRightOnRectangle, HiOutlineChevronLeft,
    HiOutlineChevronRight, HiOutlineCog6Tooth, HiOutlineCircleStack,
    HiOutlineQueueList, HiOutlineShieldCheck
} from 'react-icons/hi2';

const navItems = [
    { path: '/', icon: HiOutlineHome, label: 'Dashboard' },
    { path: '/books', icon: HiOutlineBookOpen, label: 'Books' },
    { path: '/students', icon: HiOutlineAcademicCap, label: 'Students' },
    { path: '/transactions', icon: HiOutlineArrowsRightLeft, label: 'Transactions' },
    { path: '/scanner', icon: HiOutlineQrCode, label: 'Smart Scanner' },
    { path: '/reservations', icon: HiOutlineQueueList, label: 'Reservations' },
    { path: '/audit', icon: HiOutlineShieldCheck, label: 'Audit Trail' },
    { path: '/mongodb-atlas', icon: HiOutlineCircleStack, label: 'Library Data Engine' },
    { path: '/notifications', icon: HiOutlineBell, label: 'Notifications' },
    { path: '/settings', icon: HiOutlineCog6Tooth, label: 'Settings' },
];

const Sidebar = ({ collapsed, onToggle }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const sidebarWidth = collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)';

    return (
        <aside
            className="sidebar"
            style={{ width: sidebarWidth }}
        >
            {/* Logo Area */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: collapsed ? '24px 16px' : '24px 20px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    minHeight: 76,
                }}
            >
                <div
                    className="gradient-primary"
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                    }}
                >
                    <span style={{ color: 'white', fontWeight: 700, fontSize: '1.125rem' }}>E</span>
                </div>
                {!collapsed && (
                    <div className="animate-fade-in">
                        <h1 style={{ color: 'white', fontWeight: 700, fontSize: '1.125rem', letterSpacing: '0.05em' }}>
                            ELVORA
                        </h1>
                        <p style={{ color: '#a5b4fc', fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            Smart Library
                        </p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav
                style={{
                    flex: 1,
                    padding: '16px 12px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                }}
            >
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/'}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? 'active' : ''}`
                        }
                        style={collapsed ? { justifyContent: 'center', padding: '12px' } : {}}
                        title={collapsed ? item.label : undefined}
                    >
                        <item.icon style={{ width: 20, height: 20, flexShrink: 0 }} />
                        {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* User Profile & Logout */}
            <div
                style={{
                    padding: '16px 12px',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}
            >
                {!collapsed && user && (
                    <div className="animate-fade-in" style={{ padding: '8px 12px' }}>
                        <p style={{
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}>
                            {user.name}
                        </p>
                        <p style={{ color: '#a5b4fc', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                            {user.role}
                        </p>
                    </div>
                )}

                <button
                    onClick={handleLogout}
                    className="sidebar-link"
                    style={{
                        width: '100%',
                        color: '#fca5a5',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        ...(collapsed ? { justifyContent: 'center', padding: '12px' } : {}),
                    }}
                    title="Logout"
                >
                    <HiOutlineArrowRightOnRectangle style={{ width: 20, height: 20, flexShrink: 0 }} />
                    {!collapsed && <span>Logout</span>}
                </button>

                {/* Collapse Toggle */}
                <button
                    onClick={onToggle}
                    className="sidebar-link"
                    style={{
                        width: '100%',
                        color: '#a5b4fc',
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        ...(collapsed ? { justifyContent: 'center', padding: '12px' } : {}),
                    }}
                    title={collapsed ? 'Expand' : 'Collapse'}
                >
                    {collapsed ? (
                        <HiOutlineChevronRight style={{ width: 20, height: 20 }} />
                    ) : (
                        <>
                            <HiOutlineChevronLeft style={{ width: 20, height: 20 }} />
                            <span>Collapse</span>
                        </>
                    )}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
