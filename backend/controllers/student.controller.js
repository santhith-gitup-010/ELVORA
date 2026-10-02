/**
 * Student Controller
 * CRUD operations for student management
 */

const Student = require('../models/Student');

/**
 * GET /api/students
 * List all students with search and pagination
 */
exports.getAllStudents = async (req, res) => {
    try {
        const { search, department, year, page = 1, limit = 20, sort = '-createdAt' } = req.query;

        let query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { studentId: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        if (department && department !== 'all') {
            query.department = department;
        }

        if (year) {
            query.year = parseInt(year);
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Student.countDocuments(query);
        const students = await Student.find(query)
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        res.json({
            success: true,
            data: {
                students,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / parseInt(limit)),
                    limit: parseInt(limit)
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch students.',
            error: error.message
        });
    }
};

/**
 * GET /api/students/:id
 * Get single student by ID
 */
exports.getStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found.'
            });
        }

        res.json({ success: true, data: { student } });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student.',
            error: error.message
        });
    }
};

/**
 * POST /api/students
 * Register a new student
 */
exports.createStudent = async (req, res) => {
    try {
        const { name, email, phone, department, year, studentId } = req.body;

        // Check for duplicate studentId or email
        const existing = await Student.findOne({
            $or: [{ studentId }, { email }]
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Student with this ID or email already exists.'
            });
        }

        const student = await Student.create({
            studentId, name, email, phone, department, year
        });

        res.status(201).json({
            success: true,
            message: 'Student registered successfully.',
            data: { student }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to register student.',
            error: error.message
        });
    }
};

/**
 * PUT /api/students/:id
 * Update student details
 */
exports.updateStudent = async (req, res) => {
    try {
        const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found.'
            });
        }

        res.json({
            success: true,
            message: 'Student updated successfully.',
            data: { student }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update student.',
            error: error.message
        });
    }
};

/**
 * DELETE /api/students/:id
 * Remove student record
 */
exports.deleteStudent = async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found.'
            });
        }

        res.json({
            success: true,
            message: 'Student deleted successfully.'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete student.',
            error: error.message
        });
    }
};

/**
 * GET /api/students/sid/:studentId
 * Find student by studentId
 */
exports.getStudentByStudentId = async (req, res) => {
    try {
        const student = await Student.findOne({ studentId: req.params.studentId });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'No student found with this ID.'
            });
        }

        res.json({ success: true, data: { student } });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student.',
            error: error.message
        });
    }
};
