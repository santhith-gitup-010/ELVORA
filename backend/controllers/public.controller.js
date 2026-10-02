/**
 * Public Book Controller
 * Provides book details accessible WITHOUT authentication
 * Used by QR code scans (Google Lens flow)
 */

const Book = require('../models/Book');
const Transaction = require('../models/Transaction');
const Reservation = require('../models/Reservation');

/**
 * GET /api/public/book/:barcode
 * Public endpoint — no JWT required
 * Returns enriched book data with popularity metrics
 */
exports.getPublicBookByBarcode = async (req, res) => {
    try {
        const { barcode } = req.params;
        console.log(`[PUBLIC] Book lookup: barcode="${barcode}"`);

        const book = await Book.findOne({ barcode: barcode.trim() });
        if (!book) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Book not found. The QR code may be invalid or the book has been removed.' }
            });
        }

        // Count total transactions for this book (popularity metric)
        const totalTransactions = await Transaction.countDocuments({ book: book._id });

        // Count active issues
        const activeIssues = await Transaction.countDocuments({
            book: book._id,
            status: { $in: ['issued', 'overdue'] }
        });

        // Count pending reservations
        const pendingReservations = await Reservation.countDocuments({
            book: book._id,
            status: { $in: ['pending', 'ready'] }
        });

        // Get recent borrower names (last 5, anonymised)
        const recentBorrowers = await Transaction.find({ book: book._id })
            .populate('student', 'name department')
            .sort('-createdAt')
            .limit(5)
            .select('student issueDate status');

        // Calculate popularity tier
        let popularityTier = 'Low';
        let popularityScore = totalTransactions;
        if (totalTransactions >= 15) {
            popularityTier = 'Most Borrowed';
        } else if (totalTransactions >= 8) {
            popularityTier = 'High';
        } else if (totalTransactions >= 4) {
            popularityTier = 'Medium';
        }

        // Calculate a star rating (1–5) based on transactions and availability ratio
        const borrowRatio = book.totalCount > 0 ? (book.totalCount - book.availableCount) / book.totalCount : 0;
        const rawRating = Math.min(5, 3 + (totalTransactions / 10) + borrowRatio);
        const rating = Math.round(rawRating * 10) / 10; // one decimal

        // Determine status
        let status = 'Available';
        let statusType = 'available';
        if (book.availableCount === 0) {
            status = 'All Copies Issued';
            statusType = 'unavailable';
        } else if (book.availableCount < book.totalCount) {
            status = 'Available';
            statusType = 'partial';
        }

        // Build response
        res.json({
            success: true,
            data: {
                title: book.title,
                author: book.author,
                category: book.category,
                isbn: book.isbn || null,
                publisher: book.publisher || null,
                edition: book.edition || null,
                description: book.description || book.summary || null,
                summary: book.summary || book.description || null,
                location: book.location || null,
                barcode: book.barcode,
                coverImage: book.coverImage || null,

                // Availability
                totalCopies: book.totalCount,
                availableCopies: book.availableCount,
                activeIssues,
                status,
                statusType,

                // Popularity & Rating
                totalTransactions,
                popularityTier,
                popularityScore,
                rating: Math.min(rating, 5),
                pendingReservations,

                // Recent activity (anonymised first names)
                recentBorrowers: recentBorrowers.map(b => ({
                    name: b.student?.name ? b.student.name.split(' ')[0] + ' ***' : 'Anonymous',
                    department: b.student?.department || '—',
                    date: b.issueDate,
                    status: b.status
                })),

                // Metadata
                addedAt: book.createdAt,
                updatedAt: book.updatedAt,

                // For authenticated actions (frontend will use these IDs)
                _id: book._id,
                id: book._id
            }
        });
    } catch (error) {
        console.error('Public book lookup error:', error.message);
        res.status(500).json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch book details. Please try again.' }
        });
    }
};
