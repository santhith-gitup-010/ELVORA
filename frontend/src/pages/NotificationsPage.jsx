import { useState, useEffect } from 'react';
import { notificationsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { HiOutlineBell, HiOutlineCheckCircle, HiOutlineTrash, HiOutlineExclamationTriangle, HiOutlineBanknotes, HiOutlineCog6Tooth, HiOutlineArrowUturnLeft } from 'react-icons/hi2';

const iconMap = {
    due_reminder: HiOutlineBell,
    overdue: HiOutlineExclamationTriangle,
    fine: HiOutlineBanknotes,
    system: HiOutlineCog6Tooth,
    return: HiOutlineArrowUturnLeft,
};

const colorMap = {
    due_reminder: '#3b82f6',
    overdue: '#ef4444',
    fine: '#f59e0b',
    system: '#6366f1',
    return: '#10b981',
};

const NotificationsPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => { fetchNotifications(); }, []);

    const fetchNotifications = async () => {
        try {
            const res = await notificationsAPI.getAll({ limit: 50 });
            setNotifications(res.data.data.notifications);
            setUnreadCount(res.data.data.unreadCount);
        } catch { toast.error('Failed to load notifications'); } finally { setLoading(false); }
    };

    const markRead = async (id) => {
        try { await notificationsAPI.markAsRead(id); fetchNotifications(); } catch { }
    };

    const markAllRead = async () => {
        try { await notificationsAPI.markAllAsRead(); toast.success('All marked as read'); fetchNotifications(); } catch { }
    };

    const deleteNotif = async (id) => {
        try { await notificationsAPI.delete(id); fetchNotifications(); } catch { }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="page-sections animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineBell style={{ width: 28, height: 28, color: '#f59e0b' }} /> Notifications
                    </h1>
                    <p style={{ fontSize: '0.875rem', marginTop: 4, color: 'var(--text-secondary)' }}>{unreadCount} unread notifications</p>
                </div>
                {unreadCount > 0 && (
                    <button onClick={markAllRead} className="btn btn-secondary">
                        <HiOutlineCheckCircle style={{ width: 16, height: 16 }} /> Mark All Read
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {notifications.length > 0 ? notifications.map(n => {
                    const Icon = iconMap[n.type] || HiOutlineBell;
                    const color = colorMap[n.type] || '#6366f1';
                    return (
                        <div
                            key={n._id}
                            className="glass-card notification-card"
                            style={{
                                padding: 16,
                                borderLeft: !n.isRead ? `4px solid ${color}` : '4px solid transparent',
                                cursor: !n.isRead ? 'pointer' : 'default',
                            }}
                            onClick={() => !n.isRead && markRead(n._id)}
                        >
                            <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: `${color}15` }}>
                                <Icon style={{ width: 20, height: 20, color }} />
                            </div>
                            <div className="notif-body">
                                <div className="notif-meta">
                                    <p style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{n.title}</p>
                                    {!n.isRead && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />}
                                    <span
                                        className={`badge ${n.priority === 'high' ? 'badge-overdue' : n.priority === 'medium' ? 'badge-issued' : 'badge-returned'}`}
                                        style={{ marginLeft: 'auto', fontSize: '10px' }}
                                    >
                                        {n.priority}
                                    </span>
                                </div>
                                <p style={{ fontSize: '0.875rem', marginTop: 4, color: 'var(--text-secondary)' }}>{n.message}</p>
                                <p style={{ fontSize: '0.75rem', marginTop: 8, color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleString()}</p>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteNotif(n._id); }}
                                className="btn-icon btn-secondary"
                                style={{ flexShrink: 0, color: '#f87171' }}
                                title="Delete"
                            >
                                <HiOutlineTrash style={{ width: 16, height: 16 }} />
                            </button>
                        </div>
                    );
                }) : (
                    <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
                        <HiOutlineBell style={{ width: 64, height: 64, margin: '0 auto 16px', color: 'var(--text-muted)' }} />
                        <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>No notifications</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>You're all caught up!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
