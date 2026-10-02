const router = require('express').Router();
const {
    getAllBooks, getBook, createBook,
    updateBook, deleteBook, getBookByBarcode,
    issueBook, returnBook
} = require('../controllers/book.controller');
const { createReservation, getBookReservations } = require('../controllers/reservation.controller');
const { getBookQR, rotateQRToken, getBookByQRToken } = require('../controllers/qr.controller');
const { protect, authorize } = require('../middleware/auth.middleware');
const { validateBook, validateReservation } = require('../middleware/validate');

// QR token lookup (must come before parameterised /:id)
router.get('/qr/:token', protect, getBookByQRToken);

// Barcode lookup (must come before /:id)
router.get('/barcode/:barcode', protect, getBookByBarcode);

// List & Create
router.get('/', protect, getAllBooks);
router.post('/', protect, authorize('admin', 'librarian'), validateBook, createBook);

const { getPublicBookByBarcode } = require('../controllers/public.controller');

// Single book endpoints
// Exact match for 24-character hex string (MongoDB ObjectID) requires auth
router.get('/:id([0-9a-fA-F]{24})', protect, getBook);

// Any other string is treated as a barcode and is publicly accessible via Google Lens flow
router.get('/:barcode', getPublicBookByBarcode);

router.put('/:id', protect, authorize('admin', 'librarian'), updateBook);
router.delete('/:id', protect, authorize('admin'), deleteBook);

// Issue / Return on book resource
router.post('/:id/issue', protect, issueBook);
router.post('/:id/return', protect, returnBook);

// Reservation on book resource
router.post('/:id/reserve', protect, validateReservation, createReservation);
router.get('/:id/reservations', protect, getBookReservations);

// QR code generation & rotation
router.get('/:id/qr', protect, getBookQR);
router.post('/:id/qr/rotate', protect, authorize('admin', 'librarian'), rotateQRToken);

module.exports = router;
