/**
 * Firebase Books Page
 * Displays books from Firebase Realtime Database external API
 * with field bindings and connection testing
 */

import { useState, useEffect } from 'react';
import { getAllFirebaseBooks, getFirebaseBook, testFirebaseConnection, FIELD_BINDINGS } from '../services/firebaseAPI';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import {
    HiOutlineCloud, HiOutlineCheckCircle, HiOutlineExclamationTriangle,
    HiOutlineArrowPath, HiOutlineMagnifyingGlass, HiOutlineSignal,
    HiOutlineBookOpen, HiOutlineLink, HiOutlineBeaker
} from 'react-icons/hi2';

const FirebaseBooksPage = () => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [testResult, setTestResult] = useState(null);
    const [testing, setTesting] = useState(false);
    const [searchId, setSearchId] = useState('');
    const [singleBook, setSingleBook] = useState(null);
    const [searchLoading, setSearchLoading] = useState(false);

    useEffect(() => { fetchBooks(); }, []);

    const fetchBooks = async () => {
        setLoading(true);
        try { const data = await getAllFirebaseBooks(); setBooks(data); }
        catch (err) { toast.error('Failed to fetch from Firebase: ' + err.message); }
        finally { setLoading(false); }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            const result = await testFirebaseConnection();
            setTestResult(result);
            if (result.success) toast.success('Firebase API test passed!');
            else toast.error('Firebase API test failed: ' + result.message);
        } catch (err) { toast.error('Test failed: ' + err.message); }
        finally { setTesting(false); }
    };

    const handleSearchBook = async (e) => {
        e.preventDefault();
        if (!searchId.trim()) { toast.error('Enter a book ID (e.g. B1)'); return; }
        setSearchLoading(true); setSingleBook(null);
        try {
            const data = await getFirebaseBook(searchId.trim());
            setSingleBook({ id: searchId.trim(), ...data });
            toast.success(`Found: ${data.title}`);
        } catch (err) { toast.error(err.message); }
        finally { setSearchLoading(false); }
    };

    return (
        <div className="page-sections animate-fade-in">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <HiOutlineCloud style={{ width: 28, height: 28, color: '#f97316' }} /> Firebase Books
                    </h1>
                    <p style={{ fontSize: '0.875rem', marginTop: 4, color: 'var(--text-secondary)' }}>
                        External data source — Firebase Realtime Database
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleTest} disabled={testing} className="btn btn-secondary">
                        {testing ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                Testing...
                            </span>
                        ) : (
                            <><HiOutlineBeaker style={{ width: 16, height: 16 }} /> Test API</>
                        )}
                    </button>
                    <button onClick={fetchBooks} className="btn btn-primary">
                        <HiOutlineArrowPath style={{ width: 16, height: 16 }} /> Refresh
                    </button>
                </div>
            </div>

            {/* API Configuration Card */}
            <div className="glass-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <HiOutlineLink style={{ width: 20, height: 20, color: '#6366f1' }} />
                    <h2 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>API Data Source Configuration</h2>
                </div>
                <div className="firebase-config-grid">
                    <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-tertiary)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>METHOD</p>
                        <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700, background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>GET</span>
                    </div>
                    <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-tertiary)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>URL</p>
                        <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--text-primary)' }}>
                            https://smartlibrary-4c139-default-rtdb.firebaseio.com/Books/B1.json
                        </p>
                    </div>
                </div>

                {/* Field Bindings */}
                <div style={{ marginTop: 16 }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>FIELD BINDINGS</p>
                    <div className="chip-grid">
                        {Object.entries(FIELD_BINDINGS).map(([field, label]) => (
                            <div key={field} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', background: 'var(--bg-tertiary)' }}>
                                <code style={{ fontFamily: 'monospace', color: '#818cf8' }}>{field}</code>
                                <span style={{ color: 'var(--text-muted)' }}>→</span>
                                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Test Result */}
            {testResult && (
                <div className="glass-card" style={{ padding: 20, borderLeft: `4px solid ${testResult.success ? '#10b981' : '#ef4444'}` }}>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>RESPONSE DATA (B1)</p>
                            <div style={{ padding: 12, borderRadius: 12, fontFamily: 'monospace', fontSize: '0.75rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(testResult.data, null, 2)}</pre>
                            </div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: 4, color: 'var(--text-muted)' }}>BOUND FIELDS</p>
                            <div className="firebase-bindings-grid">
                                {testResult.bindings.map(b => (
                                    <div key={b.field} style={{ padding: 12, borderRadius: 12, background: 'var(--bg-tertiary)' }}>
                                        <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>{b.label}</p>
                                        <p style={{ fontSize: '0.875rem', fontWeight: 500, marginTop: 2, color: 'var(--text-primary)' }}>{b.value}</p>
                                        <p style={{ fontSize: '10px', fontFamily: 'monospace', color: '#818cf8', marginTop: 2 }}>{b.field}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="scanner-grid">
                {/* Search Single Book */}
                <div className="glass-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <HiOutlineMagnifyingGlass style={{ width: 20, height: 20, color: '#06b6d4' }} />
                        <h2 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Lookup by Book ID</h2>
                    </div>
                    <form onSubmit={handleSearchBook} style={{ display: 'flex', gap: 8 }}>
                        <input type="text" value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="Enter book ID (e.g. B1)" className="input-field" style={{ flex: 1, fontFamily: 'monospace' }} />
                        <button type="submit" disabled={searchLoading} className="btn btn-primary">
                            {searchLoading ? <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : 'Fetch'}
                        </button>
                    </form>

                    {singleBook && (
                        <div style={{ marginTop: 16, padding: 16, borderRadius: 12, background: 'var(--bg-tertiary)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <HiOutlineSignal style={{ width: 16, height: 16, color: '#10b981' }} />
                                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#10b981' }}>Fetched from Firebase</span>
                            </div>
                            <div>
                                <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>{FIELD_BINDINGS['title'] || 'Book Title'}</p>
                                <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>{singleBook.title || 'N/A'}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>{FIELD_BINDINGS['author'] || 'Author Name'}</p>
                                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{singleBook.author || 'N/A'}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>{FIELD_BINDINGS['available'] || 'Availability'}</p>
                                <span className={`badge ${singleBook.available === 'true' ? 'badge-returned' : 'badge-overdue'}`}>
                                    {singleBook.available === 'true' ? 'Available' : 'Unavailable'}
                                </span>
                            </div>
                            <div style={{ paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
                                <p style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' }}>RAW JSON</p>
                                <pre style={{ fontSize: '0.75rem', fontFamily: 'monospace', marginTop: 4, padding: 8, borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                                    {JSON.stringify(singleBook, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* All Books from Firebase */}
                <div className="glass-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <HiOutlineBookOpen style={{ width: 20, height: 20, color: '#f97316' }} />
                        <h2 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>All Firebase Books</h2>
                        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 9999, background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                            {books.length} record{books.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {loading ? <LoadingSpinner text="Fetching from Firebase..." /> : (
                        books.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {books.map((book) => (
                                    <div key={book.id} style={{ padding: 16, borderRadius: 12, background: 'var(--bg-tertiary)', transition: 'transform 0.2s' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <span style={{ fontSize: '10px', fontFamily: 'monospace', padding: '2px 6px', borderRadius: 4, background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                                                        {book.id}
                                                    </span>
                                                </div>
                                                <p style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{book.title || 'No title'}</p>
                                                <p style={{ fontSize: '0.875rem', marginTop: 2, color: 'var(--text-secondary)' }}>by {book.author || 'Unknown'}</p>
                                            </div>
                                            <span className={`badge ${book.available === 'true' ? 'badge-returned' : 'badge-overdue'}`} style={{ flexShrink: 0 }}>
                                                {book.available === 'true' ? 'Available' : 'Unavailable'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '48px 0' }}>
                                <HiOutlineCloud style={{ width: 48, height: 48, margin: '0 auto 12px', color: 'var(--text-muted)' }} />
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No books found in Firebase</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default FirebaseBooksPage;
