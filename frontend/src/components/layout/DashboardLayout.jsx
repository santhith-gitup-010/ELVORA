/**
 * Dashboard Layout
 * Wraps authenticated pages with Sidebar + Header
 * Uses CSS-driven layout system for proper alignment and responsiveness
 */

import { useState, useEffect, useCallback } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';

const DashboardLayout = () => {
    const { isAuthenticated, loading } = useAuth();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(
        typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
    );

    // Track screen size changes for responsive behavior
    useEffect(() => {
        const handleResize = () => {
            const desktop = window.innerWidth >= 1024;
            setIsDesktop(desktop);
            if (desktop) {
                setMobileOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close mobile sidebar when route changes
    const closeMobileSidebar = useCallback(() => {
        setMobileOpen(false);
    }, []);

    if (loading) {
        return (
            <div
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-primary)',
                }}
            >
                <div style={{ textAlign: 'center' }}>
                    <div
                        className="gradient-primary"
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 16,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px',
                            animation: 'pulse-glow 2s infinite',
                        }}
                    >
                        <span style={{ color: 'white', fontWeight: 700, fontSize: '1.5rem' }}>E</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)' }}>Loading ELVORA...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="dashboard-layout">
            {/* Mobile Overlay */}
            {mobileOpen && !isDesktop && (
                <div
                    className="mobile-overlay"
                    onClick={closeMobileSidebar}
                />
            )}

            {/* Sidebar — Desktop (always visible) */}
            {isDesktop && (
                <div style={{ flexShrink: 0 }}>
                    <Sidebar
                        collapsed={sidebarCollapsed}
                        onToggle={() => setSidebarCollapsed((prev) => !prev)}
                    />
                </div>
            )}

            {/* Sidebar — Mobile (slide in/out) */}
            {!isDesktop && (
                <div className={`mobile-sidebar-wrapper ${mobileOpen ? 'open' : 'closed'}`}>
                    <Sidebar
                        collapsed={false}
                        onToggle={closeMobileSidebar}
                    />
                </div>
            )}

            {/* Main Content Area */}
            <div
                className={`main-content-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
                style={
                    isDesktop
                        ? { marginLeft: sidebarCollapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)' }
                        : { marginLeft: 0 }
                }
            >
                <Header onMobileToggle={() => setMobileOpen((prev) => !prev)} />

                <main className="page-content">
                    <Outlet />
                </main>

                {/* Footer */}
                <footer className="app-footer">
                    © 2024 ELVORA Smart Library Management System. All rights reserved.
                </footer>
            </div>
        </div>
    );
};

export default DashboardLayout;
