/**
 * Public Routes
 * No authentication required — used by QR code scans from Google Lens
 */

const router = require('express').Router();
const { getPublicBookByBarcode } = require('../controllers/public.controller');

// Public book lookup by barcode (QR code flow)
router.get('/book/:barcode', getPublicBookByBarcode);

module.exports = router;
