/**
 * Audit Trail Page — Enhanced
 * Comprehensive system activity log with real-time updates,
 * rich filtering, animated stats, and timeline view.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { auditAPI, connectSSE } from '../services/api';
import toast from 'react-hot-toast';
import {
    HiOutlineShieldCheck, HiOutlineFunnel, HiOutlineArrowPath,
    HiOutlineBookOpen, HiOutlineUser, HiOutlineQrCode,
    HiOutlineArrowsRightLeft, HiOutlineCalendar, HiOutlineChevronLeft,
    HiOutlineChevronRight, HiOutlineSignal, HiOutlineClock,
    HiOutlineAcademicCap, HiOutlineDocumentText, HiOutlineExclamationTriangle,
    HiOutlineMagnifyingGlass
} from 'react-icons/hi2';

const actionIcons = {
    book_issued:            { icon: '📗', color: '#10b981', label: 'Book Issued' },
    book_returned:          { icon: '📘', color: '#3b82f6', label: 'Book Returned' },
    book_reserved:          { icon: '📙', color: '#f59e0b', label: 'Book Reserved' },
    book_created:           { icon: '📕', color: '#8b5cf6', label: 'Book Created' },
    book_updated:           { icon: '✏️', color: '#6366f1', label: 'Book Updated' },
    book_deleted:           { icon: '🗑️', color: '#ef4444', label: 'Book Deleted' },
    scan_processed:         { icon: '📡', color: '#06b6d4', label: 'Scan Processed' },
    qr_generated:           { icon: '🔲', color: '#8b5cf6', label: 'QR Generated' },
    qr_rotated:             { icon: '🔄', color: '#ec4899', label: 'QR Rotated' },
    user_login:             { icon: '🔐', color: '#22c55e', label: 'User Login' },
    user_logout:            { icon: '🔓', color: '#6b7280', label: 'User Logout' },
    reservation_cancelled:  { icon: '❌', color: '#ef4444', label: 'Reservation Cancelled' },
    reservation_fulfilled:  { icon: '✅', color: '#10b981', label: 'Reservation Fulfilled' },
    reservation_expired:    { icon: '⏰', color: '#f59e0b', label: 'Reservation Expired' },
    overdue_flagged:        { icon: '⚠️', color: '#f59e0b', label: 'Overdue Flagged' },
    fine_calculated:        { icon: '💰', color: '#eab308', label: 'Fine Calculated' },
    fine_paid:              { icon: '💳', color: '#10b981', label: 'Fine Paid' },
    student_created:        { icon: '🎓', color: '#8b5cf6', label: 'Student Created' },
    student_updated:        { icon: '📝', color: '#6366f1', label: 'Student Updated' },
    student_deleted:        { icon: '🗑️', color: '#ef4444', label: 'Student Deleted' },
};

/* ── Skeleton row ──────────────────────────────────────────────── */
const SkeletonRow = () => (
    <tr>
        {Array.from({ length: 5 }).map((_, i) => (
            <td key={i} style={{ padding: '16px' }}>
                <div style={{
                    height: 14, borderRadius: 6,
                    background: 'var(--bg-tertiary)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    width: i === 0 ? '120px' : i === 4 ? '80%' : '65%',
                }} />
            </td>
        ))}
    </tr>
);

/* ── Stat Card ─────────────────────────────────────────────────── */
const AuditStatCard = ({ icon, label, value, color, trend }) => (
    <div className="glass-card" style={{
        padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: `3px solid ${color}`,
        transition: 'transform 0.2s, box-shadow 0.2s',
    }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
        <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.3rem',
        }}>
            {icon}
        </div>
        <div style={{ flex: 1 }}>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{value ?? 0}</p>
            <p style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
        </div>
        {trend && (
            <span style={{
                fontSize: '0.7rem', fontWeight: 600, color,
                background: `${color}15`, padding: '3px 8px', borderRadius: 8,
            }}>
                {trend}
            </span>
        )}
    </div>
);

/* ── Timeline Item ─────────────────────────────────────────────── */
const TimelineItem = ({ log, formatDate, formatAction }) => {
    const conf = actionIcons[log.action] || { icon: '•', color: '#6b7280', label: log.action };
    return (
        <div style={{
            display: 'flex', gap: 16, padding: '16px 0',
            borderBottom: '1px solid var(--border-color)',
            transition: 'background 0.15s',
        }}>
            {/* Timeline dot */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
                <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${conf.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', border: `2px solid ${conf.color}30`,
                }}>
                    {conf.icon}
                </div>
                <div style={{ flex: 1, width: 2, background: 'var(--border-color)', marginTop: 8 }} />
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 16, fontSize: '0.72rem', fontWeight: 600,
                        background: `${conf.color}18`, color: conf.color,
                        border: `1px solid ${conf.color}25`,
                    }}>
                        {conf.icon} {formatAction(log.action)}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <HiOutlineClock style={{ width: 12, height: 12 }} />
                        {formatDate(log.createdAt)}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {log.actorName || log.actor?.name || 'System'}
                    </span>
                    <span style={{
                        fontSize: '0.7rem', fontWeight: 500, padding: '2px 8px', borderRadius: 6,
                        background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                        textTransform: 'capitalize',
                    }}>
                        {log.targetType}
                    </span>
                </div>

                {log.details && (
                    <div style={{
                        marginTop: 8, padding: '8px 12px', borderRadius: 8,
                        background: 'var(--bg-tertiary)', fontSize: '0.75rem',
                        color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: 8,
                    }}>
                        {log.details.bookTitle && <span>📚 {log.details.bookTitle}</span>}
                        {log.details.studentName && <span>• 🎓 {log.details.studentName}</span>}
                        {log.details.fineAmount > 0 && <span>• 💰 ₹{log.details.fineAmount}</span>}
                        {log.details.position && <span>• #️⃣ Position: {log.details.position}</span>}
                        {log.details.identifierType && <span>• 🔍 via {log.details.identifierType}</span>}
                        {log.details.transactionId && <span>• 📋 Txn: {log.details.transactionId}</span>}
                        {log.details.reservationId && <span>• 📌 Res: {log.details.reservationId}</span>}
                    </div>
                )}
            </div>
        </div>
    );
};

/* ── Main Page ─────────────────────────────────────────────────── */
const AuditTrailPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 30 });
    const [filters, setFilters] = useState({ action: '', targetType: '', startDate: '', endDate: '' });
    const [actionTypes, setActionTypes] = useState([]);
    const [stats, setStats] = useState(null);
    const [viewMode, setViewMode] = useState('table'); // 'table' | 'timeline'
    const [searchQuery, setSearchQuery] = useState('');
    const [sseConnected, setSseConnected] = useState(false);
    const sseRef = useRef(null);

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 30 };
            if (filters.action) params.action = filters.action;
            if (filters.targetType) params.targetType = filters.targetType;
            if (filters.startDate) params.startDate = filters.startDate;
            if (filters.endDate) params.endDate = filters.endDate;

            const res = await auditAPI.getLogs(params);
            setLogs(res.data.data.logs);
            setPagination(res.data.data.pagination);
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Failed to fetch audit logs');
        } finally { setLoading(false); }
    }, [filters]);

    useEffect(() => {
        fetchLogs(1);
        auditAPI.getActionTypes()
            .then(res => setActionTypes(res.data.data.actions))
            .catch(() => {});
        auditAPI.getStats()
            .then(res => setStats(res.data.data))
            .catch(() => {});
    }, [fetchLogs]);

    // SSE real-time
    useEffect(() => {
        const es = connectSSE(['all'], (event, data) => {
            if (event === 'connected') { setSseConnected(true); return; }
            if (event === 'error') { setSseConnected(false); return; }
            // Refresh on any transaction/reservation event (new audit log likely created)
            if (['transaction', 'reservation', 'book_updated'].includes(event)) {
                fetchLogs(pagination.page);
                auditAPI.getStats().then(res => setStats(res.data.data)).catch(() => {});
            }
        });
        sseRef.current = es;
        return () => { if (sseRef.current) sseRef.current.close(); };
    }, []);

    const formatDate = (d) => {
        if (!d) return '—';
        const date = new Date(d);
        return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatAction = (action) => action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    const handleClearFilters = () => {
        setFilters({ action: '', targetType: '', startDate: '', endDate: '' });
        setSearchQuery('');
    };

    // Client-side filter
    const filteredLogs = logs.filter(log => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            log.actorName?.toLowerCase().includes(q) ||
            log.actor?.name?.toLowerCase().includes(q) ||
            log.action?.toLowerCase().includes(q) ||
            log.targetType?.toLowerCase().includes(q) ||
            log.details?.bookTitle?.toLowerCase().includes(q) ||
            log.details?.studentName?.toLowerCase().includes(q)
        );
    });

    const hasActiveFilters = filters.action || filters.targetType || filters.startDate || filters.endDate || searchQuery;

    return (
        <div className="page-sections animate-fade-in">
            {/* ── Header ────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineShieldCheck style={{ width: 28, height: 28, color: '#8b5cf6' }} /> Audit Trail
                        {sseConnected && (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: '0.65rem', fontWeight: 600, color: '#10b981',
                                background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: 20,
                                marginLeft: 8, animation: 'pulse 2s infinite',
                            }}>
                                <HiOutlineSignal style={{ width: 12, height: 12 }} /> LIVE
                            </span>
                        )}
                    </h1>
                    <p style={{ fontSize: '0.875rem', marginTop: 4, color: 'var(--text-secondary)' }}>
                        Complete log of all system actions • {pagination.total} entries
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {/* View Toggle */}
                    <div style={{
                        display: 'flex', borderRadius: 10, overflow: 'hidden',
                        border: '1px solid var(--border-color)',
                    }}>
                        <button onClick={() => setViewMode('table')} style={{
                            padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                            background: viewMode === 'table' ? 'rgba(139,92,246,0.15)' : 'var(--bg-secondary)',
                            color: viewMode === 'table' ? '#8b5cf6' : 'var(--text-muted)',
                            transition: 'all 0.2s',
                        }}>
                            <HiOutlineDocumentText style={{ width: 14, height: 14 }} /> Table
                        </button>
                        <button onClick={() => setViewMode('timeline')} style={{
                            padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                            background: viewMode === 'timeline' ? 'rgba(139,92,246,0.15)' : 'var(--bg-secondary)',
                            color: viewMode === 'timeline' ? '#8b5cf6' : 'var(--text-muted)',
                            transition: 'all 0.2s',
                        }}>
                            <HiOutlineClock style={{ width: 14, height: 14 }} /> Timeline
                        </button>
                    </div>
                    <button onClick={() => { fetchLogs(1); auditAPI.getStats().then(res => setStats(res.data.data)).catch(() => {}); }}
                        className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HiOutlineArrowPath style={{ width: 16, height: 16 }} /> Refresh
                    </button>
                </div>
            </div>

            {/* ── Stats Cards ───────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <AuditStatCard icon="📊" label="Total Actions" value={stats?.totalLogs} color="#8b5cf6" />
                {stats?.actionBreakdown?.slice(0, 3).map(item => (
                    <AuditStatCard
                        key={item._id}
                        icon={actionIcons[item._id]?.icon || '•'}
                        label={actionIcons[item._id]?.label || formatAction(item._id)}
                        value={item.count}
                        color={actionIcons[item._id]?.color || '#6b7280'}
                    />
                ))}
            </div>

            {/* ── Filters ───────────────────────────────────────── */}
            <div className="glass-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <HiOutlineFunnel style={{ width: 16, height: 16, color: 'var(--text-muted)' }} />
                    <h3 style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Filters</h3>
                    {hasActiveFilters && (
                        <button onClick={handleClearFilters} style={{
                            marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '0.72rem', fontWeight: 600, color: '#ef4444',
                            display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                            Clear All
                        </button>
                    )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    {/* Search */}
                    <div style={{ position: 'relative', gridColumn: 'span 2' }}>
                        <HiOutlineMagnifyingGlass style={{
                            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                            width: 16, height: 16, color: 'var(--text-muted)',
                        }} />
                        <input
                            type="text" placeholder="Search by actor, action, details..." value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)} className="input-field"
                            style={{ paddingLeft: 36, fontSize: '0.8rem' }}
                        />
                    </div>
                    <select value={filters.action} onChange={e => setFilters(prev => ({ ...prev, action: e.target.value }))} className="input-field">
                        <option value="">All Actions</option>
                        {actionTypes.map(a => (
                            <option key={a} value={a}>{actionIcons[a]?.icon || '•'} {formatAction(a)}</option>
                        ))}
                    </select>
                    <select value={filters.targetType} onChange={e => setFilters(prev => ({ ...prev, targetType: e.target.value }))} className="input-field">
                        <option value="">All Target Types</option>
                        <option value="book">📚 Book</option>
                        <option value="student">🎓 Student</option>
                        <option value="transaction">📋 Transaction</option>
                        <option value="reservation">📌 Reservation</option>
                        <option value="user">👤 User</option>
                        <option value="system">⚙️ System</option>
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineCalendar style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }} />
                        <input type="date" value={filters.startDate} onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))} className="input-field" placeholder="Start" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineCalendar style={{ width: 16, height: 16, color: 'var(--text-muted)', flexShrink: 0 }} />
                        <input type="date" value={filters.endDate} onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))} className="input-field" placeholder="End" />
                    </div>
                </div>
            </div>

            {/* ── Audit Log Content ─────────────────────────────── */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    viewMode === 'table' ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={thStyle}>Time</th><th style={thStyle}>Action</th>
                                        <th style={thStyle}>Actor</th><th style={thStyle}>Target</th>
                                        <th style={thStyle}>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                            <div style={{
                                width: 32, height: 32, border: '3px solid var(--border-color)',
                                borderTopColor: '#8b5cf6', borderRadius: '50%',
                                animation: 'spin 1s linear infinite', margin: '0 auto 12px',
                            }} />
                            <p style={{ color: 'var(--text-muted)' }}>Loading audit logs...</p>
                        </div>
                    )
                ) : filteredLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: 24, margin: '0 auto 20px',
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.08))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <HiOutlineShieldCheck style={{ width: 40, height: 40, color: '#8b5cf6' }} />
                        </div>
                        <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                            {hasActiveFilters ? 'No matching logs found' : 'No audit logs yet'}
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 320, margin: '0 auto 16px' }}>
                            {hasActiveFilters
                                ? 'Try adjusting your filters or clear them to see all entries.'
                                : 'System actions will appear here as they occur — issue books, return them, and more.'}
                        </p>
                        {hasActiveFilters && (
                            <button onClick={handleClearFilters} className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                Clear Filters
                            </button>
                        )}
                    </div>
                ) : viewMode === 'timeline' ? (
                    /* ── Timeline View ──────────────────────────── */
                    <div style={{ padding: '16px 24px', maxHeight: 600, overflowY: 'auto' }}>
                        {filteredLogs.map(log => (
                            <TimelineItem key={log._id} log={log} formatDate={formatDate} formatAction={formatAction} />
                        ))}
                    </div>
                ) : (
                    /* ── Table View ─────────────────────────────── */
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={thStyle}>Time</th>
                                    <th style={thStyle}>Action</th>
                                    <th style={thStyle}>Actor</th>
                                    <th style={thStyle}>Target</th>
                                    <th style={thStyle}>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map(log => {
                                    const conf = actionIcons[log.action] || { icon: '•', color: '#6b7280' };
                                    return (
                                        <tr key={log._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }} className="table-row-hover">
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <HiOutlineClock style={{ width: 13, height: 13, color: 'var(--text-muted)', flexShrink: 0 }} />
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                        {formatDate(log.createdAt)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                                    padding: '4px 12px', borderRadius: 16, fontSize: '0.75rem', fontWeight: 600,
                                                    background: `${conf.color}18`, color: conf.color,
                                                    border: `1px solid ${conf.color}25`,
                                                }}>
                                                    {conf.icon} {formatAction(log.action)}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{
                                                        width: 28, height: 28, borderRadius: 8,
                                                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: 'white', fontWeight: 700, fontSize: '0.65rem', flexShrink: 0,
                                                    }}>
                                                        {(log.actorName || log.actor?.name || 'S').charAt(0)}
                                                    </div>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                                        {log.actorName || log.actor?.name || 'System'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    fontSize: '0.72rem', fontWeight: 600,
                                                    padding: '3px 10px', borderRadius: 8,
                                                    background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
                                                    textTransform: 'capitalize',
                                                }}>
                                                    {log.targetType}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                {log.details && (
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 340, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                        {log.details.bookTitle && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--bg-tertiary)' }}>📚 {log.details.bookTitle}</span>}
                                                        {log.details.studentName && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--bg-tertiary)' }}>🎓 {log.details.studentName}</span>}
                                                        {log.details.fineAmount > 0 && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'rgba(234,179,8,0.1)' }}>💰 ₹{log.details.fineAmount}</span>}
                                                        {log.details.position && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--bg-tertiary)' }}>#️⃣ Pos: {log.details.position}</span>}
                                                        {log.details.identifierType && <span style={{ padding: '2px 6px', borderRadius: 4, background: 'var(--bg-tertiary)' }}>🔍 {log.details.identifierType}</span>}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: 12, padding: 16, borderTop: '1px solid var(--border-color)',
                    }}>
                        <button onClick={() => fetchLogs(pagination.page - 1)} disabled={pagination.page <= 1} className="btn btn-secondary btn-sm">
                            <HiOutlineChevronLeft style={{ width: 16, height: 16 }} />
                        </button>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Page {pagination.page} of {pagination.pages}
                        </span>
                        <button onClick={() => fetchLogs(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="btn btn-secondary btn-sm">
                            <HiOutlineChevronRight style={{ width: 16, height: 16 }} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const thStyle = { textAlign: 'left', padding: '14px 16px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', background: 'var(--bg-tertiary)' };
const tdStyle = { padding: '14px 16px', verticalAlign: 'middle' };

export default AuditTrailPage;
