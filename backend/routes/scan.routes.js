const router = require('express').Router();
const { processScan, fingerprintAuth } = require('../controllers/scan.controller');
const { protect } = require('../middleware/auth.middleware');
const { validateScan } = require('../middleware/validate');
const rateLimit = require('express-rate-limit');

// Rate limiter for scan endpoint: max 30 scans per minute per IP
const scanLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: {
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many scan requests. Please wait before trying again.'
        }
    },
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/', protect, scanLimiter, validateScan, processScan);
router.post('/fingerprint', protect, fingerprintAuth);

module.exports = router;
