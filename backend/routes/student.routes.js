const router = require('express').Router();
const {
    getAllStudents, getStudent, createStudent,
    updateStudent, deleteStudent, getStudentByStudentId
} = require('../controllers/student.controller');
const { protect } = require('../middleware/auth.middleware');

router.get('/', protect, getAllStudents);
router.get('/:id', protect, getStudent);
router.post('/', protect, createStudent);
router.put('/:id', protect, updateStudent);
router.delete('/:id', protect, deleteStudent);
router.get('/sid/:studentId', protect, getStudentByStudentId);

module.exports = router;
