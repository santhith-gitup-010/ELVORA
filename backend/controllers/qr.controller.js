/**
 * QR Code Controller
 * Handles QR code generation, token management, and book lookup by QR
 */

const Book = require('../models/Book');
const AuditLog = require('../models/AuditLog');
const {
    generateQRToken,
    verifyQRToken,
    buildBookURL,
    buildShortLink,
    buildBarcodeURL,
    generateQRCodeDataURL,
    generateQRCodeSVG,
    generateQRCodeBuffer
} = require('../utils/qrGenerator');

// Simple in-memory cache for QR images (production would use Redis)
const qrCache = new Map();
const CACHE_TTL = 3600000; // 1 hour

function getCached(key) {
    const entry = qrCache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.data;
    }
    qrCache.delete(key);
    return null;
}

function setCache(key, data) {
    qrCache.set(key, { data, timestamp: Date.now() });
    // Evict old entries periodically
    if (qrCache.size > 500) {
        const oldest = [...qrCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
        for (let i = 0; i < 100; i++) qrCache.delete(oldest[i][0]);
    }
}

/**
 * GET /api/books/:id/qr
 * Generate QR code for a book (returns PNG data URL by default)
 */
exports.getBookQR = async (req, res) => {
    try {
        const { format = 'dataurl', width = 300 } = req.query;
        const book = await Book.findById(req.params.id);

        if (!book) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Book not found' }
            });
        }

        // Ensure QR token exists
        if (!book.qr_token) {
            book.qr_token = generateQRToken();
            book.qr_token_created_at = new Date();
            await book.save();
        }

        const bookURL = buildBookURL(book.qr_token);
        const cacheKey = `${book.qr_token}_${format}_${width}`;

        if (format === 'svg') {
            let svg = getCached(cacheKey);
            if (!svg) {
                svg = await generateQRCodeSVG(bookURL, { width: parseInt(width) });
                setCache(cacheKey, svg);
            }
            res.set('Content-Type', 'image/svg+xml');
            res.set('Cache-Control', 'public, max-age=3600');
            return res.send(svg);
        }

        if (format === 'png') {
            let buffer = getCached(cacheKey);
            if (!buffer) {
                buffer = await generateQRCodeBuffer(bookURL, { width: parseInt(width) });
                setCache(cacheKey, buffer);
            }
            res.set('Content-Type', 'image/png');
            res.set('Cache-Control', 'public, max-age=3600');
            return res.send(buffer);
        }

        // Default: data URL
        let dataUrl = getCached(cacheKey);
        if (!dataUrl) {
            dataUrl = await generateQRCodeDataURL(bookURL, { width: parseInt(width) });
            setCache(cacheKey, dataUrl);
        }

        res.json({
            success: true,
            data: {
                qr_token: book.qr_token,
                url: bookURL,
                barcodeUrl: buildBarcodeURL(book.barcode),
                shortLink: buildShortLink(book.qr_token),
                qrDataUrl: dataUrl,
                format: 'dataurl',
                createdAt: book.qr_token_created_at
            }
        });
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'QR code generation failed.', details: error.message }
        });
    }
};

/**
 * POST /api/books/:id/qr/rotate
 * Rotate (regenerate) QR token for a book
 */
exports.rotateQRToken = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Book not found' }
            });
        }

        const oldToken = book.qr_token;
        book.qr_token = generateQRToken();
        book.qr_token_created_at = new Date();
        await book.save();

        // Invalidate cache
        for (const key of qrCache.keys()) {
            if (key.startsWith(oldToken)) qrCache.delete(key);
        }

        // Audit
        await AuditLog.logAction({
            action: 'qr_rotated',
            actor: req.user?._id,
            actorName: req.user?.name || 'System',
            targetType: 'book',
            targetId: book._id,
            details: { bookTitle: book.title, oldToken: oldToken?.substring(0, 12) + '...' },
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        const bookURL = buildBookURL(book.qr_token);
        const qrDataUrl = await generateQRCodeDataURL(bookURL);

        res.json({
            success: true,
            message: 'QR token rotated successfully.',
            data: {
                qr_token: book.qr_token,
                url: bookURL,
                shortLink: buildShortLink(book.qr_token),
                qrDataUrl,
                rotatedAt: book.qr_token_created_at
            }
        });
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Token rotation failed.' }
        });
    }
};

/**
 * GET /api/books/qr/:token
 * Look up a book by its QR token (public-facing, used when QR is scanned)
 */
exports.getBookByQRToken = async (req, res) => {
    try {
        const { token } = req.params;

        // Verify token signature
        if (!verifyQRToken(token)) {
            return res.status(400).json({
                error: { code: 'INVALID_TOKEN', message: 'QR token signature verification failed.' }
            });
        }

        const book = await Book.findOne({ qr_token: token });
        if (!book) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'No book found for this QR code.' }
            });
        }

        // Return public-safe fields only
        res.json({
            success: true,
            data: {
                book: {
                    id: book._id,
                    title: book.title,
                    author: book.author,
                    category: book.category,
                    isbn: book.isbn,
                    publisher: book.publisher,
                    edition: book.edition,
                    summary: book.summary || book.description,
                    totalCount: book.totalCount,
                    availableCount: book.availableCount,
                    status: book.status,
                    location: book.location,
                    barcode: book.barcode,
                    digital_url: book.digital_access_policy !== 'none' ? book.digital_url : undefined,
                    digital_access_policy: book.digital_access_policy
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to look up QR code.' }
        });
    }
};
