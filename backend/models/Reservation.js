/**
 * Reservation Model
 * Tracks book reservation queue when no copies are available
 */

const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
    reservationId: {
        type: String,
        unique: true,
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: [true, 'Student reference is required']
    },
    book: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: [true, 'Book reference is required']
    },
    status: {
        type: String,
        enum: ['pending', 'ready', 'fulfilled', 'cancelled', 'expired'],
        default: 'pending'
    },
    position: {
        type: Number,
        required: true,
        min: 1
    },
    expectedDate: {
        type: Date,
        default: null
    },
    notifiedAt: {
        type: Date,
        default: null
    },
    fulfilledAt: {
        type: Date,
        default: null
    },
    expiresAt: {
        type: Date,
        default: null
    },
    autoIssue: {
        type: Boolean,
        default: false
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    }
}, {
    timestamps: true
});

// Auto-generate reservation ID
reservationSchema.pre('validate', function () {
    if (!this.reservationId) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.reservationId = `RSV-${timestamp}-${random}`;
    }
});

// Compound index: one active reservation per student per book
reservationSchema.index(
    { student: 1, book: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: { $in: ['pending', 'ready'] } } }
);

reservationSchema.index({ book: 1, status: 1, position: 1 });
reservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Reservation', reservationSchema);
