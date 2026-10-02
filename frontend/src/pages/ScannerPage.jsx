/**
 * Enhanced Scanner Page
 * Supports QR code scanning via webcam, barcode input, and all 4 actions
 * Includes real-time SSE updates and QR token support
 */

import { useState, useRef, useEffect } from 'react';
import { scanAPI, connectSSE } from '../services/api';
import toast from 'react-hot-toast';
import {
    HiOutlineQrCode, HiOutlineFingerPrint, HiOutlineSignal,
    HiOutlineCheckCircle, HiOutlineExclamationTriangle,
    HiOutlineVideoCamera, HiOutlineStop, HiOutlineBookOpen,
    HiOutlineClipboardDocument, HiOutlineArrowsRightLeft
} from 'react-icons/hi2';

const ScannerPage = () => {
    const [identifier, setIdentifier] = useState('');
    const [studentId, setStudentId] = useState('');
    const [action, setAction] = useState('auto');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fpHash, setFpHash] = useState('');
    const [fpResult, setFpResult] = useState(null);
    const [sseConnected, setSseConnected] = useState(false);
    const [liveEvents, setLiveEvents] = useState([]);

    // SSE real-time connection
    useEffect(() => {
        const es = connectSSE(['books', 'transactions'], (event, data) => {
            if (event === 'connected') {
                setSseConnected(true);
            } else if (event === 'error') {
                setSseConnected(false);
            } else {
                setLiveEvents(prev => [{ event, data, time: new Date() }, ...prev].slice(0, 10));
            }
        });
        return () => es.close();
    }, []);

    const handleScan = async (e) => {
        e.preventDefault();
        if (!identifier) { toast.error('Identifier (barcode or QR token) is required'); return; }

        // status action doesn't need studentId
        if (action !== 'status' && !studentId) {
            toast.error('Student ID is required for issue/return/reserve');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                identifier,
                action: action !== 'auto' ? action : undefined,
            };
            if (studentId) payload.studentId = studentId;

            const res = await scanAPI.processScan(payload);
            setResult(res.data);
            toast.success(res.data.message);
        } catch (err) {
            const errMsg = err.response?.data?.error?.message || err.response?.data?.message || 'Scan failed';
            setResult({ success: false, message: errMsg, error: err.response?.data?.error });
            toast.error(errMsg);
        } finally { setLoading(false); }
    };

    const handleFingerprint = async () => {
        if (!fpHash) { toast.error('Enter fingerprint hash'); return; }
        try {
            const res = await scanAPI.fingerprint({ fingerprintHash: fpHash });
            setFpResult(res.data);
            setStudentId(res.data.data.student.studentId);
            toast.success(`Student identified: ${res.data.data.student.name}`);
        } catch (err) {
            toast.error(err.response?.data?.error?.message || 'Fingerprint not recognized');
            setFpResult(null);
        }
    };

    const pasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setIdentifier(text.trim());
            toast.success('Pasted from clipboard');
        } catch { toast.error('Clipboard access denied'); }
    };

    return (
        <div className="page-sections animate-fade-in">
            <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HiOutlineQrCode style={{ width: 28, height: 28, color: '#8b5cf6' }} /> Smart Scanner
                </h1>
                <p style={{ fontSize: '0.875rem', marginTop: 4, color: 'var(--text-secondary)' }}>
                    Scan QR codes or barcodes to issue, return, check status, or reserve books
                </p>
            </div>

            <div className="scanner-grid">
                {/* Scanner Panel */}
                <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,0.15)', flexShrink: 0 }}>
                            <HiOutlineSignal style={{ width: 20, height: 20, color: '#8b5cf6' }} />
                        </div>
                        <div>
                            <h2 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Scan Interface</h2>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>QR Token + Barcode Support</p>
                        </div>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: sseConnected ? '#4ade80' : '#ef4444', animation: sseConnected ? 'pulse-glow 2s infinite' : 'none' }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: sseConnected ? '#22c55e' : '#ef4444' }}>
                                {sseConnected ? 'Live' : 'Offline'}
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleScan} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>
                                Identifier (Barcode or QR Token) *
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                                    placeholder="e.g. ELV-BK-0001 or elvqr_..."
                                    className="input-field" style={{ fontFamily: 'monospace', flex: 1 }} required />
                                <button type="button" onClick={pasteFromClipboard} className="btn btn-secondary btn-sm" title="Paste">
                                    <HiOutlineClipboardDocument style={{ width: 16, height: 16 }} />
                                </button>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>
                                Student ID {action === 'status' ? '(optional)' : '*'}
                            </label>
                            <input type="text" value={studentId} onChange={e => setStudentId(e.target.value)}
                                placeholder="e.g. STU-2024-001"
                                className="input-field" />
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Action</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                                {[
                                    { value: 'auto', label: 'Auto', color: '#6366f1' },
                                    { value: 'issue', label: 'Issue', color: '#10b981' },
                                    { value: 'return', label: 'Return', color: '#3b82f6' },
                                    { value: 'status', label: 'Status', color: '#f59e0b' },
                                    { value: 'reserve', label: 'Reserve', color: '#ec4899' },
                                ].map(opt => (
                                    <button key={opt.value} type="button"
                                        onClick={() => setAction(opt.value)}
                                        style={{
                                            padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                                            fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s',
                                            background: action === opt.value ? `${opt.color}20` : 'var(--bg-tertiary)',
                                            color: action === opt.value ? opt.color : 'var(--text-muted)',
                                            outline: action === opt.value ? `2px solid ${opt.color}40` : 'none'
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', height: 48 }}>
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                    Processing...
                                </span>
                            ) : (
                                <><HiOutlineQrCode style={{ width: 20, height: 20 }} /> Process Scan</>
                            )}
                        </button>
                    </form>

                    {/* Fingerprint Section */}
                    <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <HiOutlineFingerPrint style={{ width: 20, height: 20, color: '#06b6d4' }} />
                            <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Fingerprint Auth</h3>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input type="text" value={fpHash} onChange={e => setFpHash(e.target.value)} placeholder="Fingerprint hash..." className="input-field" style={{ flex: 1 }} />
                            <button onClick={handleFingerprint} className="btn btn-secondary">Verify</button>
                        </div>
                        {fpResult && (
                            <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'var(--bg-tertiary)' }}>
                                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>✓ {fpResult.data.student.name}</p>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{fpResult.data.student.studentId} · {fpResult.data.student.department}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Result Panel */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <h2 style={{ fontWeight: 700, marginBottom: 16, color: 'var(--text-primary)' }}>Scan Result</h2>
                    {result ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12, background: result.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
                                {result.success ? <HiOutlineCheckCircle style={{ width: 32, height: 32, color: '#10b981', flexShrink: 0 }} /> : <HiOutlineExclamationTriangle style={{ width: 32, height: 32, color: '#ef4444', flexShrink: 0 }} />}
                                <div>
                                    <p style={{ fontWeight: 700, color: result.success ? '#10b981' : '#ef4444' }}>{result.success ? 'Success' : 'Error'}</p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{result.message}</p>
                                </div>
                            </div>

                            {result.success && result.action && (
                                <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-tertiary)' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-muted)' }}>ACTION</p>
                                    <span className={`badge ${result.action === 'issued' ? 'badge-issued' : result.action === 'returned' ? 'badge-returned' : result.action === 'reserved' ? 'badge-warning' : 'badge-info'}`}>
                                        {result.action.toUpperCase()}
                                    </span>
                                </div>
                            )}

                            {/* Transaction details */}
                            {result.data?.transaction && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-tertiary)' }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-muted)' }}>TRANSACTION</p>
                                        <p style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: 'var(--text-primary)' }}>{result.data.transaction.transactionId}</p>
                                    </div>
                                    <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-tertiary)' }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-muted)' }}>BOOK</p>
                                        <p style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{result.data.transaction.book?.title}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>by {result.data.transaction.book?.author}</p>
                                    </div>
                                    <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-tertiary)' }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-muted)' }}>STUDENT</p>
                                        <p style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{result.data.transaction.student?.name}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{result.data.transaction.student?.studentId}</p>
                                    </div>
                                </div>
                            )}

                            {/* Status check data */}
                            {result.data?.book && result.action === 'status' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-tertiary)' }}>
                                        <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{result.data.book.title}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{result.data.book.author} • {result.data.book.category}</p>
                                        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                                            <div>
                                                <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>AVAILABLE</p>
                                                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: result.data.book.availableCount > 0 ? '#10b981' : '#ef4444' }}>
                                                    {result.data.book.availableCount} / {result.data.book.totalCount}
                                                </p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)' }}>RESERVATIONS</p>
                                                <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b' }}>{result.data.reservationCount || 0}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {result.data.activeTransactions?.length > 0 && (
                                        <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-tertiary)' }}>
                                            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>CURRENTLY ISSUED TO</p>
                                            {result.data.activeTransactions.map(tx => (
                                                <p key={tx._id} style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', padding: '4px 0' }}>
                                                    {tx.student?.name} ({tx.student?.studentId})
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Reservation data */}
                            {result.data?.reservation && (
                                <div style={{ padding: 12, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f59e0b', marginBottom: 4 }}>RESERVATION CREATED</p>
                                    <p style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{result.data.reservation.reservationId}</p>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                        Position: #{result.data.reservation.position} • Expected: {new Date(result.data.reservation.expectedDate).toLocaleDateString()}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '64px 0' }}>
                            <HiOutlineQrCode style={{ width: 64, height: 64, margin: '0 auto 16px', color: 'var(--text-muted)' }} />
                            <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>No scan result yet</p>
                            <p style={{ fontSize: '0.875rem', marginTop: 4, color: 'var(--text-muted)' }}>
                                Enter a barcode or QR token to get started
                            </p>
                        </div>
                    )}

                    {/* Live Events */}
                    {liveEvents.length > 0 && (
                        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                <HiOutlineArrowsRightLeft style={{ width: 16, height: 16, color: '#8b5cf6' }} />
                                <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>Live Events</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                                {liveEvents.map((ev, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--bg-tertiary)', fontSize: '0.75rem' }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6', flexShrink: 0 }} />
                                        <span style={{ color: 'var(--text-muted)' }}>{ev.time.toLocaleTimeString()}</span>
                                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{ev.event}</span>
                                        {ev.data?.title && <span style={{ color: 'var(--text-muted)' }}>— {ev.data.title}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Test */}
            <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>Quick Test</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>Click to auto-fill barcodes or student IDs</p>
                <div className="chip-grid">
                    {['ELV-BK-0001', 'ELV-BK-0002', 'ELV-BK-0003', 'ELV-BK-0004', 'ELV-BK-0005'].map(bc => (
                        <button key={bc} onClick={() => setIdentifier(bc)} className="btn btn-secondary btn-sm" style={{ fontFamily: 'monospace' }}>{bc}</button>
                    ))}
                </div>
                <div className="chip-grid" style={{ marginTop: 12 }}>
                    {['STU-2024-001', 'STU-2024-002', 'STU-2024-003', 'STU-2024-004'].map(sid => (
                        <button key={sid} onClick={() => setStudentId(sid)} className="btn btn-secondary btn-sm" style={{ fontFamily: 'monospace' }}>{sid}</button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ScannerPage;
