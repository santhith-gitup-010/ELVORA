import { useState, useEffect } from 'react';
import { transactionsAPI, booksAPI, studentsAPI } from '../services/api';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { HiOutlineArrowsRightLeft, HiOutlineMagnifyingGlass, HiOutlineFunnel, HiOutlinePlus, HiOutlineArrowUturnLeft } from 'react-icons/hi2';

const TransactionsPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [books, setBooks] = useState([]);
    const [students, setStudents] = useState([]);
    const [issueForm, setIssueForm] = useState({ studentId: '', bookId: '', notes: '' });

    useEffect(() => { fetchTransactions(); }, [search, statusFilter, pagination.page]);

    const fetchTransactions = async () => {
        try {
            const res = await transactionsAPI.getAll({ search: search || undefined, status: statusFilter !== 'all' ? statusFilter : undefined, page: pagination.page, limit: 15 });
            setTransactions(res.data.data.transactions);
            setPagination(res.data.data.pagination);
        } catch { toast.error('Failed to load transactions'); } finally { setLoading(false); }
    };

    const openIssueModal = async () => {
        try {
            const [bRes, sRes] = await Promise.all([booksAPI.getAll({ limit: 100 }), studentsAPI.getAll({ limit: 100 })]);
            setBooks(bRes.data.data.books.filter(b => b.availableCount > 0));
            setStudents(sRes.data.data.students);
            setShowIssueModal(true);
        } catch { toast.error('Failed to load data'); }
    };

    const handleIssue = async (e) => {
        e.preventDefault();
        try {
            await transactionsAPI.issue(issueForm);
            toast.success('Book issued successfully');
            setShowIssueModal(false);
            setIssueForm({ studentId: '', bookId: '', notes: '' });
            fetchTransactions();
        } catch (err) { toast.error(err.response?.data?.message || 'Issue failed'); }
    };

    const handleReturn = async (id) => {
        if (!confirm('Confirm book return?')) return;
        try {
            const res = await transactionsAPI.return(id);
            toast.success(res.data.message);
            fetchTransactions();
        } catch (err) { toast.error(err.response?.data?.message || 'Return failed'); }
    };

    return (
        <div className="page-sections animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <HiOutlineArrowsRightLeft style={{ width: 28, height: 28, color: '#3b82f6', verticalAlign: 'middle' }} /> Transactions
                    </h1>
                    <p style={{ fontSize: '0.875rem', marginTop: 4, color: 'var(--text-secondary)' }}>{pagination.total} total transactions</p>
                </div>
                <button onClick={openIssueModal} className="btn btn-primary"><HiOutlinePlus style={{ width: 20, height: 20 }} /> Issue Book</button>
            </div>

            <div className="glass-card" style={{ padding: 16 }}>
                <div className="search-filter-bar">
                    <div className="search-wrapper">
                        <HiOutlineMagnifyingGlass style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }} />
                        <input type="text" placeholder="Search by ID, student, book..." value={search} onChange={e => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="input-field" style={{ paddingLeft: 40 }} />
                    </div>
                    <div className="filter-wrapper">
                        <HiOutlineFunnel style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)', zIndex: 1 }} />
                        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }} className="input-field" style={{ paddingLeft: 40, minWidth: 160 }}>
                            <option value="all">All Status</option>
                            <option value="issued">Issued</option>
                            <option value="returned">Returned</option>
                            <option value="overdue">Overdue</option>
                        </select>
                    </div>
                </div>
            </div>

            {loading ? <LoadingSpinner /> : (
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead><tr><th>Transaction ID</th><th>Student</th><th>Book</th><th>Issue Date</th><th>Due Date</th><th>Status</th><th>Fine</th><th>Actions</th></tr></thead>
                            <tbody>
                                {transactions.length > 0 ? transactions.map(t => (
                                    <tr key={t._id}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{t.transactionId}</td>
                                        <td>
                                            <div>
                                                <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{t.student?.name || 'N/A'}</p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.student?.studentId}</p>
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                <p style={{ fontWeight: 500, fontSize: '0.875rem' }}>{t.book?.title || 'N/A'}</p>
                                                <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{t.book?.barcode}</p>
                                            </div>
                                        </td>
                                        <td style={{ fontSize: '0.75rem' }}>{new Date(t.issueDate).toLocaleDateString()}</td>
                                        <td style={{ fontSize: '0.75rem' }}>{new Date(t.dueDate).toLocaleDateString()}</td>
                                        <td><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                                        <td style={{ fontWeight: 700, color: t.fineAmount > 0 ? '#ef4444' : '#10b981' }}>{t.fineAmount > 0 ? `₹${t.fineAmount}` : '—'}</td>
                                        <td>
                                            {t.status !== 'returned' && (
                                                <button onClick={() => handleReturn(t._id)} className="btn btn-success btn-sm" title="Return Book">
                                                    <HiOutlineArrowUturnLeft style={{ width: 16, height: 16 }} /> Return
                                                </button>
                                            )}
                                            {t.status === 'returned' && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Completed</span>}
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan={8} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>No transactions found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {pagination.pages > 1 && (
                        <div className="pagination-bar">
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Page {pagination.page} of {pagination.pages}</p>
                            <div className="btn-group">
                                <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page <= 1} className="btn btn-secondary btn-sm">Previous</button>
                                <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= pagination.pages} className="btn btn-secondary btn-sm">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <Modal isOpen={showIssueModal} onClose={() => setShowIssueModal(false)} title="Issue Book to Student">
                <form onSubmit={handleIssue} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Select Student *</label>
                        <select value={issueForm.studentId} onChange={e => setIssueForm({ ...issueForm, studentId: e.target.value })} className="input-field" required>
                            <option value="">Choose a student...</option>
                            {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.studentId}) - {s.department}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Select Book *</label>
                        <select value={issueForm.bookId} onChange={e => setIssueForm({ ...issueForm, bookId: e.target.value })} className="input-field" required>
                            <option value="">Choose a book...</option>
                            {books.map(b => <option key={b._id} value={b._id}>{b.title} by {b.author} ({b.availableCount} available)</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Notes</label>
                        <textarea value={issueForm.notes} onChange={e => setIssueForm({ ...issueForm, notes: e.target.value })} className="input-field" rows={2} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                        <button type="button" onClick={() => setShowIssueModal(false)} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary">Issue Book</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TransactionsPage;
