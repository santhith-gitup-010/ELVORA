/**
 * AuditLog Model
 * Immutable record of all library transactions and administrative actions
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: [
            'book_issued', 'book_returned', 'book_reserved', 'book_created',
            'book_updated', 'book_deleted', 'reservation_cancelled',
            'reservation_fulfilled', 'reservation_expired',
            'student_created', 'student_updated', 'student_deleted',
            'scan_processed', 'qr_generated', 'qr_rotated',
            'user_login', 'user_logout', 'overdue_flagged',
            'fine_calculated', 'fine_paid'
        ]
    },
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    actorName: {
        type: String,
        default: 'System'
    },
    targetType: {
        type: String,
        enum: ['book', 'student', 'transaction', 'reservation', 'user', 'system'],
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ip: {
        type: String,
        default: ''
    },
    userAgent: {
        type: String,
        default: ''
    },
    success: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// Static helper to log an action
auditLogSchema.statics.logAction = async function (data) {
    try {
        return await this.create(data);
    } catch (err) {
        console.error('Audit log write failed:', err.message);
        return null;
    }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
