const router = require('express').Router();
const { getStats, getChartData } = require('../controllers/dashboard.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/stats', protect, getStats);
router.get('/charts', protect, getChartData);

module.exports = router;
