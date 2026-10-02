const router = require('express').Router();
const {
    getAllReservations, cancelReservation
} = require('../controllers/reservation.controller');
const { protect, authorize } = require('../middleware/auth.middleware');

router.get('/', protect, getAllReservations);
router.delete('/:id', protect, cancelReservation);

module.exports = router;
