const router = require('express').Router();
const { getAuditLogs, getActionTypes, getAuditStats } = require('../controllers/audit.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

// Admin-only access to audit logs
router.get('/', protect, authorize('admin'), getAuditLogs);
router.get('/actions', protect, authorize('admin'), getActionTypes);
router.get('/stats', protect, authorize('admin'), getAuditStats);

module.exports = router;
