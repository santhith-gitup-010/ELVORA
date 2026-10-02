const router = require('express').Router();
const {
    getAllTransactions, getTransaction,
    issueBook, returnBook,
    getStudentTransactions, updateOverdueStatuses
} = require('../controllers/transaction.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, getAllTransactions);
router.get('/:id', protect, getTransaction);
router.post('/issue', protect, issueBook);
router.post('/return/:id', protect, returnBook);
router.get('/student/:studentId', protect, getStudentTransactions);
router.post('/update-overdue', protect, updateOverdueStatuses);

module.exports = router;
