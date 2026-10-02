/**
 * Student Model
 * Stores student registration details for library membership
 */

const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    studentId: {
        type: String,
        unique: true,
        required: [true, 'Student ID is required'],
        trim: true
    },
    name: {
        type: String,
        required: [true, 'Student name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    department: {
        type: String,
        required: [true, 'Department is required'],
        enum: [
            'Computer Science', 'Electronics', 'Mechanical',
            'Civil', 'Electrical', 'Information Technology',
            'Chemical', 'Biomedical', 'Aerospace',
            'Arts', 'Commerce', 'Science', 'Other'
        ]
    },
    year: {
        type: Number,
        required: [true, 'Year is required'],
        enum: [1, 2, 3, 4]
    },
    fingerprint: {
        type: String,
        default: '' // Simulated fingerprint hash
    },
    isActive: {
        type: Boolean,
        default: true
    },
    booksIssued: {
        type: Number,
        default: 0,
        max: [5, 'Maximum 5 books can be issued at a time']
    }
}, {
    timestamps: true
});

// Text index for search
studentSchema.index({ name: 'text', studentId: 'text', email: 'text', department: 'text' });

module.exports = mongoose.model('Student', studentSchema);
