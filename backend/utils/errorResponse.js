/**
 * Consistent Error Response Utility
 * Ensures all API errors follow the shape: { error: { code, message, details? } }
 */

class AppError extends Error {
    constructor(message, statusCode, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code || 'UNKNOWN_ERROR';
        this.details = details || null;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Common error factory methods
const errors = {
    badRequest: (message, details) =>
        new AppError(message || 'Bad request', 400, 'BAD_REQUEST', details),

    unauthorized: (message) =>
        new AppError(message || 'Unauthorized', 401, 'UNAUTHORIZED'),

    forbidden: (message) =>
        new AppError(message || 'Forbidden', 403, 'FORBIDDEN'),

    notFound: (resource, identifier) =>
        new AppError(
            `${resource || 'Resource'} not found${identifier ? `: ${identifier}` : ''}`,
            404,
            'NOT_FOUND',
            { resource, identifier }
        ),

    conflict: (message, details) =>
        new AppError(message || 'Conflict', 409, 'CONFLICT', details),

    tooManyRequests: (message) =>
        new AppError(message || 'Too many requests', 429, 'RATE_LIMIT_EXCEEDED'),

    internal: (message) =>
        new AppError(message || 'Internal server error', 500, 'INTERNAL_ERROR'),

    validation: (fields) =>
        new AppError('Validation failed', 422, 'VALIDATION_ERROR', { fields }),
};

/**
 * Format error for API response
 */
function formatError(err) {
    if (err instanceof AppError) {
        const body = {
            error: {
                code: err.code,
                message: err.message,
            }
        };
        if (err.details) body.error.details = err.details;
        return { statusCode: err.statusCode, body };
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const fields = Object.keys(err.errors).map(key => ({
            field: key,
            message: err.errors[key].message
        }));
        return {
            statusCode: 422,
            body: {
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed',
                    details: { fields }
                }
            }
        };
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern || {})[0] || 'unknown';
        return {
            statusCode: 409,
            body: {
                error: {
                    code: 'DUPLICATE_KEY',
                    message: `Duplicate value for: ${field}`,
                    details: { field }
                }
            }
        };
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        return {
            statusCode: 400,
            body: {
                error: {
                    code: 'INVALID_ID',
                    message: `Invalid ${err.path}: ${err.value}`
                }
            }
        };
    }

    // Generic fallback
    return {
        statusCode: 500,
        body: {
            error: {
                code: 'INTERNAL_ERROR',
                message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
            }
        }
    };
}

module.exports = { AppError, errors, formatError };
