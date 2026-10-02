/**
 * Library Data Engine Books Page
 * Demonstrates real-time data fetching from Library Data Engine via REST API.
 *
 * Features:
 *   ✓ Auto-load all books from MongoDB Atlas on page mount
 *   ✓ Fetch single book by MongoDB _id or Barcode
 *   ✓ Proper field binding: title, author, availableCount, status
 *   ✓ Connection test with live response preview
 *   ✓ Ready for ESP32 IoT barcode scan integration
 */

import { useState, useEffect } from 'react';
import {
    getAllMongoBooks,
    getMongoBookById,
    testMongoConnection,
    MONGO_FIELD_BINDINGS,
    getBookStatus,
} from '../services/mongoAtlasAPI';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
    HiOutlineCircleStack,
    HiOutlineCheckCircle,
    HiOutlineExclamationTriangle,
    HiOutlineArrowPath,
    HiOutlineMagnifyingGlass,
    HiOutlineSignal,
    HiOutlineBookOpen,
    HiOutlineLink,
    HiOutlineBeaker,
    HiOutlineServer,
    HiOutlineCpuChip,
} from 'react-icons/hi2';

// ─── Status badge helper ──────────────────────────────────────────────────────
const AvailabilityBadge = ({ book }) => {
    const available = book.availableCount > 0;
    const partial = available && book.availableCount < book.totalCount;
    const color = available ? (partial ? '#f59e0b' : '#10b981') : '#ef4444';
    const label = available
        ? partial
            ? `Partially Available (${book.availableCount}/${book.totalCount})`
            : `Available (${book.availableCount}/${book.totalCount})`
        : 'Not Available';

    return (
        <span
            style={{
                display: 'inline-block',
                padding: '3px 10px',
                borderRadius: 9999,
                fontSize: '0.75rem',
                fontWeight: 600,
                background: `${color}1a`,
                color,
                border: `1px solid ${color}40`,
            }}
        >
            {label}
        </span>
    );
};

// ─── Book detail card ─────────────────────────────────────────────────────────
const BookDetailCard = ({ book, source = 'Library Data Engine' }) => (
    <div
        style={{
            marginTop: 16,
            padding: 20,
            borderRadius: 14,
            background: 'var(--bg-tertiary)',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            border: '1px solid var(--border-color)',
        }}
    >
        {/* Source indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HiOutlineSignal style={{ width: 15, height: 15, color: '#10b981' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#10b981' }}>
                Fetched from {source}
            </span>
            <span
                style={{
                    marginLeft: 'auto',
                    fontSize: '0.65rem',
                    fontFamily: 'monospace',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-secondary)',
                    padding: '2px 6px',
                    borderRadius: 4,
                }}
            >
                _id: {book._id}
            </span>
        </div>

        {/* Bound fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Title */}
            <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    {MONGO_FIELD_BINDINGS['title']}
                </p>
                <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {book.title || 'N/A'}
                </p>
            </div>

            {/* Author */}
            <div>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    {MONGO_FIELD_BINDINGS['author']}
                </p>
                <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {book.author || 'N/A'}
                </p>
            </div>

            {/* Category */}
            <div>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    {MONGO_FIELD_BINDINGS['category']}
                </p>
                <span
                    style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 8,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        background: 'rgba(99,102,241,0.12)',
                        color: '#818cf8',
                    }}
                >
                    {book.category || 'N/A'}
                </span>
            </div>

            {/* Availability */}
            <div>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    {MONGO_FIELD_BINDINGS['availableCount']}
                </p>
                <AvailabilityBadge book={book} />
            </div>

            {/* Issue Status */}
            <div>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    {MONGO_FIELD_BINDINGS['status']}
                </p>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {getBookStatus(book)}
                </p>
            </div>

            {/* Barcode */}
            <div>
                <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    {MONGO_FIELD_BINDINGS['barcode']}
                </p>
                <code
                    style={{
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        color: '#818cf8',
                        background: 'var(--bg-secondary)',
                        padding: '2px 8px',
                        borderRadius: 6,
                    }}
                >
                    {book.barcode || 'N/A'}
                </code>
            </div>
        </div>

        {/* Raw JSON */}
        <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Raw Response (JSON)
            </p>
            <pre
                style={{
                    fontSize: '0.72rem',
                    fontFamily: 'monospace',
                    padding: 12,
                    borderRadius: 10,
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    margin: 0,
                    maxHeight: 200,
                    overflowY: 'auto',
                }}
            >
                {JSON.stringify(book, null, 2)}
            </pre>
        </div>
    </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const MongoDBBooksPage = () => {
    const [books, setBooks]               = useState([]);
    const [loading, setLoading]           = useState(true);
    const [testResult, setTestResult]     = useState(null);
    const [testing, setTesting]           = useState(false);
    const [searchId, setSearchId]         = useState('');
    const [singleBook, setSingleBook]     = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [totalBooks, setTotalBooks]     = useState(0);

    // Auto-fetch all books on mount
    useEffect(() => {
        fetchAllBooks();
    }, []);

    const fetchAllBooks = async () => {
        setLoading(true);
        try {
            const data = await getAllMongoBooks({ limit: 50 });
            setBooks(data.books || []);
            setTotalBooks(data.pagination?.total || (data.books || []).length);
            toast.success(`Loaded ${(data.books || []).length} books from Library Data Engine`);
        } catch (err) {
            toast.error('Failed to fetch from Library Data Engine: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            const result = await testMongoConnection();
            setTestResult(result);
            if (result.success) toast.success('Library Data Engine API test passed!');
            else toast.error('Library Data Engine API test failed: ' + result.message);
        } catch (err) {
            toast.error('Test failed: ' + err.message);
        } finally {
            setTesting(false);
        }
    };

    // Fetch by MongoDB _id (or barcode as fallback)
    const handleFetchBook = async (e) => {
        e.preventDefault();
        const id = searchId.trim();
        if (!id) { toast.error('Enter a MongoDB Book ID or Barcode'); return; }
        setSearchLoading(true);
        setSingleBook(null);
        try {
            const book = await getMongoBookById(id);
            setSingleBook(book);
            toast.success(`Found: ${book.title}`);
        } catch (err) {
            toast.error(err.response?.data?.message || `Book not found for ID: ${id}`);
        } finally {
            setSearchLoading(false);
        }
    };

    return (
        <div className="page-sections animate-fade-in">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1
                        style={{
                            fontSize: '1.5rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        <HiOutlineCircleStack style={{ width: 28, height: 28, color: '#10b981' }} />
                        Library Data Engine
                    </h1>
                    <p style={{ fontSize: '0.875rem', marginTop: 4, color: 'var(--text-secondary)' }}>
                        Live data from Library Data Engine via REST API — {totalBooks} book{totalBooks !== 1 ? 's' : ''} in database
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleTest} disabled={testing} className="btn btn-secondary">
                        {testing ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span
                                    style={{
                                        width: 16, height: 16,
                                        border: '2px solid currentColor',
                                        borderTopColor: 'transparent',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                    }}
                                />
                                Testing...
                            </span>
                        ) : (
                            <><HiOutlineBeaker style={{ width: 16, height: 16 }} /> Test API</>
                        )}
                    </button>
                    <button onClick={fetchAllBooks} className="btn btn-primary">
                        <HiOutlineArrowPath style={{ width: 16, height: 16 }} /> Refresh
                    </button>
                </div>
            </div>

            {/* API Configuration Info Card */}
            <div className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <HiOutlineServer style={{ width: 20, height: 20, color: '#10b981' }} />
                    <h2 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        API Data Source — Library Data Engine REST API
                    </h2>
                </div>

                {/* Endpoints */}
                <div className="firebase-config-grid" style={{ marginBottom: 16 }}>
                    <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-tertiary)' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
                            GET ALL BOOKS
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                                GET
                            </span>
                            <code style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                /api/books?limit=50
                            </code>
                        </div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-tertiary)' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>
                            GET BOOK BY ID
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                                GET
                            </span>
                            <code style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                /api/books/:id
                            </code>
                        </div>
                    </div>
                </div>

                {/* Field Bindings */}
                <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        FIELD BINDINGS (Database → UI)
                    </p>
                    <div className="chip-grid">
                        {Object.entries(MONGO_FIELD_BINDINGS).map(([field, label]) => (
                            <div
                                key={field}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    fontSize: '0.75rem',
                                    background: 'var(--bg-tertiary)',
                                }}
                            >
                                <code style={{ fontFamily: 'monospace', color: '#34d399' }}>{field}</code>
                                <span style={{ color: 'var(--text-muted)' }}>→</span>
                                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ESP32 Integration Note */}
                <div
                    style={{
                        marginTop: 16,
                        padding: '10px 14px',
                        borderRadius: 10,
                        background: 'rgba(99,102,241,0.08)',
                        border: '1px solid rgba(99,102,241,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                    }}
                >
                    <HiOutlineCpuChip style={{ width: 16, height: 16, color: '#6366f1', flexShrink: 0 }} />
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>ESP32 Ready:</strong>{' '}
                        The barcode scanner can POST to <code style={{ fontFamily: 'monospace', color: '#818cf8' }}>
                            /api/scan
                        </code> with a barcode string. The backend will look up the book in MongoDB Atlas, update the transaction, and return the result.
                    </p>
                </div>
            </div>

            {/* Test Result */}
            {testResult && (
                <div
                    className="glass-card"
                    style={{
                        padding: 20,
                        borderLeft: `4px solid ${testResult.success ? '#10b981' : '#ef4444'}`,
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        {testResult.success ? (
                            <HiOutlineCheckCircle style={{ width: 24, height: 24, color: '#10b981' }} />
                        ) : (
                            <HiOutlineExclamationTriangle style={{ width: 24, height: 24, color: '#ef4444' }} />
                        )}
                        <div>
                            <p style={{ fontWeight: 700, fontSize: '0.875rem', color: testResult.success ? '#10b981' : '#ef4444' }}>
                                {testResult.success ? 'API Test Passed ✓' : 'API Test Failed ✗'}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{testResult.message}</p>
                        </div>
                    </div>

                    {testResult.success && testResult.bindings.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                SAMPLE RESPONSE (first book)
                            </p>
                            <div className="firebase-bindings-grid">
                                {testResult.bindings.map((b) => (
                                    <div key={b.field} style={{ padding: 12, borderRadius: 12, background: 'var(--bg-tertiary)' }}>
                                        <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            {b.label}
                                        </p>
                                        <p style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: 4, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                                            {b.value}
                                        </p>
                                        <p style={{ fontSize: '10px', fontFamily: 'monospace', color: '#34d399', marginTop: 2 }}>
                                            {b.field}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Two-column section: Fetch by ID + All Books */}
            <div className="scanner-grid">
                {/* ── Fetch Single Book by ID ── */}
                <div className="glass-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <HiOutlineMagnifyingGlass style={{ width: 20, height: 20, color: '#06b6d4' }} />
                        <h2 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            Fetch Book by ID
                        </h2>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                        Enter a MongoDB <code style={{ fontFamily: 'monospace', color: '#818cf8' }}>_id</code> (24-char hex) to call{' '}
                        <code style={{ fontFamily: 'monospace', color: '#34d399' }}>GET /api/books/:id</code> and display bound fields.
                    </p>
                    <form onSubmit={handleFetchBook} style={{ display: 'flex', gap: 8 }}>
                        <input
                            type="text"
                            value={searchId}
                            onChange={(e) => setSearchId(e.target.value)}
                            placeholder="e.g. 64f2c1a3bcd1234567890abc"
                            className="input-field"
                            style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }}
                        />
                        <button type="submit" disabled={searchLoading} className="btn btn-primary">
                            {searchLoading ? (
                                <span
                                    style={{
                                        width: 16, height: 16,
                                        border: '2px solid rgba(255,255,255,0.3)',
                                        borderTopColor: 'white',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite',
                                        display: 'block',
                                    }}
                                />
                            ) : 'Fetch'}
                        </button>
                    </form>

                    {/* Tip: copy ID from books list */}
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
                        💡 Tip: Copy an ID from the All Books list on the right, or from the
                        <strong> Books</strong> page.
                    </p>

                    {/* Result */}
                    {singleBook && <BookDetailCard book={singleBook} />}
                </div>

                {/* ── All Books from MongoDB ── */}
                <div className="glass-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <HiOutlineBookOpen style={{ width: 20, height: 20, color: '#10b981' }} />
                        <h2 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            All Library Books
                        </h2>
                        <span
                            style={{
                                marginLeft: 'auto',
                                fontSize: '0.72rem',
                                padding: '2px 10px',
                                borderRadius: 9999,
                                background: 'var(--bg-tertiary)',
                                color: 'var(--text-muted)',
                            }}
                        >
                            {books.length} record{books.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {loading ? (
                        <LoadingSpinner text="Fetching from Library Data Engine..." />
                    ) : books.length > 0 ? (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                                maxHeight: 520,
                                overflowY: 'auto',
                                paddingRight: 4,
                            }}
                        >
                            {books.map((book) => (
                                <div
                                    key={book._id}
                                    style={{
                                        padding: '14px 16px',
                                        borderRadius: 12,
                                        background: 'var(--bg-tertiary)',
                                        cursor: 'pointer',
                                        transition: 'transform 0.15s, box-shadow 0.15s',
                                        border: '1px solid var(--border-color)',
                                    }}
                                    onClick={() => setSearchId(book._id)}
                                    title="Click to copy ID to Fetch field"
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = '';
                                        e.currentTarget.style.boxShadow = '';
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'space-between',
                                            gap: 12,
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {/* Barcode + Category */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                                                <code
                                                    style={{
                                                        fontSize: '0.65rem',
                                                        fontFamily: 'monospace',
                                                        padding: '1px 6px',
                                                        borderRadius: 4,
                                                        background: 'var(--bg-secondary)',
                                                        color: '#34d399',
                                                    }}
                                                >
                                                    {book.barcode}
                                                </code>
                                                <span
                                                    style={{
                                                        fontSize: '0.65rem',
                                                        padding: '1px 6px',
                                                        borderRadius: 4,
                                                        background: 'rgba(99,102,241,0.1)',
                                                        color: '#818cf8',
                                                    }}
                                                >
                                                    {book.category}
                                                </span>
                                            </div>
                                            {/* Title */}
                                            <p
                                                style={{
                                                    fontWeight: 700,
                                                    fontSize: '0.9rem',
                                                    color: 'var(--text-primary)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {book.title}
                                            </p>
                                            {/* Author */}
                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                                by {book.author}
                                            </p>
                                        </div>
                                        {/* Availability badge */}
                                        <AvailabilityBadge book={book} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '48px 0' }}>
                            <HiOutlineCircleStack
                                style={{ width: 48, height: 48, margin: '0 auto 12px', color: 'var(--text-muted)' }}
                            />
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                No books found in Library Data Engine
                            </p>
                            <button onClick={fetchAllBooks} className="btn btn-secondary" style={{ marginTop: 12 }}>
                                Retry
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MongoDBBooksPage;
