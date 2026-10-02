/**
 * Reservation Controller
 * Handles book reservation queue, auto-issue on return, and position tracking
 */

const Reservation = require('../models/Reservation');
const Book = require('../models/Book');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const sseManager = require('../utils/sseManager');

/**
 * POST /api/books/:id/reserve
 * Create reservation if copies unavailable
 */
exports.createReservation = async (req, res) => {
    try {
        const { studentId, autoIssue } = req.body;
        const bookId = req.params.id;

        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Book not found' }
            });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Student not found' }
            });
        }

        // Check if book is available - no need to reserve
        if (book.availableCount > 0) {
            return res.status(400).json({
                error: {
                    code: 'BOOK_AVAILABLE',
                    message: 'Book is currently available. No reservation needed — issue directly.',
                    details: { availableCount: book.availableCount }
                }
            });
        }

        // Check if student already has an active reservation for this book
        const existing = await Reservation.findOne({
            student: studentId,
            book: bookId,
            status: { $in: ['pending', 'ready'] }
        });

        if (existing) {
            return res.status(409).json({
                error: {
                    code: 'DUPLICATE_RESERVATION',
                    message: 'Student already has an active reservation for this book.',
                    details: { reservationId: existing.reservationId, position: existing.position }
                }
            });
        }

        // Calculate queue position
        const queueCount = await Reservation.countDocuments({
            book: bookId,
            status: { $in: ['pending', 'ready'] }
        });
        const position = queueCount + 1;

        // Estimate expected date based on average loan period and position
        const loanDays = parseInt(process.env.LOAN_PERIOD_DAYS) || 14;
        const expectedDate = new Date();
        expectedDate.setDate(expectedDate.getDate() + (loanDays * position));

        // Set expiry: 48 hours after the book becomes ready for pickup
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (loanDays * position) + 2);

        const reservation = await Reservation.create({
            student: studentId,
            book: bookId,
            position,
            expectedDate,
            expiresAt,
            autoIssue: autoIssue || false
        });

        // Audit log
        await AuditLog.logAction({
            action: 'book_reserved',
            actor: req.user?._id,
            actorName: req.user?.name || 'System',
            targetType: 'reservation',
            targetId: reservation._id,
            details: {
                bookTitle: book.title,
                studentName: student.name,
                position,
                autoIssue: autoIssue || false
            },
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        // Notification
        await Notification.create({
            type: 'system',
            title: 'Book Reserved',
            message: `"${book.title}" reserved by ${student.name}. Queue position: #${position}.`,
            student: studentId,
            priority: 'medium'
        });

        // SSE broadcast
        sseManager.broadcastReservation('created', reservation);

        const populated = await Reservation.findById(reservation._id)
            .populate('student', 'name studentId department')
            .populate('book', 'title author barcode qr_token');

        res.status(201).json({
            success: true,
            message: `Reservation created. Queue position: #${position}`,
            data: {
                reservation: populated,
                position,
                expectedDate
            }
        });
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to create reservation.', details: error.message }
        });
    }
};

/**
 * GET /api/books/:id/reservations
 * Get reservation queue for a book
 */
exports.getBookReservations = async (req, res) => {
    try {
        const reservations = await Reservation.find({
            book: req.params.id,
            status: { $in: ['pending', 'ready'] }
        })
            .populate('student', 'name studentId department')
            .sort('position');

        res.json({
            success: true,
            data: {
                reservations,
                queueLength: reservations.length
            }
        });
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch reservations.' }
        });
    }
};

/**
 * DELETE /api/reservations/:id
 * Cancel a reservation
 */
exports.cancelReservation = async (req, res) => {
    try {
        const reservation = await Reservation.findById(req.params.id);
        if (!reservation) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Reservation not found' }
            });
        }

        if (reservation.status === 'fulfilled' || reservation.status === 'cancelled') {
            return res.status(400).json({
                error: { code: 'INVALID_STATE', message: `Cannot cancel a ${reservation.status} reservation.` }
            });
        }

        reservation.status = 'cancelled';
        await reservation.save();

        // Re-adjust positions for remaining reservations
        await Reservation.updateMany(
            { book: reservation.book, status: 'pending', position: { $gt: reservation.position } },
            { $inc: { position: -1 } }
        );

        // Audit log
        await AuditLog.logAction({
            action: 'reservation_cancelled',
            actor: req.user?._id,
            actorName: req.user?.name || 'System',
            targetType: 'reservation',
            targetId: reservation._id,
            details: { reservationId: reservation.reservationId },
            ip: req.ip,
            userAgent: req.get('user-agent')
        });

        sseManager.broadcastReservation('cancelled', reservation);

        res.json({
            success: true,
            message: 'Reservation cancelled successfully.'
        });
    } catch (error) {
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to cancel reservation.' }
        });
    }
};

/**
 * GET /api/reservations
 * List all reservations (admin)
 */
exports.getAllReservations = async (req, res) => {
    try {
        const { status, page = 1, limit = 20, sort = '-createdAt' } = req.query;
        let query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Reservation.countDocuments(query);

        const reservations = await Reservation.find(query)
            .populate('student', 'name studentId department')
            .populate('book', 'title author barcode')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: {
                reservations,
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
            error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch reservations.' }
        });
    }
};

/**
 * Process reservation queue when a book is returned
 * Called internally from transaction/scan controllers
 */
exports.processReturnQueue = async (bookId) => {
    try {
        const nextReservation = await Reservation.findOne({
            book: bookId,
            status: 'pending'
        }).sort('position').populate('student');

        if (!nextReservation) return null;

        nextReservation.status = 'ready';
        nextReservation.notifiedAt = new Date();
        nextReservation.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h to pick up
        await nextReservation.save();

        // Create notification
        const book = await Book.findById(bookId);
        await Notification.create({
            type: 'system',
            title: 'Reserved Book Available!',
            message: `"${book?.title}" is now available for pickup. You have 48 hours.`,
            student: nextReservation.student._id,
            priority: 'high'
        });

        sseManager.broadcastReservation('ready', nextReservation);

        // If autoIssue is enabled, process the issue automatically
        if (nextReservation.autoIssue && nextReservation.student) {
            const student = nextReservation.student;
            if (student.booksIssued < 5 && book && book.availableCount > 0) {
                const loanDays = parseInt(process.env.LOAN_PERIOD_DAYS) || 14;
                const issueDate = new Date();
                const dueDate = new Date(issueDate.getTime() + loanDays * 24 * 60 * 60 * 1000);

                const transaction = await Transaction.create({
                    student: student._id,
                    book: bookId,
                    issueDate,
                    dueDate,
                    status: 'issued',
                    notes: `Auto-issued from reservation ${nextReservation.reservationId}`
                });

                book.availableCount -= 1;
                await book.save();

                student.booksIssued += 1;
                await student.save();

                nextReservation.status = 'fulfilled';
                nextReservation.fulfilledAt = new Date();
                await nextReservation.save();

                await AuditLog.logAction({
                    action: 'reservation_fulfilled',
                    actorName: 'System (Auto-Issue)',
                    targetType: 'reservation',
                    targetId: nextReservation._id,
                    details: {
                        reservationId: nextReservation.reservationId,
                        transactionId: transaction.transactionId
                    }
                });

                sseManager.broadcastBookUpdate(book);
                sseManager.broadcastTransaction('issued', transaction);

                return { autoIssued: true, transaction, reservation: nextReservation };
            }
        }

        return { autoIssued: false, reservation: nextReservation };
    } catch (err) {
        console.error('processReturnQueue error:', err.message);
        return null;
    }
};
