/**
 * Books Management Page
 * Full CRUD with search, filters, barcode display, and QR codes
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { booksAPI } from '../services/api';
import Modal from '../components/common/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
    HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash,
    HiOutlineMagnifyingGlass, HiOutlineQrCode, HiOutlineFunnel,
    HiOutlineBookOpen, HiOutlineEye
} from 'react-icons/hi2';

const CATEGORIES = [
    'Fiction', 'Non-Fiction', 'Science', 'Technology', 'Engineering',
    'Mathematics', 'History', 'Literature', 'Arts', 'Business',
    'Medicine', 'Law', 'Education', 'Philosophy', 'Psychology',
    'Computer Science', 'Other'
];

const BooksPage = () => {
    const navigate = useNavigate();
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [showQR, setShowQR] = useState(null);
    const [editBook, setEditBook] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [form, setForm] = useState({
        title: '', author: '', category: 'Computer Science',
        totalCount: 1, isbn: '', publisher: '', edition: '',
        description: '', location: 'Shelf A-1'
    });

    useEffect(() => {
        fetchBooks();
    }, [search, category, pagination.page]);

    const fetchBooks = async () => {
        try {
            const res = await booksAPI.getAll({
                search: search || undefined,
                category: category !== 'all' ? category : undefined,
                page: pagination.page,
                limit: 15
            });
            setBooks(res.data.data.books);
            setPagination(res.data.data.pagination);
        } catch (err) {
            toast.error('Failed to load books');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editBook) {
                await booksAPI.update(editBook._id, form);
                toast.success('Book updated successfully');
            } else {
                await booksAPI.create(form);
                toast.success('Book added successfully');
            }
            setShowModal(false);
            resetForm();
            fetchBooks();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this book?')) return;
        try {
            await booksAPI.delete(id);
            toast.success('Book deleted');
            fetchBooks();
        } catch (err) {
            toast.error('Failed to delete book');
        }
    };

    const openEdit = (book) => {
        setEditBook(book);
        setForm({
            title: book.title, author: book.author, category: book.category,
            totalCount: book.totalCount, isbn: book.isbn || '', publisher: book.publisher || '',
            edition: book.edition || '', description: book.description || '', location: book.location || ''
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setEditBook(null);
        setForm({
            title: '', author: '', category: 'Computer Science',
            totalCount: 1, isbn: '', publisher: '', edition: '',
            description: '', location: 'Shelf A-1'
        });
    };

    return (
        <div className="page-sections animate-fade-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <HiOutlineBookOpen style={{ width: 28, height: 28, color: '#6366f1', verticalAlign: 'middle' }} />
                        Book Management
                    </h1>
                    <p style={{ fontSize: '0.875rem', marginTop: 4, color: 'var(--text-secondary)' }}>
                        {pagination.total} books in library
                    </p>
                </div>
                <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary">
                    <HiOutlinePlus style={{ width: 20, height: 20 }} /> Add Book
                </button>
            </div>

            {/* Search & Filter */}
            <div className="glass-card" style={{ padding: 16 }}>
                <div className="search-filter-bar">
                    <div className="search-wrapper">
                        <HiOutlineMagnifyingGlass
                            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)' }}
                        />
                        <input
                            type="text"
                            placeholder="Search books by title, author, barcode..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                            className="input-field"
                            style={{ paddingLeft: 40 }}
                        />
                    </div>
                    <div className="filter-wrapper">
                        <HiOutlineFunnel
                            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: 'var(--text-muted)', zIndex: 1 }}
                        />
                        <select
                            value={category}
                            onChange={(e) => { setCategory(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                            className="input-field"
                            style={{ paddingLeft: 40, minWidth: 180 }}
                        >
                            <option value="all">All Categories</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Books Table */}
            {loading ? <LoadingSpinner /> : (
                <div className="glass-card" style={{ overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Author</th>
                                    <th>Category</th>
                                    <th>Barcode</th>
                                    <th>Available</th>
                                    <th>Location</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {books.length > 0 ? books.map((book) => (
                                    <tr key={book._id}>
                                        <td style={{ fontWeight: 500 }}>
                                            <Link to={`/books/${book._id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }} className="hover-underline">
                                                {book.title}
                                            </Link>
                                        </td>
                                        <td>{book.author}</td>
                                        <td>
                                            <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                                                {book.category}
                                            </span>
                                        </td>
                                        <td style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{book.barcode}</td>
                                        <td>
                                            <span style={{ fontWeight: 700, color: book.availableCount > 0 ? '#10b981' : '#ef4444' }}>
                                                {book.availableCount}/{book.totalCount}
                                            </span>
                                        </td>
                                        <td style={{ fontSize: '0.75rem' }}>{book.location}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button onClick={() => navigate(`/books/${book._id}`)} className="btn-icon btn-secondary" title="View Details">
                                                    <HiOutlineEye style={{ width: 16, height: 16 }} />
                                                </button>
                                                <button onClick={() => setShowQR(book)} className="btn-icon btn-secondary" title="View QR/Barcode">
                                                    <HiOutlineQrCode style={{ width: 16, height: 16 }} />
                                                </button>
                                                <button onClick={() => openEdit(book)} className="btn-icon btn-secondary" title="Edit">
                                                    <HiOutlinePencilSquare style={{ width: 16, height: 16 }} />
                                                </button>
                                                <button onClick={() => handleDelete(book._id)} className="btn-icon btn-secondary" style={{ color: '#f87171' }} title="Delete">
                                                    <HiOutlineTrash style={{ width: 16, height: 16 }} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
                                            No books found. Try a different search or add a new book.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="pagination-bar">
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                Page {pagination.page} of {pagination.pages} ({pagination.total} books)
                            </p>
                            <div className="btn-group">
                                <button onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} disabled={pagination.page <= 1} className="btn btn-secondary btn-sm">
                                    Previous
                                </button>
                                <button onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} disabled={pagination.page >= pagination.pages} className="btn btn-secondary btn-sm">
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); resetForm(); }}
                title={editBook ? 'Edit Book' : 'Add New Book'}
                size="lg"
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-grid">
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Title *</label>
                            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field" required />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Author *</label>
                            <input type="text" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} className="input-field" required />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Category *</label>
                            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field">
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Total Copies *</label>
                            <input type="number" min={1} value={form.totalCount} onChange={e => setForm({ ...form, totalCount: parseInt(e.target.value) || 1 })} className="input-field" required />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>ISBN</label>
                            <input type="text" value={form.isbn} onChange={e => setForm({ ...form, isbn: e.target.value })} className="input-field" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Publisher</label>
                            <input type="text" value={form.publisher} onChange={e => setForm({ ...form, publisher: e.target.value })} className="input-field" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Edition</label>
                            <input type="text" value={form.edition} onChange={e => setForm({ ...form, edition: e.target.value })} className="input-field" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Location</label>
                            <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input-field" />
                        </div>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 4, color: 'var(--text-secondary)' }}>Description</label>
                        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={3} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                        <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary">
                            {editBook ? 'Update Book' : 'Add Book'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* QR Code Modal */}
            <Modal isOpen={!!showQR} onClose={() => setShowQR(null)} title="Book QR Code" size="sm">
                {showQR && (
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ padding: 24, borderRadius: 12, display: 'inline-block', background: 'white', margin: '0 auto' }}>
                            <QRCodeSVG
                                value={JSON.stringify({ barcode: showQR.barcode, title: showQR.title, system: 'ELVORA' })}
                                size={200}
                                level="H"
                            />
                        </div>
                        <div>
                            <p style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{showQR.title}</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{showQR.author}</p>
                            <p style={{
                                fontFamily: 'monospace', fontSize: '0.875rem', marginTop: 8,
                                padding: '6px 12px', borderRadius: 8, display: 'inline-block',
                                background: 'var(--bg-tertiary)', color: 'var(--text-primary)'
                            }}>
                                {showQR.barcode}
                            </p>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default BooksPage;
