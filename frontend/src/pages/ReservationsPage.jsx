/**
 * Reservations Page — Enhanced
 * Full-featured reservation queue with create, search, filter, cancel,
 * real-time SSE updates, and rich visual design.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { reservationsAPI, booksAPI, studentsAPI, connectSSE } from '../services/api';
import toast from 'react-hot-toast';
import {
    HiOutlineQueueList, HiOutlineArrowPath, HiOutlineXMark,
    HiOutlineCheckCircle, HiOutlineClock, HiOutlineExclamationTriangle,
    HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlinePlusCircle,
    HiOutlineMagnifyingGlass, HiOutlineBookOpen, HiOutlineAcademicCap,
    HiOutlineFunnel, HiOutlineSignal, HiOutlineCalendar
} from 'react-icons/hi2';

const statusConfig = {
    pending:   { label: 'Pending',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: HiOutlineClock },
    ready:     { label: 'Ready',     color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: HiOutlineCheckCircle },
    fulfilled: { label: 'Fulfilled', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: HiOutlineCheckCircle },
    cancelled: { label: 'Cancelled', color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: HiOutlineXMark },
    expired:   { label: 'Expired',   color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: HiOutlineExclamationTriangle },
};

/* ── Skeleton row placeholder ──────────────────────────────────── */
const SkeletonRow = () => (
    <tr>
        {Array.from({ length: 8 }).map((_, i) => (
            <td key={i} style={{ padding: '14px 16px' }}>
                <div style={{
                    height: 14, borderRadius: 6,
                    background: 'var(--bg-tertiary)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                    width: i === 1 ? '80%' : i === 7 ? '60px' : '65%',
                }} />
            </td>
        ))}
    </tr>
);

/* ── Create Reservation Modal ──────────────────────────────────── */
const CreateReservationModal = ({ onClose, onCreated }) => {
    const [books, setBooks] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedBook, setSelectedBook] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [autoIssue, setAutoIssue] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [bookSearch, setBookSearch] = useState('');
    const [studentSearch, setStudentSearch] = useState('');

    useEffect(() => {
        const load = async () => {
            try {
                const [bRes, sRes] = await Promise.all([
                    booksAPI.getAll({ limit: 100 }),
                    studentsAPI.getAll({ limit: 100 }),
                ]);
                setBooks(bRes.data.data.books || []);
                setStudents(sRes.data.data.students || []);
            } catch { toast.error('Failed to load books/students'); }
            finally { setLoadingData(false); }
        };
        load();
    }, []);

    const filteredBooks = books.filter(b =>
        b.title?.toLowerCase().includes(bookSearch.toLowerCase()) ||
        b.barcode?.toLowerCase().includes(bookSearch.toLowerCase())
    );
    const filteredStudents = students.filter(s =>
        s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.studentId?.toLowerCase().includes(studentSearch.toLowerCase())
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBook || !selectedStudent) { toast.error('Select both a book and a student'); return; }
        setSubmitting(true);
        try {
            await booksAPI.reserve(selectedBook, { studentId: selectedStudent, autoIssue });
            toast.success('Reservation created successfully!');
            onCreated();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Failed to create reservation');
        } finally { setSubmitting(false); }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.2s ease',
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto',
                background: 'var(--bg-secondary)', borderRadius: 20,
                border: '1px solid var(--border-color)',
                boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
                animation: 'slideUp 0.3s ease',
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px 28px 16px', borderBottom: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <HiOutlinePlusCircle style={{ width: 22, height: 22, color: 'white' }} />
                        </div>
                        <div>
                            <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>New Reservation</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Queue a book for a student</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'var(--bg-tertiary)', border: 'none', borderRadius: 10,
                        width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--text-muted)',
                    }}>
                        <HiOutlineXMark style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                {loadingData ? (
                    <div style={{ textAlign: 'center', padding: '48px 0' }}>
                        <div style={{
                            width: 32, height: 32, border: '3px solid var(--border-color)',
                            borderTopColor: '#f59e0b', borderRadius: '50%',
                            animation: 'spin 1s linear infinite', margin: '0 auto 12px',
                        }} />
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading data...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ padding: '20px 28px 28px' }}>
                        {/* Book selection */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                                <HiOutlineBookOpen style={{ width: 16, height: 16, color: '#f59e0b' }} /> Select Book
                            </label>
                            <input
                                type="text" placeholder="Search books..." value={bookSearch}
                                onChange={e => setBookSearch(e.target.value)} className="input-field"
                                style={{ marginBottom: 8, fontSize: '0.8rem' }}
                            />
                            <div style={{
                                maxHeight: 160, overflowY: 'auto', borderRadius: 12,
                                border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)',
                            }}>
                                {filteredBooks.length === 0 ? (
                                    <p style={{ padding: 16, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No books found</p>
                                ) : filteredBooks.map(b => (
                                    <div key={b._id} onClick={() => setSelectedBook(b._id)} style={{
                                        padding: '10px 14px', cursor: 'pointer',
                                        borderBottom: '1px solid var(--border-color)',
                                        background: selectedBook === b._id ? 'rgba(245,158,11,0.12)' : 'transparent',
                                        transition: 'background 0.15s',
                                    }}>
                                        <p style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{b.title}</p>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            {b.author} • {b.barcode} • {b.availableCount}/{b.totalCount} available
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Student selection */}
                        <div style={{ marginBottom: 20 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                                <HiOutlineAcademicCap style={{ width: 16, height: 16, color: '#8b5cf6' }} /> Select Student
                            </label>
                            <input
                                type="text" placeholder="Search students..." value={studentSearch}
                                onChange={e => setStudentSearch(e.target.value)} className="input-field"
                                style={{ marginBottom: 8, fontSize: '0.8rem' }}
                            />
                            <div style={{
                                maxHeight: 160, overflowY: 'auto', borderRadius: 12,
                                border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)',
                            }}>
                                {filteredStudents.length === 0 ? (
                                    <p style={{ padding: 16, textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No students found</p>
                                ) : filteredStudents.map(s => (
                                    <div key={s._id} onClick={() => setSelectedStudent(s._id)} style={{
                                        padding: '10px 14px', cursor: 'pointer',
                                        borderBottom: '1px solid var(--border-color)',
                                        background: selectedStudent === s._id ? 'rgba(139,92,246,0.12)' : 'transparent',
                                        transition: 'background 0.15s',
                                    }}>
                                        <p style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>{s.name}</p>
                                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.studentId} • {s.department}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Auto-issue toggle */}
                        <div style={{
                            padding: '14px 16px', borderRadius: 12, marginBottom: 24,
                            background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <div>
                                <p style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>Auto-Issue on Return</p>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                    Automatically issue the book when it becomes available
                                </p>
                            </div>
                            <label style={{ position: 'relative', width: 48, height: 26, cursor: 'pointer' }}>
                                <input type="checkbox" checked={autoIssue} onChange={e => setAutoIssue(e.target.checked)}
                                    style={{ opacity: 0, width: 0, height: 0 }} />
                                <span style={{
                                    position: 'absolute', inset: 0, borderRadius: 13,
                                    background: autoIssue ? '#10b981' : 'var(--border-color)',
                                    transition: 'background 0.3s',
                                }}>
                                    <span style={{
                                        position: 'absolute', width: 20, height: 20, borderRadius: '50%',
                                        background: 'white', top: 3, left: autoIssue ? 25 : 3,
                                        transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    }} />
                                </span>
                            </label>
                        </div>

                        <button type="submit" disabled={submitting || !selectedBook || !selectedStudent}
                            className="btn btn-primary" style={{ width: '100%', padding: '12px 0', fontWeight: 600, fontSize: '0.875rem' }}>
                            {submitting ? (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <span style={{
                                        width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: 'white', borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                    }} />
                                    Creating...
                                </span>
                            ) : (
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <HiOutlinePlusCircle style={{ width: 18, height: 18 }} /> Create Reservation
                                </span>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

/* ── Stats Card ────────────────────────────────────────────────── */
const StatCard = ({ label, value, color, icon: Icon }) => (
    <div className="glass-card" style={{
        padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14,
        borderLeft: `3px solid ${color}`,
    }}>
        <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
            <Icon style={{ width: 22, height: 22, color }} />
        </div>
        <div>
            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
        </div>
    </div>
);

/* ── Main Page ─────────────────────────────────────────────────── */
const ReservationsPage = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [sseConnected, setSseConnected] = useState(false);
    const sseRef = useRef(null);

    const fetchReservations = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = { page, limit: 20 };
            if (statusFilter) params.status = statusFilter;
            const res = await reservationsAPI.getAll(params);
            setReservations(res.data.data.reservations);
            setPagination(res.data.data.pagination);
        } catch (err) {
            toast.error('Failed to fetch reservations');
        } finally { setLoading(false); }
    }, [statusFilter]);

    useEffect(() => { fetchReservations(1); }, [fetchReservations]);

    // SSE real-time updates
    useEffect(() => {
        const es = connectSSE(['reservations', 'all'], (event, data) => {
            if (event === 'connected') { setSseConnected(true); return; }
            if (event === 'error') { setSseConnected(false); return; }
            if (event === 'reservation') {
                fetchReservations(pagination.page);
                const action = data.action;
                if (action === 'created') toast('📌 New reservation created', { icon: '🆕' });
                else if (action === 'cancelled') toast('❌ Reservation cancelled', { icon: '🔄' });
                else if (action === 'ready') toast('✅ Reservation ready for pickup!', { icon: '📗' });
            }
        });
        sseRef.current = es;
        return () => { if (sseRef.current) sseRef.current.close(); };
    }, []);

    const handleCancel = async (id) => {
        if (!window.confirm('Cancel this reservation?')) return;
        try {
            await reservationsAPI.cancel(id);
            toast.success('Reservation cancelled');
            fetchReservations(pagination.page);
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Failed to cancel');
        }
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    // Client-side search filter
    const filtered = reservations.filter(r => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            r.book?.title?.toLowerCase().includes(q) ||
            r.student?.name?.toLowerCase().includes(q) ||
            r.student?.studentId?.toLowerCase().includes(q) ||
            r.reservationId?.toLowerCase().includes(q)
        );
    });

    // Compute stats
    const statCounts = {
        total: pagination.total,
        pending: reservations.filter(r => r.status === 'pending').length,
        ready: reservations.filter(r => r.status === 'ready').length,
        fulfilled: reservations.filter(r => r.status === 'fulfilled').length,
    };

    return (
        <div className="page-sections animate-fade-in">
            {/* ── Header ────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineQueueList style={{ width: 28, height: 28, color: '#f59e0b' }} /> Reservations
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
                        Manage book reservation queue • {pagination.total} total reservations
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HiOutlinePlusCircle style={{ width: 18, height: 18 }} /> New Reservation
                    </button>
                    <button onClick={() => fetchReservations(1)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <HiOutlineArrowPath style={{ width: 16, height: 16 }} />
                    </button>
                </div>
            </div>

            {/* ── Stats Cards ───────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                <StatCard label="Total Reservations" value={statCounts.total} color="#f59e0b" icon={HiOutlineQueueList} />
                <StatCard label="Pending" value={statCounts.pending} color="#eab308" icon={HiOutlineClock} />
                <StatCard label="Ready for Pickup" value={statCounts.ready} color="#10b981" icon={HiOutlineCheckCircle} />
                <StatCard label="Fulfilled" value={statCounts.fulfilled} color="#3b82f6" icon={HiOutlineBookOpen} />
            </div>

            {/* ── Filters ───────────────────────────────────────── */}
            <div className="glass-card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                        <HiOutlineFunnel style={{ width: 16, height: 16 }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Filters</span>
                    </div>
                    <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 200 }}>
                        <HiOutlineMagnifyingGlass style={{
                            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                            width: 16, height: 16, color: 'var(--text-muted)',
                        }} />
                        <input
                            type="text" placeholder="Search by book, student, or ID..."
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            className="input-field"
                            style={{ paddingLeft: 36, fontSize: '0.8rem' }}
                        />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field" style={{ width: 160 }}>
                        <option value="">All Status</option>
                        <option value="pending">⏳ Pending</option>
                        <option value="ready">✅ Ready</option>
                        <option value="fulfilled">📗 Fulfilled</option>
                        <option value="cancelled">❌ Cancelled</option>
                        <option value="expired">⚠️ Expired</option>
                    </select>
                </div>
            </div>

            {/* ── Reservation Table ─────────────────────────────── */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={thStyle}>ID</th><th style={thStyle}>Book</th>
                                    <th style={thStyle}>Student</th><th style={thStyle}>Position</th>
                                    <th style={thStyle}>Status</th><th style={thStyle}>Expected</th>
                                    <th style={thStyle}>Auto-Issue</th><th style={thStyle}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
                            </tbody>
                        </table>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                        <div style={{
                            width: 80, height: 80, borderRadius: 24, margin: '0 auto 20px',
                            background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.08))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <HiOutlineQueueList style={{ width: 40, height: 40, color: '#f59e0b' }} />
                        </div>
                        <p style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                            {searchQuery ? 'No matching reservations' : 'No reservations yet'}
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: 320, margin: '0 auto 20px' }}>
                            {searchQuery
                                ? 'Try adjusting your search or filter criteria.'
                                : 'When books are fully issued, students can reserve a copy. Create one now!'}
                        </p>
                        {!searchQuery && (
                            <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                <HiOutlinePlusCircle style={{ width: 16, height: 16 }} /> Create Reservation
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={thStyle}>ID</th>
                                    <th style={thStyle}>Book</th>
                                    <th style={thStyle}>Student</th>
                                    <th style={thStyle}>Position</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Reserved On</th>
                                    <th style={thStyle}>Auto-Issue</th>
                                    <th style={thStyle}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(r => {
                                    const conf = statusConfig[r.status] || statusConfig.pending;
                                    const StatusIcon = conf.icon;
                                    return (
                                        <tr key={r._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }} className="table-row-hover">
                                            <td style={tdStyle}>
                                                <span style={{
                                                    fontFamily: 'monospace', fontSize: '0.72rem',
                                                    padding: '3px 8px', borderRadius: 6,
                                                    background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
                                                }}>
                                                    {r.reservationId}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{
                                                        width: 36, height: 36, borderRadius: 10,
                                                        background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                    }}>
                                                        <HiOutlineBookOpen style={{ width: 18, height: 18, color: '#f59e0b' }} />
                                                    </div>
                                                    <div>
                                                        <p style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-primary)' }}>{r.book?.title || '—'}</p>
                                                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.book?.author}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{
                                                        width: 30, height: 30, borderRadius: 8,
                                                        background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                        color: 'white', fontWeight: 700, fontSize: '0.7rem',
                                                    }}>
                                                        {r.student?.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <p style={{ fontWeight: 500, fontSize: '0.84rem', color: 'var(--text-primary)' }}>{r.student?.name || '—'}</p>
                                                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.student?.studentId}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                    width: 34, height: 34, borderRadius: '50%',
                                                    background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))',
                                                    color: '#8b5cf6', fontWeight: 700, fontSize: '0.875rem',
                                                    border: '2px solid rgba(139,92,246,0.2)',
                                                }}>
                                                    #{r.position}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                                    padding: '5px 12px', borderRadius: 20,
                                                    fontSize: '0.75rem', fontWeight: 600,
                                                    background: conf.bg, color: conf.color,
                                                    border: `1px solid ${conf.color}30`,
                                                }}>
                                                    <StatusIcon style={{ width: 14, height: 14 }} />
                                                    {conf.label}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <HiOutlineCalendar style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                        {formatDate(r.createdAt || r.expectedDate)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    fontSize: '0.75rem', fontWeight: 600,
                                                    color: r.autoIssue ? '#10b981' : 'var(--text-muted)',
                                                    padding: '3px 10px', borderRadius: 8,
                                                    background: r.autoIssue ? 'rgba(16,185,129,0.1)' : 'var(--bg-tertiary)',
                                                }}>
                                                    {r.autoIssue ? '✓ Yes' : '✗ No'}
                                                </span>
                                            </td>
                                            <td style={tdStyle}>
                                                {(r.status === 'pending' || r.status === 'ready') && (
                                                    <button onClick={() => handleCancel(r._id)}
                                                        className="btn btn-secondary btn-sm"
                                                        style={{
                                                            color: '#ef4444', fontSize: '0.75rem',
                                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                                            border: '1px solid rgba(239,68,68,0.2)',
                                                        }}>
                                                        <HiOutlineXMark style={{ width: 14, height: 14 }} /> Cancel
                                                    </button>
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
                        <button onClick={() => fetchReservations(pagination.page - 1)} disabled={pagination.page <= 1} className="btn btn-secondary btn-sm">
                            <HiOutlineChevronLeft style={{ width: 16, height: 16 }} />
                        </button>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Page {pagination.page} of {pagination.pages}
                        </span>
                        <button onClick={() => fetchReservations(pagination.page + 1)} disabled={pagination.page >= pagination.pages} className="btn btn-secondary btn-sm">
                            <HiOutlineChevronRight style={{ width: 16, height: 16 }} />
                        </button>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <CreateReservationModal
                    onClose={() => setShowModal(false)}
                    onCreated={() => fetchReservations(1)}
                />
            )}
        </div>
    );
};

const thStyle = { textAlign: 'left', padding: '14px 16px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', background: 'var(--bg-tertiary)' };
const tdStyle = { padding: '14px 16px', verticalAlign: 'middle' };

export default ReservationsPage;
