/**
 * Transaction Model
 * Tracks book issue/return operations with fine calculation
 */

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    transactionId: {
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
    issueDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    returnDate: {
        type: Date,
        default: null
    },
    status: {
        type: String,
        enum: ['issued', 'returned', 'overdue'],
        default: 'issued'
    },
    fineAmount: {
        type: Number,
        default: 0,
        min: 0
    },
    finePaid: {
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

// Auto-generate transaction ID
transactionSchema.pre('validate', function () {
    if (!this.transactionId) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.transactionId = `TXN-${timestamp}-${random}`;
    }
});

// Auto-set due date (14 days from issue)
transactionSchema.pre('validate', function () {
    if (!this.dueDate && this.issueDate) {
        const loanDays = parseInt(process.env.LOAN_PERIOD_DAYS) || 14;
        this.dueDate = new Date(this.issueDate.getTime() + loanDays * 24 * 60 * 60 * 1000);
    }
});

// Calculate fine on return
transactionSchema.methods.calculateFine = function () {
    const finePerDay = parseInt(process.env.FINE_PER_DAY) || 5;
    const now = this.returnDate || new Date();

    if (now > this.dueDate) {
        const overdueDays = Math.ceil((now - this.dueDate) / (1000 * 60 * 60 * 24));
        this.fineAmount = overdueDays * finePerDay;
        this.status = this.returnDate ? 'returned' : 'overdue';
    }

    return this.fineAmount;
};

module.exports = mongoose.model('Transaction', transactionSchema);
