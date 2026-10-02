/**
 * Dashboard Controller
 * Aggregated statistics and analytics for the admin panel
 */

const Book = require('../models/Book');
const Student = require('../models/Student');
const Transaction = require('../models/Transaction');

/**
 * GET /api/dashboard/stats
 * Returns overall library statistics
 */
exports.getStats = async (req, res) => {
    try {
        const [
            totalBooks,
            totalStudents,
            issuedBooks,
            overdueBooks,
            returnedBooks,
            totalFines
        ] = await Promise.all([
            Book.countDocuments(),
            Student.countDocuments(),
            Transaction.countDocuments({ status: 'issued' }),
            Transaction.countDocuments({ status: 'overdue' }),
            Transaction.countDocuments({ status: 'returned' }),
            Transaction.aggregate([
                { $match: { fineAmount: { $gt: 0 } } },
                { $group: { _id: null, total: { $sum: '$fineAmount' } } }
            ])
        ]);

        // Available books
        const availableBooksAgg = await Book.aggregate([
            { $group: { _id: null, total: { $sum: '$availableCount' } } }
        ]);
        const availableBooks = availableBooksAgg.length > 0 ? availableBooksAgg[0].total : 0;

        res.json({
            success: true,
            data: {
                totalBooks,
                totalStudents,
                issuedBooks,
                overdueBooks,
                returnedBooks,
                availableBooks,
                totalFines: totalFines.length > 0 ? totalFines[0].total : 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard stats.',
            error: error.message
        });
    }
};

/**
 * GET /api/dashboard/charts
 * Returns data for charts and analytics
 */
exports.getChartData = async (req, res) => {
    try {
        // Category distribution
        const categoryDistribution = await Book.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 }, totalCopies: { $sum: '$totalCount' } } },
            { $sort: { count: -1 } }
        ]);

        // Monthly transactions (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyTransactions = await Transaction.aggregate([
            { $match: { createdAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    issued: {
                        $sum: { $cond: [{ $eq: ['$status', 'issued'] }, 1, 0] }
                    },
                    returned: {
                        $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] }
                    },
                    overdue: {
                        $sum: { $cond: [{ $eq: ['$status', 'overdue'] }, 1, 0] }
                    },
                    total: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Department-wise student distribution
        const departmentDistribution = await Student.aggregate([
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        // Top borrowed books
        const topBooks = await Transaction.aggregate([
            { $group: { _id: '$book', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'books',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'bookInfo'
                }
            },
            { $unwind: '$bookInfo' },
            {
                $project: {
                    title: '$bookInfo.title',
                    author: '$bookInfo.author',
                    count: 1
                }
            }
        ]);

        // Recent transactions
        const recentTransactions = await Transaction.find()
            .populate('student', 'name studentId')
            .populate('book', 'title barcode')
            .sort('-createdAt')
            .limit(10);

        res.json({
            success: true,
            data: {
                categoryDistribution,
                monthlyTransactions,
                departmentDistribution,
                topBooks,
                recentTransactions
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chart data.',
            error: error.message
        });
    }
};
