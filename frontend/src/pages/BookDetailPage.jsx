/**
 * Book Detail Page
 * Full metadata view with QR code display, borrower history,
 * reservation queue, and issue/return/reserve actions
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { booksAPI } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
    HiOutlineBookOpen, HiOutlineArrowLeft, HiOutlineQrCode,
    HiOutlineArrowPath, HiOutlineClipboardDocument,
    HiOutlineCheckCircle, HiOutlineClock, HiOutlineExclamationTriangle,
    HiOutlineGlobeAlt, HiOutlineQueueList, HiOutlineArrowDownTray
} from 'react-icons/hi2';

const BookDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [book, setBook] = useState(null);
    const [borrowerHistory, setBorrowerHistory] = useState([]);
    const [activeIssues, setActiveIssues] = useState([]);
    const [reservationQueue, setReservationQueue] = useState([]);
    const [qrData, setQrData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [qrLoading, setQrLoading] = useState(false);

    useEffect(() => {
        const fetchBook = async () => {
            setLoading(true);
            try {
                // Try as MongoDB ID first, then as QR token
                let res;
                if (id.startsWith('elvqr_')) {
                    res = await booksAPI.getByQRToken(id);
                    // QR token lookup returns limited data — refetch full
                    const fullRes = await booksAPI.getById(res.data.data.book.id);
                    res = fullRes;
                } else {
                    res = await booksAPI.getById(id);
                }
                setBook(res.data.data.book);
                setBorrowerHistory(res.data.data.borrowerHistory || []);
                setActiveIssues(res.data.data.activeIssues || []);
                setReservationQueue(res.data.data.reservationQueue || []);
            } catch (err) {
                toast.error('Book not found');
                navigate('/books');
            } finally { setLoading(false); }
        };
        if (id) fetchBook();
    }, [id, navigate]);

    const fetchQR = async () => {
        if (!book) return;
        setQrLoading(true);
        try {
            const res = await booksAPI.getQR(book._id || book.id);
            setQrData(res.data.data);
        } catch (err) {
            toast.error('Failed to generate QR code');
        } finally { setQrLoading(false); }
    };

    const rotateQR = async () => {
        if (!book) return;
        try {
            const res = await booksAPI.rotateQR(book._id || book.id);
            setQrData(res.data.data);
            toast.success('QR token rotated');
        } catch (err) {
            toast.error('Failed to rotate QR token');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    if (loading) {
        return (
            <div className="page-sections">
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                    <div style={{ width: 40, height: 40, border: '3px solid var(--border-color)', borderTopColor: '#8b5cf6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                    <p style={{ color: 'var(--text-muted)' }}>Loading book details...</p>
                </div>
            </div>
        );
    }

    if (!book) return null;

    const statusColor = book.availableCount === 0 ? '#ef4444' : book.availableCount < book.totalCount ? '#f59e0b' : '#10b981';
    const statusLabel = book.availableCount === 0 ? 'Fully Issued' : book.availableCount < book.totalCount ? 'Partially Issued' : 'Available';
    const appUrl = window.location.origin;

    return (
        <div className="page-sections animate-fade-in">
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button onClick={() => navigate('/books')} className="btn btn-secondary btn-sm">
                    <HiOutlineArrowLeft style={{ width: 16, height: 16 }} />
                </button>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{book.title}</h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>by {book.author}</p>
                </div>
                <span style={{
                    marginLeft: 'auto', padding: '6px 14px', borderRadius: 20,
                    fontSize: '0.75rem', fontWeight: 700,
                    background: `${statusColor}18`, color: statusColor
                }}>
                    {statusLabel}
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
                {/* Book Metadata */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineBookOpen style={{ width: 20, height: 20, color: '#8b5cf6' }} /> Book Information
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {[
                            ['Category', book.category],
                            ['ISBN', book.isbn || '—'],
                            ['Publisher', book.publisher || '—'],
                            ['Edition', book.edition || '—'],
                            ['Location', book.location || '—'],
                            ['Barcode', book.barcode],
                            ['Total Copies', book.totalCount],
                            ['Available', book.availableCount],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginTop: 2 }}>{value}</p>
                            </div>
                        ))}
                    </div>

                    {(book.summary || book.description) && (
                        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Summary</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{book.summary || book.description}</p>
                        </div>
                    )}

                    {/* Digital Access */}
                    {book.digitalAccess && (
                        <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <HiOutlineGlobeAlt style={{ width: 18, height: 18, color: '#3b82f6' }} />
                                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#3b82f6' }}>Digital Copy Available</p>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                Access: {book.digitalAccess.policy === 'open' ? 'Open Access' : book.digitalAccess.policy === 'members_only' ? 'Members Only' : 'Issued Users Only'}
                            </p>
                            <a href={book.digitalAccess.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>
                                <HiOutlineArrowDownTray style={{ width: 14, height: 14 }} /> Access Digital Copy
                            </a>
                        </div>
                    )}
                </div>

                {/* QR Code Section */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <HiOutlineQrCode style={{ width: 20, height: 20, color: '#8b5cf6' }} /> QR Code
                        </h2>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={fetchQR} disabled={qrLoading} className="btn btn-secondary btn-sm">
                                {qrLoading ? '...' : 'Generate'}
                            </button>
                            <button onClick={rotateQR} className="btn btn-secondary btn-sm" title="Rotate Token">
                                <HiOutlineArrowPath style={{ width: 14, height: 14 }} />
                            </button>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', padding: 24, background: 'white', borderRadius: 16, margin: '0 auto', maxWidth: 260 }}>
                        {qrData ? (
                            <img src={qrData.qrDataUrl} alt="QR Code" style={{ width: '100%', borderRadius: 8 }} />
                        ) : (
                            <QRCodeSVG
                                value={`${appUrl}/book/${book.barcode}`}
                                size={200}
                                level="M"
                                fgColor="#1a1a2e"
                                style={{ width: '100%', height: 'auto' }}
                            />
                        )}
                    </div>

                    <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8 }}>
                        Scan with Google Lens to view book details
                    </p>

                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {/* Barcode URL (for Google Lens scanning) */}
                        <div>
                            <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Public QR URL</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="text" value={book.barcodeUrl || `${appUrl}/book/${book.barcode}`} readOnly className="input-field" style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.7rem' }} />
                                <button onClick={() => copyToClipboard(book.barcodeUrl || `${appUrl}/book/${book.barcode}`)} className="btn btn-secondary btn-sm">
                                    <HiOutlineClipboardDocument style={{ width: 14, height: 14 }} />
                                </button>
                            </div>
                        </div>
                        {book.qr_token && (
                            <div>
                                <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>QR Token</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="text" value={book.qr_token} readOnly className="input-field" style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.7rem' }} />
                                    <button onClick={() => copyToClipboard(book.qr_token)} className="btn btn-secondary btn-sm">
                                        <HiOutlineClipboardDocument style={{ width: 14, height: 14 }} />
                                    </button>
                                </div>
                            </div>
                        )}
                        {qrData?.shortLink && (
                            <div>
                                <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Short Link</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input type="text" value={qrData.shortLink} readOnly className="input-field" style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.75rem' }} />
                                    <button onClick={() => copyToClipboard(qrData.shortLink)} className="btn btn-secondary btn-sm">
                                        <HiOutlineClipboardDocument style={{ width: 14, height: 14 }} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Active Issues */}
            {activeIssues.length > 0 && (
                <div className="glass-card" style={{ padding: 24 }}>
                    <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineExclamationTriangle style={{ width: 20, height: 20, color: '#f59e0b' }} />
                        Active Issues ({activeIssues.length})
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                        {activeIssues.map(tx => (
                            <div key={tx._id} style={{ padding: 14, borderRadius: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                                <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{tx.student?.name}</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tx.student?.studentId} • {tx.student?.department}</p>
                                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                                    <div>
                                        <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>ISSUED</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatDate(tx.issueDate)}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>DUE</p>
                                        <p style={{ fontSize: '0.75rem', color: tx.status === 'overdue' ? '#ef4444' : 'var(--text-secondary)' }}>{formatDate(tx.dueDate)}</p>
                                    </div>
                                </div>
                                <span style={{
                                    display: 'inline-block', marginTop: 8,
                                    padding: '2px 8px', borderRadius: 12,
                                    fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                                    background: tx.status === 'overdue' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                                    color: tx.status === 'overdue' ? '#ef4444' : '#f59e0b'
                                }}>
                                    {tx.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Reservation Queue */}
            {reservationQueue.length > 0 && (
                <div className="glass-card" style={{ padding: 24 }}>
                    <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineQueueList style={{ width: 20, height: 20, color: '#f59e0b' }} />
                        Reservation Queue ({reservationQueue.length})
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {reservationQueue.map((r, idx) => (
                            <div key={r._id} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: 12, borderRadius: 12,
                                background: r.status === 'ready' ? 'rgba(16,185,129,0.08)' : 'var(--bg-tertiary)',
                                border: `1px solid ${r.status === 'ready' ? 'rgba(16,185,129,0.2)' : 'var(--border-color)'}`
                            }}>
                                <span style={{
                                    width: 28, height: 28, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'rgba(139,92,246,0.12)', color: '#8b5cf6',
                                    fontWeight: 700, fontSize: '0.75rem', flexShrink: 0
                                }}>#{r.position}</span>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{r.student?.name}</p>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.student?.studentId}</p>
                                </div>
                                <span style={{
                                    padding: '3px 8px', borderRadius: 12,
                                    fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                                    background: r.status === 'ready' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                    color: r.status === 'ready' ? '#10b981' : '#f59e0b'
                                }}>{r.status}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Borrower History */}
            <div className="glass-card" style={{ padding: 24 }}>
                <h2 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HiOutlineClock style={{ width: 20, height: 20, color: '#6366f1' }} />
                    Borrower History ({borrowerHistory.length})
                </h2>
                {borrowerHistory.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No borrower history yet</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={thStyle}>Transaction</th>
                                    <th style={thStyle}>Student</th>
                                    <th style={thStyle}>Issued</th>
                                    <th style={thStyle}>Due</th>
                                    <th style={thStyle}>Returned</th>
                                    <th style={thStyle}>Status</th>
                                    <th style={thStyle}>Fine</th>
                                </tr>
                            </thead>
                            <tbody>
                                {borrowerHistory.map(tx => (
                                    <tr key={tx._id} style={{ borderBottom: '1px solid var(--border-color)' }} className="table-row-hover">
                                        <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tx.transactionId}</span></td>
                                        <td style={tdStyle}>
                                            <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)' }}>{tx.student?.name || '—'}</p>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tx.student?.studentId}</p>
                                        </td>
                                        <td style={tdStyle}><span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{formatDate(tx.issueDate)}</span></td>
                                        <td style={tdStyle}><span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{formatDate(tx.dueDate)}</span></td>
                                        <td style={tdStyle}><span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{formatDate(tx.returnDate)}</span></td>
                                        <td style={tdStyle}>
                                            <span style={{
                                                padding: '3px 8px', borderRadius: 12,
                                                fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                                                background: tx.status === 'returned' ? 'rgba(59,130,246,0.12)' : tx.status === 'overdue' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                                                color: tx.status === 'returned' ? '#3b82f6' : tx.status === 'overdue' ? '#ef4444' : '#f59e0b'
                                            }}>{tx.status}</span>
                                        </td>
                                        <td style={tdStyle}>
                                            {tx.fineAmount > 0 ? <span style={{ fontWeight: 600, color: '#ef4444' }}>₹{tx.fineAmount}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

const thStyle = { textAlign: 'left', padding: '10px 14px', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };
const tdStyle = { padding: '10px 14px', verticalAlign: 'middle' };

export default BookDetailPage;
