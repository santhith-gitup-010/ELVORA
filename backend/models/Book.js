/**
 * Book Model
 * Stores library book information with barcode, QR token, and inventory tracking
 */

const mongoose = require('mongoose');
const { generateQRToken } = require('../utils/qrGenerator');

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Book title is required'],
        trim: true,
        index: true
    },
    author: {
        type: String,
        required: [true, 'Author name is required'],
        trim: true
    },
    isbn: {
        type: String,
        trim: true,
        default: ''
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: [
            'Fiction', 'Non-Fiction', 'Science', 'Technology',
            'Engineering', 'Mathematics', 'History', 'Literature',
            'Arts', 'Business', 'Medicine', 'Law', 'Education',
            'Philosophy', 'Psychology', 'Computer Science', 'Other'
        ],
        default: 'Other'
    },
    barcode: {
        type: String,
        unique: true,
        required: [true, 'Barcode is required']
    },
    qr_token: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    qr_token_created_at: {
        type: Date,
        default: null
    },
    summary: {
        type: String,
        trim: true,
        default: ''
    },
    publisher: {
        type: String,
        trim: true,
        default: ''
    },
    edition: {
        type: String,
        trim: true,
        default: ''
    },
    description: {
        type: String,
        trim: true,
        default: ''
    },
    totalCount: {
        type: Number,
        required: [true, 'Total count is required'],
        min: [1, 'Total count must be at least 1']
    },
    availableCount: {
        type: Number,
        required: true,
        min: [0, 'Available count cannot be negative']
    },
    location: {
        type: String,
        trim: true,
        default: 'Shelf A-1'
    },
    coverImage: {
        type: String,
        default: ''
    },
    digital_url: {
        type: String,
        trim: true,
        default: ''
    },
    digital_access_policy: {
        type: String,
        enum: ['open', 'members_only', 'issued_only', 'none'],
        default: 'none'
    }
}, {
    timestamps: true
});

// Auto-generate barcode if not provided
bookSchema.pre('validate', function () {
    if (!this.barcode) {
        this.barcode = 'ELV-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    }
});

// Auto-generate QR token if not provided
bookSchema.pre('validate', function () {
    if (!this.qr_token) {
        this.qr_token = generateQRToken();
        this.qr_token_created_at = new Date();
    }
});

// Text index for search
bookSchema.index({ title: 'text', author: 'text', isbn: 'text', category: 'text' });
bookSchema.index({ availableCount: 1 });

// Virtual: status based on availability
bookSchema.virtual('status').get(function () {
    if (this.availableCount === 0) return 'Fully Issued';
    if (this.availableCount < this.totalCount) return 'Partially Issued';
    return 'Available';
});

bookSchema.set('toJSON', { virtuals: true });
bookSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Book', bookSchema);
