/**
 * Transaction Controller
 * Handles book issue/return operations with fine calculation
 */

const Transaction = require('../models/Transaction');
const Book = require('../models/Book');
const Student = require('../models/Student');
const Notification = require('../models/Notification');

/**
 * GET /api/transactions
 * List all transactions with filters and pagination
 */
exports.getAllTransactions = async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20, sort = '-createdAt' } = req.query;

        let query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Transaction.countDocuments(query);

        let transactions = await Transaction.find(query)
            .populate('student', 'name studentId department year email')
            .populate('book', 'title author barcode category')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        // If search is provided, filter by populated fields
        if (search) {
            const searchLower = search.toLowerCase();
            transactions = transactions.filter(t =>
                t.transactionId.toLowerCase().includes(searchLower) ||
                (t.student && t.student.name.toLowerCase().includes(searchLower)) ||
                (t.student && t.student.studentId.toLowerCase().includes(searchLower)) ||
                (t.book && t.book.title.toLowerCase().includes(searchLower)) ||
                (t.book && t.book.barcode.toLowerCase().includes(searchLower))
            );
        }

        res.json({
            success: true,
            data: {
                transactions,
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
            success: false,
            message: 'Failed to fetch transactions.',
            error: error.message
        });
    }
};

/**
 * GET /api/transactions/:id
 * Get single transaction
 */
exports.getTransaction = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id)
            .populate('student', 'name studentId department year email phone')
            .populate('book', 'title author barcode category location');

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found.'
            });
        }

        res.json({ success: true, data: { transaction } });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transaction.',
            error: error.message
        });
    }
};

/**
 * POST /api/transactions/issue
 * Issue a book to a student
 */
exports.issueBook = async (req, res) => {
    try {
        const { studentId, bookId, notes } = req.body;

        // Validate student exists
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found.'
            });
        }

        // Check student book limit
        if (student.booksIssued >= 5) {
            return res.status(400).json({
                success: false,
                message: 'Student has reached the maximum book limit (5).'
            });
        }

        // Validate book exists and is available
        const book = await Book.findById(bookId);
        if (!book) {
            return res.status(404).json({
                success: false,
                message: 'Book not found.'
            });
        }

        if (book.availableCount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Book is not available for issue. All copies are currently issued.'
            });
        }

        // Check if student already has this book
        const existingIssue = await Transaction.findOne({
            student: studentId,
            book: bookId,
            status: 'issued'
        });

        if (existingIssue) {
            return res.status(400).json({
                success: false,
                message: 'This book is already issued to this student.'
            });
        }

        // Calculate due date
        const loanDays = parseInt(process.env.LOAN_PERIOD_DAYS) || 14;
        const issueDate = new Date();
        const dueDate = new Date(issueDate.getTime() + loanDays * 24 * 60 * 60 * 1000);

        // Create transaction
        const transaction = await Transaction.create({
            student: studentId,
            book: bookId,
            issueDate,
            dueDate,
            status: 'issued',
            notes: notes || ''
        });

        // Update book available count
        book.availableCount -= 1;
        await book.save();

        // Update student's issued count
        student.booksIssued += 1;
        await student.save();

        // Create notification
        await Notification.create({
            type: 'due_reminder',
            title: 'Book Issued',
            message: `"${book.title}" has been issued to ${student.name} (${student.studentId}). Due date: ${dueDate.toLocaleDateString()}.`,
            student: studentId,
            transaction: transaction._id,
            priority: 'low'
        });

        // Populate for response
        const populatedTxn = await Transaction.findById(transaction._id)
            .populate('student', 'name studentId department')
            .populate('book', 'title author barcode');

        res.status(201).json({
            success: true,
            message: `Book "${book.title}" issued to ${student.name} successfully.`,
            data: { transaction: populatedTxn }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to issue book.',
            error: error.message
        });
    }
};

/**
 * POST /api/transactions/return/:id
 * Return a book and calculate fine
 */
exports.returnBook = async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaction not found.'
            });
        }

        if (transaction.status === 'returned') {
            return res.status(400).json({
                success: false,
                message: 'This book has already been returned.'
            });
        }

        // Set return date and calculate fine
        transaction.returnDate = new Date();
        transaction.status = 'returned';
        transaction.calculateFine();
        await transaction.save();

        // Update book available count
        const book = await Book.findById(transaction.book);
        if (book) {
            book.availableCount += 1;
            await book.save();
        }

        // Update student's issued count
        const student = await Student.findById(transaction.student);
        if (student && student.booksIssued > 0) {
            student.booksIssued -= 1;
            await student.save();
        }

        // Create notification
        const notifType = transaction.fineAmount > 0 ? 'fine' : 'return';
        const notifPriority = transaction.fineAmount > 0 ? 'high' : 'low';
        const fineMsg = transaction.fineAmount > 0
            ? ` Fine: ₹${transaction.fineAmount}.`
            : '';

        await Notification.create({
            type: notifType,
            title: transaction.fineAmount > 0 ? 'Book Returned with Fine' : 'Book Returned',
            message: `"${book ? book.title : 'Unknown'}" returned by ${student ? student.name : 'Unknown'}.${fineMsg}`,
            student: transaction.student,
            transaction: transaction._id,
            priority: notifPriority
        });

        const populatedTxn = await Transaction.findById(transaction._id)
            .populate('student', 'name studentId department')
            .populate('book', 'title author barcode');

        res.json({
            success: true,
            message: `Book returned successfully.${fineMsg}`,
            data: { transaction: populatedTxn }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to return book.',
            error: error.message
        });
    }
};

/**
 * GET /api/transactions/student/:studentId
 * Get all transactions for a specific student
 */
exports.getStudentTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ student: req.params.studentId })
            .populate('book', 'title author barcode category')
            .sort('-createdAt');

        res.json({
            success: true,
            data: { transactions }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student transactions.',
            error: error.message
        });
    }
};

/**
 * Cron-like: Update overdue statuses
 * Called internally or via API
 */
exports.updateOverdueStatuses = async (req, res) => {
    try {
        const now = new Date();
        const overdueTransactions = await Transaction.find({
            status: 'issued',
            dueDate: { $lt: now }
        }).populate('student', 'name studentId').populate('book', 'title');

        let updated = 0;
        for (const txn of overdueTransactions) {
            txn.status = 'overdue';
            txn.calculateFine();
            await txn.save();
            updated++;

            // Create overdue notification
            await Notification.create({
                type: 'overdue',
                title: 'Book Overdue',
                message: `"${txn.book ? txn.book.title : 'Unknown'}" is overdue for ${txn.student ? txn.student.name : 'Unknown'}. Current fine: ₹${txn.fineAmount}.`,
                student: txn.student ? txn.student._id : null,
                transaction: txn._id,
                priority: 'high'
            });
        }

        if (res) {
            res.json({
                success: true,
                message: `${updated} transactions updated to overdue.`,
                data: { updatedCount: updated }
            });
        }

        return updated;
    } catch (error) {
        if (res) {
            res.status(500).json({
                success: false,
                message: 'Failed to update overdue statuses.',
                error: error.message
            });
        }
        return 0;
    }
};
