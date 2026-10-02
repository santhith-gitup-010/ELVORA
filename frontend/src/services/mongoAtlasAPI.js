/**
 * MongoDB Atlas REST API Service
 * Wraps the ELVORA Express backend (which connects to MongoDB Atlas).
 *
 * Base URL  : http://localhost:5000/api  (or VITE_API_URL)
 * Auth      : Bearer JWT (auto-attached by api.js interceptor)
 *
 * Field Bindings (MongoDB Book document → UI label):
 *   title          → Book Title
 *   author         → Author Name
 *   availableCount → Availability
 *   totalCount     → Total Copies
 *   category       → Category
 *   barcode        → Barcode/ID
 *   status         → Issue Status  (derived: availableCount < totalCount)
 */

import api from './api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Field Binding Map ────────────────────────────────────────────────────────
// Maps MongoDB document keys → human-readable UI labels
export const MONGO_FIELD_BINDINGS = {
    title:          'Book Title',
    author:         'Author Name',
    availableCount: 'Availability',
    totalCount:     'Total Copies',
    category:       'Category',
    barcode:        'Barcode / ID',
    status:         'Issue Status',
};

// ─── Derive human-readable status ─────────────────────────────────────────────
export const getBookStatus = (book) => {
    if (!book) return 'Unknown';
    if (book.availableCount <= 0) return 'Fully Issued';
    if (book.availableCount < book.totalCount) return 'Partially Available';
    return 'All Available';
};

// ─── GET all books ─────────────────────────────────────────────────────────────
// Returns { books, pagination }
export const getAllMongoBooks = async (params = {}) => {
    const res = await api.get('/books', { params: { limit: 50, ...params } });
    return res.data.data; // { books: [...], pagination: {...} }
};

// ─── GET book by MongoDB _id ───────────────────────────────────────────────────
// Returns the book document
export const getMongoBookById = async (id) => {
    if (!id || !id.trim()) throw new Error('Book ID is required');
    const trimmed = id.trim();
    const res = await api.get(`/books/${trimmed}`);
    return res.data.data.book;
};

// ─── GET book by Barcode ───────────────────────────────────────────────────────
export const getMongoBookByBarcode = async (barcode) => {
    const res = await api.get(`/books/barcode/${barcode}`);
    return res.data.data.book;
};

// ─── Test connection to MongoDB Atlas via backend ─────────────────────────────
// Fetches the first book to verify the REST API + DB are live
export const testMongoConnection = async () => {
    try {
        const data = await getAllMongoBooks({ limit: 1 });
        const book = data.books?.[0] || null;
        return {
            success: true,
            message: `Library Data Engine connected — ${data.pagination?.total ?? 0} books in database`,
            book,
            bindings: book
                ? Object.entries(MONGO_FIELD_BINDINGS).map(([key, label]) => ({
                    field: key,
                    label,
                    value:
                        key === 'status'
                            ? getBookStatus(book)
                            : book[key] !== undefined
                            ? String(book[key])
                            : 'N/A',
                }))
                : [],
        };
    } catch (err) {
        return {
            success: false,
            message: err.response?.data?.message || err.message,
            book: null,
            bindings: [],
        };
    }
};
