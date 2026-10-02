/**
 * Book Overview Page (Public)
 * Accessible without login — opened via QR code scan (Google Lens)
 * Route: /book/:barcode
 * 
 * Displays full book details with glassmorphism UI,
 * popularity metrics, availability status, and action buttons
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

/**
 * Auto-detect API URL based on current browser location.
 * On mobile (QR scan via LAN IP), window.location.hostname will be
 * something like "192.168.1.4", so the API call correctly targets
 * the PC's backend instead of the phone's own localhost.
 */
function getApiUrl() {
    // If explicitly configured via env, use that
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && !envUrl.includes('localhost')) {
        return envUrl;
    }
    // Auto-detect: use the same hostname the browser loaded the page from
    const host = window.location.hostname; // e.g., "192.168.1.4" or "localhost"
    return `http://${host}:5000/api`;
}

const API_URL = getApiUrl();

/* ── Animated star icon ───────────────────── */
const StarIcon = ({ filled, half }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? '#fbbf24' : 'none'} stroke="#fbbf24" strokeWidth="2">
        {half ? (
            <>
                <defs>
                    <linearGradient id="halfStar">
                        <stop offset="50%" stopColor="#fbbf24" />
                        <stop offset="50%" stopColor="transparent" />
                    </linearGradient>
                </defs>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1L12 2z" fill="url(#halfStar)" />
            </>
        ) : (
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1L12 2z" />
        )}
    </svg>
);

/* ── Render star rating ────────────────────── */
const RatingStars = ({ rating }) => {
    const stars = [];
    const rounded = Math.round(rating * 2) / 2;
    for (let i = 1; i <= 5; i++) {
        if (i <= rounded) stars.push(<StarIcon key={i} filled />);
        else if (i - 0.5 === rounded) stars.push(<StarIcon key={i} half />);
        else stars.push(<StarIcon key={i} />);
    }
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {stars}
            <span style={{ marginLeft: 8, fontSize: '0.875rem', fontWeight: 600, color: '#fbbf24' }}>
                {rating.toFixed(1)}
            </span>
        </div>
    );
};

const BookOverviewPage = () => {
    const { barcode } = useParams();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [wishlistAdded, setWishlistAdded] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Live clock for "data freshness" indicator
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchBook = async () => {
            setLoading(true);
            setError(null);
            const url = `${API_URL}/books/${barcode}`;
            console.log('[ELVORA] Fetching book:', { barcode, apiUrl: url });
            try {
                const res = await axios.get(url);
                console.log('[ELVORA] Book data received:', res.data);
                if (res.data.success) {
                    setBook(res.data.data);
                } else {
                    setError('Book not found');
                }
            } catch (err) {
                console.error('[ELVORA] Fetch error:', err.message, err.response?.status, err.response?.data);
                const msg = err.response?.data?.error?.message || 'Failed to load book details';
                setError(msg);
            } finally {
                setLoading(false);
            }
        };
        if (barcode) fetchBook();
    }, [barcode]);

    // ── LOADING STATE ──────────────────
    if (loading) {
        return (
            <div style={styles.pageWrapper}>
                <div style={styles.loadingContainer}>
                    <div style={styles.loadingLogo}>
                        <div style={styles.pulseRing} />
                        <span style={styles.loadingIcon}>📚</span>
                    </div>
                    <h2 style={{ color: '#e2e8f0', fontSize: '1.25rem', fontWeight: 700, marginTop: 24 }}>
                        Loading Book Details
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginTop: 8 }}>
                        Fetching information for <span style={{ color: '#a78bfa', fontFamily: 'monospace' }}>{barcode}</span>
                    </p>
                    <div style={styles.skeletonCard}>
                        {[...Array(5)].map((_, i) => (
                            <div key={i} style={{ ...styles.skeletonLine, width: `${100 - i * 15}%`, animationDelay: `${i * 0.15}s` }} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── ERROR STATE ──────────────────
    if (error) {
        return (
            <div style={styles.pageWrapper}>
                <div style={styles.errorContainer}>
                    <div style={{ fontSize: '4rem', marginBottom: 16 }}>📖</div>
                    <h2 style={{ color: '#f87171', fontSize: '1.5rem', fontWeight: 700 }}>Book Not Found</h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.9375rem', marginTop: 8, maxWidth: 400, lineHeight: 1.6 }}>
                        {error}
                    </p>
                    <div style={{ marginTop: 24, padding: '12px 20px', borderRadius: 12, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
                        <p style={{ color: '#94a3b8', fontSize: '0.8125rem' }}>
                            Barcode: <code style={{ color: '#f87171', fontFamily: 'JetBrains Mono, monospace' }}>{barcode}</code>
                        </p>
                    </div>
                    <button onClick={() => window.location.reload()} style={styles.retryBtn}>
                        🔄 Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!book) return null;

    const isAvailable = book.statusType !== 'unavailable';
    const isMostBorrowed = book.popularityTier === 'Most Borrowed';

    return (
        <div style={styles.pageWrapper}>
            {/* Ambient background effects */}
            <div style={styles.bgOrb1} />
            <div style={styles.bgOrb2} />
            <div style={styles.bgOrb3} />

            <div style={styles.container}>
                {/* ── ELVORA HEADER ────────────────── */}
                <header style={styles.header}>
                    <div style={styles.headerBrand}>
                        <div style={styles.logoCircle}>
                            <span style={{ fontSize: '1.25rem' }}>📚</span>
                        </div>
                        <div>
                            <h1 style={styles.brandName}>ELVORA</h1>
                            <p style={styles.brandSub}>Smart Library Management</p>
                        </div>
                    </div>
                    <div style={styles.liveIndicator}>
                        <span style={styles.liveDot} />
                        <span style={{ fontSize: '0.6875rem', color: '#94a3b8' }}>
                            {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </header>

                {/* ── STATUS BANNER ────────────────── */}
                <div style={{
                    ...styles.statusBanner,
                    background: isAvailable
                        ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(52,211,153,0.08))'
                        : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(248,113,113,0.08))',
                    borderColor: isAvailable
                        ? 'rgba(16,185,129,0.25)'
                        : 'rgba(239,68,68,0.25)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                            ...styles.statusDot,
                            background: isAvailable ? '#10b981' : '#ef4444',
                            boxShadow: `0 0 12px ${isAvailable ? 'rgba(16,185,129,0.5)' : 'rgba(239,68,68,0.5)'}`
                        }} />
                        <div>
                            <p style={{ fontWeight: 700, fontSize: '0.9375rem', color: isAvailable ? '#10b981' : '#ef4444' }}>
                                {book.status}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                {book.availableCopies} of {book.totalCopies} copies available
                            </p>
                        </div>
                    </div>
                    {isMostBorrowed && (
                        <span style={styles.mostBorrowedBadge}>
                            🔥 Most Borrowed
                        </span>
                    )}
                </div>

                {/* ── MAIN BOOK CARD ────────────────── */}
                <div style={styles.mainCard}>
                    {/* Title Section */}
                    <div style={styles.titleSection}>
                        <div style={styles.categoryPill}>
                            <span>🏷️</span>
                            <span>{book.category}</span>
                        </div>
                        <h2 style={styles.bookTitle}>{book.title}</h2>
                        <p style={styles.authorName}>
                            <span style={{ color: '#818cf8' }}>✍️</span> by {book.author}
                        </p>
                        <div style={{ marginTop: 12 }}>
                            <RatingStars rating={book.rating || 4.0} />
                        </div>
                    </div>

                    {/* ── DETAIL GRID ────────────────── */}
                    <div style={styles.detailGrid}>
                        <DetailItem icon="📚" label="Available Copies" value={`${book.availableCopies} / ${book.totalCopies}`}
                            highlight={isAvailable ? '#10b981' : '#ef4444'} />
                        <DetailItem icon="📅" label="Edition" value={book.edition || '—'} />
                        <DetailItem icon="🏢" label="Publisher" value={book.publisher || '—'} />
                        <DetailItem icon="📍" label="Location" value={book.location || '—'} />
                        <DetailItem icon="📇" label="ISBN" value={book.isbn || '—'} />
                        <DetailItem icon="🔖" label="Barcode" value={book.barcode} mono />
                    </div>

                    {/* ── DESCRIPTION ────────────────── */}
                    {(book.description || book.summary) && (
                        <div style={styles.descriptionSection}>
                            <h3 style={styles.sectionTitle}>
                                <span>📝</span> Description
                            </h3>
                            <p style={styles.descriptionText}>
                                {book.description || book.summary}
                            </p>
                        </div>
                    )}
                </div>

                {/* ── POPULARITY & STATS CARDS ────────── */}
                <div style={styles.statsRow}>
                    <div style={styles.statCard}>
                        <div style={{ ...styles.statIconBg, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            📊
                        </div>
                        <p style={styles.statValue}>{book.totalTransactions}</p>
                        <p style={styles.statLabel}>Times Borrowed</p>
                    </div>
                    <div style={styles.statCard}>
                        <div style={{ ...styles.statIconBg, background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
                            ⭐
                        </div>
                        <p style={styles.statValue}>{(book.rating || 4.0).toFixed(1)}</p>
                        <p style={styles.statLabel}>Rating</p>
                    </div>
                    <div style={styles.statCard}>
                        <div style={{ ...styles.statIconBg, background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                            🔥
                        </div>
                        <p style={styles.statValue}>{book.popularityTier}</p>
                        <p style={styles.statLabel}>Popularity</p>
                    </div>
                    <div style={styles.statCard}>
                        <div style={{ ...styles.statIconBg, background: 'linear-gradient(135deg, #10b981, #34d399)' }}>
                            📋
                        </div>
                        <p style={styles.statValue}>{book.pendingReservations}</p>
                        <p style={styles.statLabel}>Reservations</p>
                    </div>
                </div>

                {/* ── UNAVAILABLE ALERT ────────────── */}
                {!isAvailable && (
                    <div style={styles.alertCard}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                            <div>
                                <p style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.9375rem' }}>
                                    Currently Unavailable
                                </p>
                                <p style={{ color: '#94a3b8', fontSize: '0.8125rem', marginTop: 4, lineHeight: 1.5 }}>
                                    All copies of this book are currently issued. You can reserve a copy and we'll notify you when it becomes available.
                                    {book.pendingReservations > 0 && ` There are ${book.pendingReservations} people already in the queue.`}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── RECENT ACTIVITY ────────────────── */}
                {book.recentBorrowers && book.recentBorrowers.length > 0 && (
                    <div style={styles.activityCard}>
                        <h3 style={styles.sectionTitle}>
                            <span>📋</span> Recent Activity
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {book.recentBorrowers.map((b, idx) => (
                                <div key={idx} style={styles.activityRow}>
                                    <div style={styles.activityAvatar}>
                                        {b.name.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#e2e8f0' }}>{b.name}</p>
                                        <p style={{ fontSize: '0.6875rem', color: '#64748b' }}>{b.department}</p>
                                    </div>
                                    <span style={{
                                        ...styles.activityBadge,
                                        background: b.status === 'returned' ? 'rgba(16,185,129,0.12)' : b.status === 'overdue' ? 'rgba(239,68,68,0.12)' : 'rgba(59,130,246,0.12)',
                                        color: b.status === 'returned' ? '#10b981' : b.status === 'overdue' ? '#ef4444' : '#3b82f6'
                                    }}>
                                        {b.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── ACTION BUTTONS ────────────────── */}
                <div style={styles.actionSection}>
                    {isAvailable ? (
                        <button
                            style={styles.primaryBtn}
                            onClick={() => window.location.href = `/login?redirect=/books/${book._id}&action=issue`}
                        >
                            <span>📖</span> Issue This Book
                        </button>
                    ) : (
                        <button
                            style={styles.reserveBtn}
                            onClick={() => window.location.href = `/login?redirect=/books/${book._id}&action=reserve`}
                        >
                            <span>🔔</span> Reserve This Book
                        </button>
                    )}

                    <button
                        style={{
                            ...styles.wishlistBtn,
                            ...(wishlistAdded ? { background: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.3)', color: '#10b981' } : {})
                        }}
                        onClick={() => setWishlistAdded(!wishlistAdded)}
                    >
                        <span>{wishlistAdded ? '✅' : '💝'}</span>
                        {wishlistAdded ? 'Added to Wishlist' : 'Add to Wishlist'}
                    </button>
                </div>

                {/* ── LOGIN HINT ────────────────── */}
                <div style={styles.loginHint}>
                    <p style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center' }}>
                        🔐 Login required to issue, return, or reserve books.
                        <br />
                        <a href="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
                            Sign in to your ELVORA account →
                        </a>
                    </p>
                </div>

                {/* ── FOOTER ────────────────── */}
                <footer style={styles.footer}>
                    <div style={styles.footerLogo}>📚 ELVORA</div>
                    <p style={{ color: '#475569', fontSize: '0.6875rem' }}>
                        Smart Library Management System
                    </p>
                    <p style={{ color: '#334155', fontSize: '0.625rem', marginTop: 4 }}>
                        © {new Date().getFullYear()} ELVORA • Powered by QR Smart Access
                    </p>
                </footer>
            </div>
        </div>
    );
};

/* ── Detail Item Component ────────────────── */
const DetailItem = ({ icon, label, value, highlight, mono }) => (
    <div style={styles.detailItem}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: '0.8125rem' }}>{icon}</span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {label}
            </span>
        </div>
        <p style={{
            fontSize: '0.9375rem',
            fontWeight: 600,
            color: highlight || '#e2e8f0',
            fontFamily: mono ? 'JetBrains Mono, Fira Code, monospace' : 'inherit',
            fontSize: mono ? '0.8125rem' : '0.9375rem'
        }}>
            {value}
        </p>
    </div>
);


/* ═══════════════════════════════════════════════
   STYLES — Glassmorphism dark theme
   ═══════════════════════════════════════════════ */
const styles = {
    pageWrapper: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0d1a 30%, #1a1035 60%, #0d0b15 100%)',
        fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
        position: 'relative',
        overflow: 'hidden',
    },

    // Background ambient orbs
    bgOrb1: {
        position: 'fixed', width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
        top: -100, right: -100, pointerEvents: 'none', zIndex: 0,
    },
    bgOrb2: {
        position: 'fixed', width: 300, height: 300, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        bottom: 100, left: -80, pointerEvents: 'none', zIndex: 0,
    },
    bgOrb3: {
        position: 'fixed', width: 250, height: 250, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)',
        top: '40%', right: '10%', pointerEvents: 'none', zIndex: 0,
    },

    container: {
        maxWidth: 520,
        margin: '0 auto',
        padding: '20px 16px 40px',
        position: 'relative',
        zIndex: 1,
    },

    // Header
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, padding: '16px 0',
    },
    headerBrand: {
        display: 'flex', alignItems: 'center', gap: 12,
    },
    logoCircle: {
        width: 44, height: 44, borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))',
        border: '1px solid rgba(99,102,241,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
    },
    brandName: {
        fontSize: '1.125rem', fontWeight: 800, letterSpacing: '0.08em',
        background: 'linear-gradient(135deg, #a78bfa, #818cf8, #6366f1)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    },
    brandSub: {
        fontSize: '0.625rem', color: '#64748b', fontWeight: 500, letterSpacing: '0.04em',
    },
    liveIndicator: {
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 20,
        background: 'rgba(30,27,45,0.6)', border: '1px solid rgba(99,102,241,0.12)',
    },
    liveDot: {
        width: 6, height: 6, borderRadius: '50%', background: '#10b981',
        boxShadow: '0 0 8px rgba(16,185,129,0.5)',
        animation: 'pulse 2s infinite',
    },

    // Status Banner
    statusBanner: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', borderRadius: 16,
        border: '1px solid', marginBottom: 16,
        backdropFilter: 'blur(12px)',
        flexWrap: 'wrap', gap: 8,
    },
    statusDot: {
        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
    },
    mostBorrowedBadge: {
        padding: '5px 12px', borderRadius: 20,
        background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(249,115,22,0.1))',
        border: '1px solid rgba(245,158,11,0.3)',
        color: '#fbbf24', fontSize: '0.6875rem', fontWeight: 700,
        letterSpacing: '0.02em',
    },

    // Main Book Card
    mainCard: {
        background: 'rgba(26,23,38,0.7)',
        backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(99,102,241,0.12)',
        borderRadius: 20, padding: 24, marginBottom: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    },

    titleSection: {
        marginBottom: 24, paddingBottom: 20,
        borderBottom: '1px solid rgba(99,102,241,0.1)',
    },
    categoryPill: {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 14px', borderRadius: 20,
        background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
        color: '#a78bfa', fontSize: '0.75rem', fontWeight: 600,
        marginBottom: 12,
    },
    bookTitle: {
        fontSize: '1.625rem', fontWeight: 800, lineHeight: 1.3,
        color: '#f1f5f9', letterSpacing: '-0.01em',
    },
    authorName: {
        fontSize: '1rem', color: '#94a3b8', marginTop: 8, fontWeight: 500,
        display: 'flex', alignItems: 'center', gap: 6,
    },

    // Detail Grid
    detailGrid: {
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 16,
    },
    detailItem: {
        padding: '12px 14px', borderRadius: 12,
        background: 'rgba(37,33,54,0.5)',
        border: '1px solid rgba(99,102,241,0.06)',
    },

    // Description
    descriptionSection: {
        marginTop: 24, paddingTop: 20,
        borderTop: '1px solid rgba(99,102,241,0.1)',
    },
    sectionTitle: {
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: '0.9375rem', fontWeight: 700, color: '#e2e8f0',
        marginBottom: 12,
    },
    descriptionText: {
        fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.7,
    },

    // Stats Row
    statsRow: {
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10, marginBottom: 16,
    },
    statCard: {
        background: 'rgba(26,23,38,0.6)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(99,102,241,0.1)',
        borderRadius: 16, padding: '16px 10px',
        textAlign: 'center',
        transition: 'all 0.2s ease',
    },
    statIconBg: {
        width: 36, height: 36, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 8px', fontSize: '1rem',
    },
    statValue: {
        fontSize: '1.125rem', fontWeight: 800, color: '#f1f5f9',
    },
    statLabel: {
        fontSize: '0.625rem', fontWeight: 500, color: '#64748b',
        textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2,
    },

    // Alert Card
    alertCard: {
        background: 'rgba(245,158,11,0.06)',
        border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: 16, padding: 18, marginBottom: 16,
        backdropFilter: 'blur(12px)',
    },

    // Activity Card
    activityCard: {
        background: 'rgba(26,23,38,0.6)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(99,102,241,0.1)',
        borderRadius: 16, padding: 20, marginBottom: 16,
    },
    activityRow: {
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', borderRadius: 10,
        background: 'rgba(37,33,54,0.4)',
        border: '1px solid rgba(99,102,241,0.05)',
    },
    activityAvatar: {
        width: 32, height: 32, borderRadius: 10,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0,
    },
    activityBadge: {
        padding: '3px 8px', borderRadius: 8,
        fontSize: '0.6rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.04em',
    },

    // Action Section
    actionSection: {
        display: 'flex', flexDirection: 'column', gap: 10,
        marginBottom: 16,
    },
    primaryBtn: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', padding: '16px 24px',
        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
        color: 'white', border: 'none', borderRadius: 14,
        fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 6px 24px rgba(99,102,241,0.35)',
        transition: 'all 0.2s ease',
    },
    reserveBtn: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', padding: '16px 24px',
        background: 'linear-gradient(135deg, #f59e0b, #f97316)',
        color: 'white', border: 'none', borderRadius: 14,
        fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer',
        boxShadow: '0 6px 24px rgba(245,158,11,0.3)',
        transition: 'all 0.2s ease',
    },
    wishlistBtn: {
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', padding: '14px 24px',
        background: 'rgba(26,23,38,0.5)',
        color: '#a78bfa', border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 14, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        transition: 'all 0.2s ease',
    },

    // Login Hint
    loginHint: {
        padding: '16px 20px', borderRadius: 12,
        background: 'rgba(26,23,38,0.4)',
        border: '1px solid rgba(99,102,241,0.08)',
        marginBottom: 24,
    },

    // Footer
    footer: {
        textAlign: 'center', paddingTop: 20,
        borderTop: '1px solid rgba(99,102,241,0.08)',
    },
    footerLogo: {
        fontSize: '0.875rem', fontWeight: 800, letterSpacing: '0.1em',
        background: 'linear-gradient(135deg, #a78bfa, #6366f1)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        marginBottom: 4,
    },

    // Loading
    loadingContainer: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: 24,
    },
    loadingLogo: {
        position: 'relative', width: 80, height: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    loadingIcon: {
        fontSize: '2.5rem', zIndex: 1,
    },
    pulseRing: {
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: '3px solid rgba(99,102,241,0.3)',
        animation: 'pulse 1.5s ease-in-out infinite',
    },
    skeletonCard: {
        width: '100%', maxWidth: 320, marginTop: 32,
        padding: 24, borderRadius: 16,
        background: 'rgba(26,23,38,0.5)',
        border: '1px solid rgba(99,102,241,0.1)',
        display: 'flex', flexDirection: 'column', gap: 12,
    },
    skeletonLine: {
        height: 14, borderRadius: 6,
        background: 'linear-gradient(90deg, rgba(37,33,54,0.5) 25%, rgba(55,48,82,0.5) 50%, rgba(37,33,54,0.5) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
    },

    // Error
    errorContainer: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', padding: 24,
    },
    retryBtn: {
        marginTop: 20, padding: '12px 28px',
        background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
        color: '#a78bfa', borderRadius: 12, fontSize: '0.875rem',
        fontWeight: 600, cursor: 'pointer',
    },
};


/* ── Global CSS injected for animations ────── */
const styleEl = document.createElement('style');
styleEl.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }

    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }

    /* Responsive stat cards */
    @media (max-width: 400px) {
        .book-overview-stats-row {
            grid-template-columns: repeat(2, 1fr) !important;
        }
    }
`;
if (!document.querySelector('#book-overview-styles')) {
    styleEl.id = 'book-overview-styles';
    document.head.appendChild(styleEl);
}


export default BookOverviewPage;
