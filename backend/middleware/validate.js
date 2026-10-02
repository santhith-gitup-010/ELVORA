/**
 * Input Validation Middleware
 * Validates request body fields before reaching controllers
 */

const { errors } = require('../utils/errorResponse');

/**
 * Validate scan request body
 */
const validateScan = (req, res, next) => {
    const { identifier, barcode, studentId, action } = req.body;
    const id = identifier || barcode;
    const errs = [];

    if (!id) {
        errs.push({ field: 'identifier', message: 'identifier (barcode or QR token) is required' });
    } else if (typeof id !== 'string' || id.length < 3 || id.length > 128) {
        errs.push({ field: 'identifier', message: 'identifier must be a string between 3-128 characters' });
    }

    if (action && !['issue', 'return', 'status', 'reserve'].includes(action)) {
        errs.push({ field: 'action', message: 'action must be one of: issue, return, status, reserve' });
    }

    if (errs.length > 0) {
        const e = errors.validation(errs);
        return res.status(e.statusCode).json({ error: { code: e.code, message: e.message, details: { fields: errs } } });
    }

    next();
};

/**
 * Validate book creation/update body
 */
const validateBook = (req, res, next) => {
    const { title, author, category, totalCount } = req.body;
    const errs = [];

    if (req.method === 'POST') {
        if (!title || typeof title !== 'string') errs.push({ field: 'title', message: 'title is required' });
        if (!author || typeof author !== 'string') errs.push({ field: 'author', message: 'author is required' });
        if (!category || typeof category !== 'string') errs.push({ field: 'category', message: 'category is required' });
        if (!totalCount || typeof totalCount !== 'number' || totalCount < 1) {
            errs.push({ field: 'totalCount', message: 'totalCount must be a positive number' });
        }
    }

    if (errs.length > 0) {
        return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: { fields: errs } } });
    }

    next();
};

/**
 * Validate reservation request
 */
const validateReservation = (req, res, next) => {
    const { studentId, autoIssue } = req.body;
    const errs = [];

    if (!studentId) {
        errs.push({ field: 'studentId', message: 'studentId is required' });
    }

    if (autoIssue !== undefined && typeof autoIssue !== 'boolean') {
        errs.push({ field: 'autoIssue', message: 'autoIssue must be a boolean' });
    }

    if (errs.length > 0) {
        return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details: { fields: errs } } });
    }

    next();
};

module.exports = { validateScan, validateBook, validateReservation };
