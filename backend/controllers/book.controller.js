/**
 * Enhanced Book Controller
 * CRUD operations with QR token support, borrower history, reservation queue,
 * digital access, audit logging, and SSE broadcasting
 */

const Book = require('../models/Book');
const Transaction = require('../models/Transaction');
const Reservation = require('../models/Reservation');
const AuditLog = require('../models/AuditLog');
const sseManager = require('../utils/sseManager');
const { generateQRToken, buildBookURL, buildShortLink, buildBarcodeURL, generateQRCodeDataURL } = require('../utils/qrGenerator');

/**
 * GET /api/books
 * List all books with search, filter, availability, and pagination
 */
exports.getAllBooks = async (req, res) => {
    try {
        const { search, category, availability, page = 1, limit = 20, sort = '-createdAt' } = req.query;

        let query = {};

        // Text search
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { author: { $regex: search, $options: 'i' } },
                { barcode: { $regex: search, $options: 'i' } },
                { isbn: { $regex: search, $options: 'i' } },
                { qr_token: { $regex: search, $options: 'i' } }
            ];
        }

        // Category filter
        if (category && category !== 'all') {
            query.category = category;
        }

        // Availability filter
        if (availability === 'available') {
            query.availableCount = { $gt: 0 };
        } else if (availability === 'unavailable') {
            query.availableCount = 0;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Book.countDocuments(query);
        const books = await Book.find(query)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: {
                books,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit)),
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch books.', details: error.message }
        });
    }
};

/**
 * GET /api/books/:id
 * Get single book with full metadata, borrower history, reservation queue, digital links
 */
exports.getBook = async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Book not found.' }
            });
        }

        // Get borrower history (last 20 transactions)
        const borrowerHistory = await Transaction.find({ book: book._id })
            .populate('student', 'name studentId department')
            .sort('-createdAt')
            .limit(20)
            .select('transactionId student issueDate dueDate returnDate status fineAmount');

        // Active issues
        const activeIssues = await Transaction.find({
            book: book._id,
            status: { $in: ['issued', 'overdue'] }
        }).populate('student', 'name studentId department');

        // Reservation queue
        const reservationQueue = await Reservation.find({
            book: book._id,
            status: { $in: ['pending', 'ready'] }
        }).populate('student', 'name studentId').sort('position');

        // Build QR URL
        const qrUrl = book.qr_token ? buildBookURL(book.qr_token) : null;
        const shortLink = book.qr_token ? buildShortLink(book.qr_token) : null;

        // Digital access
        const digitalAccess = book.digital_url && book.digital_access_policy !== 'none'
            ? { url: book.digital_url, policy: book.digital_access_policy }
            : null;

        res.json({
            success: true,
            data: {
                book: {
                    ...book.toJSON(),
                    qrUrl,
                    barcodeUrl: buildBarcodeURL(book.barcode),
                    shortLink,
                    digitalAccess,
                    issueStatus: book.status
                },
                borrowerHistory,
                activeIssues,
                reservationQueue,
                reservationCount: reservationQueue.length
            }
        });
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch book.', details: error.message }
        });
    }
};

/**
 * POST /api/books
 * Add a new book to the library
 */
exports.createBook = async (req, res) => {
    try {
        const { title, author, category, totalCount, isbn, publisher, edition, description, summary, location, digital_url, digital_access_policy } = req.body;

        const barcode = 'ELV-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
        const qr_token = generateQRToken();

        const book = await Book.create({
            title, author, category,
            totalCount, availableCount: totalCount,
            isbn, publisher, edition, description, summary, location,
            barcode, qr_token, qr_token_created_at: new Date(),
            digital_url: digital_url || '',
            digital_access_policy: digital_access_policy || 'none'
        });

        // Audit log
        await AuditLog.logAction({
            action: 'book_created',
            actor: req.user?._id,
            actorName: req.user?.name || 'System',
            targetType: 'book',
            targetId: book._id,
            details: { title, author, totalCount, barcode },
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        sseManager.broadcastBookUpdate(book);

        res.status(201).json({
            success: true,
            message: 'Book added successfully.',
            data: { book }
        });
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to add book.', details: error.message }
        });
    }
};

/**
 * PUT /api/books/:id
 * Update book details
 */
exports.updateBook = async (req, res) => {
    try {
        const book = await Book.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!book) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Book not found.' }
            });
        }

        await AuditLog.logAction({
            action: 'book_updated',
            actor: req.user?._id,
            actorName: req.user?.name || 'System',
            targetType: 'book',
            targetId: book._id,
            details: { updatedFields: Object.keys(req.body) },
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        sseManager.broadcastBookUpdate(book);

        res.json({
            success: true,
            message: 'Book updated successfully.',
            data: { book }
        });
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to update book.', details: error.message }
        });
    }
};

/**
 * DELETE /api/books/:id
 * Remove book from library
 */
exports.deleteBook = async (req, res) => {
    try {
        const book = await Book.findByIdAndDelete(req.params.id);

        if (!book) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Book not found.' }
            });
        }

        await AuditLog.logAction({
            action: 'book_deleted',
            actor: req.user?._id,
            actorName: req.user?.name || 'System',
            targetType: 'book',
            targetId: book._id,
            details: { title: book.title, barcode: book.barcode },
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        res.json({
            success: true,
            message: 'Book deleted successfully.'
        });
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to delete book.', details: error.message }
        });
    }
};

/**
 * GET /api/books/barcode/:barcode
 * Find book by barcode
 */
exports.getBookByBarcode = async (req, res) => {
    try {
        const book = await Book.findOne({ barcode: req.params.barcode });
        if (!book) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'No book found with this barcode.' }
            });
        }

        res.json({ success: true, data: { book } });
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch book by barcode.' }
        });
    }
};

/**
 * POST /api/books/:id/issue
 * Issue endpoint directly on book resource
 */
exports.issueBook = async (req, res) => {
    try {
        const { studentId, notes } = req.body;
        const bookId = req.params.id;

        const Student = require('../models/Student');
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student not found.' } });
        }

        if (student.booksIssued >= 5) {
            return res.status(400).json({ error: { code: 'LIMIT_REACHED', message: 'Student has reached the maximum book limit (5).' } });
        }

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Book not found.' } });
        }

        if (book.availableCount <= 0) {
            return res.status(400).json({ error: { code: 'NOT_AVAILABLE', message: 'No copies available.' } });
        }

        const existingIssue = await Transaction.findOne({ student: studentId, book: bookId, status: 'issued' });
        if (existingIssue) {
            return res.status(409).json({ error: { code: 'ALREADY_ISSUED', message: 'Already issued to this student.' } });
        }

        const loanDays = parseInt(process.env.LOAN_PERIOD_DAYS) || 14;
        const issueDate = new Date();
        const dueDate = new Date(issueDate.getTime() + loanDays * 24 * 60 * 60 * 1000);

        const transaction = await Transaction.create({
            student: studentId, book: bookId, issueDate, dueDate, status: 'issued', notes: notes || ''
        });

        book.availableCount -= 1;
        await book.save();
        student.booksIssued += 1;
        await student.save();

        await AuditLog.logAction({
            action: 'book_issued', actor: req.user?._id, actorName: req.user?.name || 'System',
            targetType: 'transaction', targetId: transaction._id,
            details: { bookTitle: book.title, studentName: student.name, dueDate },
            ip: req.ip, userAgent: req.get('user-agent')
        });

        sseManager.broadcastBookUpdate(book);
        sseManager.broadcastTransaction('issued', transaction);

        const populated = await Transaction.findById(transaction._id)
            .populate('student', 'name studentId department')
            .populate('book', 'title author barcode');

        res.status(201).json({
            success: true,
            message: `Book "${book.title}" issued to ${student.name}.`,
            data: { transaction: populated }
        });
    } catch (error) {
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to issue book.', details: error.message } });
    }
};

/**
 * POST /api/books/:id/return
 * Return endpoint directly on book resource
 */
exports.returnBook = async (req, res) => {
    try {
        const { studentId } = req.body;
        const bookId = req.params.id;

        const Student = require('../models/Student');
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Student not found.' } });
        }

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Book not found.' } });
        }

        const transaction = await Transaction.findOne({
            student: studentId, book: bookId, status: { $in: ['issued', 'overdue'] }
        });

        if (!transaction) {
            return res.status(400).json({ error: { code: 'NOT_ISSUED', message: 'This book is not issued to this student.' } });
        }

        // Idempotency check
        if (transaction.status === 'returned') {
            return res.json({ success: true, message: 'Book already returned.', data: { transaction } });
        }

        transaction.returnDate = new Date();
        transaction.status = 'returned';
        transaction.calculateFine();
        await transaction.save();

        book.availableCount += 1;
        await book.save();

        if (student.booksIssued > 0) {
            student.booksIssued -= 1;
            await student.save();
        }

        await AuditLog.logAction({
            action: 'book_returned', actor: req.user?._id, actorName: req.user?.name || 'System',
            targetType: 'transaction', targetId: transaction._id,
            details: { bookTitle: book.title, studentName: student.name, fineAmount: transaction.fineAmount },
            ip: req.ip, userAgent: req.get('user-agent')
        });

        // Process reservation queue
        const queueResult = await processReturnQueue(book._id);

        sseManager.broadcastBookUpdate(book);
        sseManager.broadcastTransaction('returned', transaction);

        const populated = await Transaction.findById(transaction._id)
            .populate('student', 'name studentId department')
            .populate('book', 'title author barcode');

        const fineMsg = transaction.fineAmount > 0 ? ` Fine: ₹${transaction.fineAmount}.` : '';

        res.json({
            success: true,
            message: `Book returned successfully.${fineMsg}`,
            data: { transaction: populated, reservationNotified: queueResult ? true : false }
        });
    } catch (error) {
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to return book.', details: error.message } });
    }
};
