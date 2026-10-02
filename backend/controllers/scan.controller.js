/**
 * Enhanced Scan Controller
 * Supports both barcode and QR token scanning
 * Actions: issue, return, status, reserve
 * Includes audit logging and SSE broadcasting
 */

const Book = require('../models/Book');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');
const Reservation = require('../models/Reservation');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const sseManager = require('../utils/sseManager');
const { verifyQRToken } = require('../utils/qrGenerator');
const { processReturnQueue } = require('./reservation.controller');

/**
 * POST /api/scan
 * Process a scanned identifier (barcode or QR token)
 * Body: { identifier: string, studentId?: string, action?: "issue"|"return"|"status"|"reserve" }
 */
exports.processScan = async (req, res) => {
    try {
        const { identifier, barcode, studentId, action } = req.body;
        const id = identifier || barcode;

        if (!id) {
            return res.status(400).json({
                error: { code: 'BAD_REQUEST', message: 'identifier (barcode or QR token) is required.' }
            });
        }

        // Resolve identifier: try QR token first, then barcode
        let book = null;
        let identifierType = 'barcode';

        if (id.startsWith('elvqr_')) {
            // QR token lookup
            if (!verifyQRToken(id)) {
                return res.status(400).json({
                    error: { code: 'INVALID_TOKEN', message: 'QR token signature verification failed.' }
                });
            }
            book = await Book.findOne({ qr_token: id });
            identifierType = 'qr_token';
        }

        if (!book) {
            book = await Book.findOne({ barcode: id });
            identifierType = 'barcode';
        }

        if (!book) {
            // Also try a partial match on QR token
            book = await Book.findOne({ qr_token: { $regex: id, $options: 'i' } });
            if (book) identifierType = 'qr_token';
        }

        if (!book) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: `No book found with identifier: ${id}` }
            });
        }

        // Audit the scan itself
        await AuditLog.logAction({
            action: 'scan_processed',
            actor: req.user?._id,
            actorName: req.user?.name || 'System',
            targetType: 'book',
            targetId: book._id,
            details: { identifier: id, identifierType, action: action || 'auto', studentId },
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        // ─── STATUS action ───
        if (action === 'status') {
            const activeTransactions = await Transaction.find({
                book: book._id,
                status: { $in: ['issued', 'overdue'] }
            }).populate('student', 'name studentId department');

            const reservations = await Reservation.find({
                book: book._id,
                status: { $in: ['pending', 'ready'] }
            }).populate('student', 'name studentId').sort('position');

            return res.json({
                success: true,
                action: 'status',
                data: {
                    book: {
                        id: book._id,
                        title: book.title,
                        author: book.author,
                        category: book.category,
                        barcode: book.barcode,
                        qr_token: book.qr_token,
                        totalCount: book.totalCount,
                        availableCount: book.availableCount,
                        status: book.status,
                        location: book.location,
                        digital_url: book.digital_access_policy !== 'none' ? book.digital_url : undefined
                    },
                    activeTransactions,
                    reservationQueue: reservations,
                    reservationCount: reservations.length
                }
            });
        }

        // ─── RESERVE action ───
        if (action === 'reserve') {
            if (!studentId) {
                return res.status(400).json({
                    error: { code: 'BAD_REQUEST', message: 'studentId is required for reserve action.' }
                });
            }

            const student = await Student.findOne({
                $or: [{ _id: studentId }, { studentId: studentId }]
            });

            if (!student) {
                return res.status(404).json({
                    error: { code: 'NOT_FOUND', message: `No student found: ${studentId}` }
                });
            }

            if (book.availableCount > 0) {
                return res.json({
                    success: true,
                    action: 'reserve_not_needed',
                    message: 'Book is currently available — issue directly instead.',
                    data: { book: { id: book._id, title: book.title, availableCount: book.availableCount } }
                });
            }

            // Check existing reservation
            const existing = await Reservation.findOne({
                student: student._id, book: book._id,
                status: { $in: ['pending', 'ready'] }
            });

            if (existing) {
                return res.status(409).json({
                    error: {
                        code: 'DUPLICATE_RESERVATION',
                        message: 'Already reserved.',
                        details: { position: existing.position, reservationId: existing.reservationId }
                    }
                });
            }

            const queueCount = await Reservation.countDocuments({
                book: book._id, status: { $in: ['pending', 'ready'] }
            });
            const position = queueCount + 1;
            const loanDays = parseInt(process.env.LOAN_PERIOD_DAYS) || 14;
            const expectedDate = new Date();
            expectedDate.setDate(expectedDate.getDate() + (loanDays * position));

            const reservation = await Reservation.create({
                student: student._id, book: book._id, position, expectedDate,
                autoIssue: req.body.autoIssue || false
            });

            await AuditLog.logAction({
                action: 'book_reserved',
                actor: req.user?._id,
                actorName: req.user?.name || 'System',
                targetType: 'reservation', targetId: reservation._id,
                details: { bookTitle: book.title, studentName: student.name, position },
                ip: req.ip, userAgent: req.get('user-agent')
            });

            sseManager.broadcastReservation('created', reservation);

            return res.status(201).json({
                success: true,
                action: 'reserved',
                message: `Reserved "${book.title}". Queue position: #${position}`,
                data: { reservation: { id: reservation._id, reservationId: reservation.reservationId, position, expectedDate }, book: { id: book._id, title: book.title } }
            });
        }

        // ─── ISSUE / RETURN actions need a student ───
        if (!studentId) {
            return res.status(400).json({
                error: { code: 'BAD_REQUEST', message: 'studentId is required for issue/return actions.' }
            });
        }

        const student = await Student.findOne({
            $or: [{ _id: studentId }, { studentId: studentId }]
        });

        if (!student) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: `No student found: ${studentId}` }
            });
        }

        // Check existing issued transaction
        const existingTransaction = await Transaction.findOne({
            student: student._id,
            book: book._id,
            status: { $in: ['issued', 'overdue'] }
        });

        // Auto-detect action if not specified
        const resolvedAction = action || (existingTransaction ? 'return' : 'issue');

        if (resolvedAction === 'return') {
            // ─── Return Flow ───
            if (!existingTransaction) {
                return res.status(400).json({
                    error: { code: 'NOT_ISSUED', message: 'This book is not currently issued to this student.' }
                });
            }

            existingTransaction.returnDate = new Date();
            existingTransaction.status = 'returned';
            existingTransaction.calculateFine();
            await existingTransaction.save();

            book.availableCount += 1;
            await book.save();

            if (student.booksIssued > 0) {
                student.booksIssued -= 1;
                await student.save();
            }

            const fineMsg = existingTransaction.fineAmount > 0
                ? ` Fine: ₹${existingTransaction.fineAmount}.`
                : '';

            await Notification.create({
                type: existingTransaction.fineAmount > 0 ? 'fine' : 'return',
                title: 'Book Returned via Scan',
                message: `"${book.title}" returned by ${student.name} (${student.studentId}).${fineMsg}`,
                student: student._id,
                transaction: existingTransaction._id,
                priority: existingTransaction.fineAmount > 0 ? 'high' : 'low'
            });

            await AuditLog.logAction({
                action: 'book_returned',
                actor: req.user?._id,
                actorName: req.user?.name || 'System',
                targetType: 'transaction',
                targetId: existingTransaction._id,
                details: {
                    bookTitle: book.title, studentName: student.name,
                    fineAmount: existingTransaction.fineAmount, identifierType
                },
                ip: req.ip, userAgent: req.get('user-agent')
            });

            // Process reservation queue
            const queueResult = await processReturnQueue(book._id);

            sseManager.broadcastBookUpdate(book);
            sseManager.broadcastTransaction('returned', existingTransaction);

            const populated = await Transaction.findById(existingTransaction._id)
                .populate('student', 'name studentId department')
                .populate('book', 'title author barcode qr_token');

            return res.json({
                success: true,
                action: 'returned',
                message: `Book "${book.title}" returned by ${student.name}.${fineMsg}`,
                data: {
                    transaction: populated,
                    reservationNotified: queueResult ? true : false
                }
            });
        } else {
            // ─── Issue Flow ───
            if (existingTransaction) {
                return res.status(400).json({
                    error: { code: 'ALREADY_ISSUED', message: 'This book is already issued to this student.' }
                });
            }

            if (book.availableCount <= 0) {
                return res.status(400).json({
                    error: {
                        code: 'NOT_AVAILABLE',
                        message: `"${book.title}" has no available copies.`,
                        details: { totalCount: book.totalCount, availableCount: 0 }
                    }
                });
            }

            if (student.booksIssued >= 5) {
                return res.status(400).json({
                    error: { code: 'LIMIT_REACHED', message: `${student.name} has reached the maximum book limit (5).` }
                });
            }

            const loanDays = parseInt(process.env.LOAN_PERIOD_DAYS) || 14;
            const issueDate = new Date();
            const dueDate = new Date(issueDate.getTime() + loanDays * 24 * 60 * 60 * 1000);

            const transaction = await Transaction.create({
                student: student._id,
                book: book._id,
                issueDate, dueDate,
                status: 'issued'
            });

            book.availableCount -= 1;
            await book.save();

            student.booksIssued += 1;
            await student.save();

            await Notification.create({
                type: 'due_reminder',
                title: 'Book Issued via Scan',
                message: `"${book.title}" issued to ${student.name} (${student.studentId}). Due: ${dueDate.toLocaleDateString()}.`,
                student: student._id,
                transaction: transaction._id,
                priority: 'low'
            });

            await AuditLog.logAction({
                action: 'book_issued',
                actor: req.user?._id,
                actorName: req.user?.name || 'System',
                targetType: 'transaction',
                targetId: transaction._id,
                details: {
                    bookTitle: book.title, studentName: student.name,
                    dueDate, identifierType
                },
                ip: req.ip, userAgent: req.get('user-agent')
            });

            sseManager.broadcastBookUpdate(book);
            sseManager.broadcastTransaction('issued', transaction);

            const populated = await Transaction.findById(transaction._id)
                .populate('student', 'name studentId department')
                .populate('book', 'title author barcode qr_token');

            return res.status(201).json({
                success: true,
                action: 'issued',
                message: `Book "${book.title}" issued to ${student.name}. Due: ${dueDate.toLocaleDateString()}.`,
                data: { transaction: populated }
            });
        }
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Scan processing failed.', details: error.message }
        });
    }
};

/**
 * POST /api/scan/fingerprint
 * Authenticate student by fingerprint hash
 */
exports.fingerprintAuth = async (req, res) => {
    try {
        const { fingerprintHash } = req.body;

        if (!fingerprintHash) {
            return res.status(400).json({
                error: { code: 'BAD_REQUEST', message: 'Fingerprint hash is required.' }
            });
        }

        const student = await Student.findOne({ fingerprint: fingerprintHash });
        if (!student) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Fingerprint not recognized.' }
            });
        }

        res.json({
            success: true,
            message: `Student identified: ${student.name}`,
            data: { student }
        });
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Fingerprint authentication failed.' }
        });
    }
};
