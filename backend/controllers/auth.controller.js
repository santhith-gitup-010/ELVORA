/**
 * Auth Controller
 * Handles user registration, login, and profile
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

/**
 * POST /api/auth/register
 * Register a new admin/librarian
 */
exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        // Create user
        const user = await User.create({ name, email, password, role: role || 'librarian' });

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Account created successfully.',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                token
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Registration failed.',
            error: error.message
        });
    }
};

/**
 * POST /api/auth/login
 * Login with email and password
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password.'
            });
        }

        // Find user and include password field
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials.'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials.'
            });
        }

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful.',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                token
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Login failed.',
            error: error.message
        });
    }
};

/**
 * GET /api/auth/me
 * Get current logged-in user profile
 */
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({
            success: true,
            data: { user }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile.',
            error: error.message
        });
    }
};

/**
 * POST /api/auth/seed
 * Create default admin account (for first-time setup)
 */
exports.seedAdmin = async (req, res) => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        if (adminExists) {
            return res.status(400).json({
                success: false,
                message: 'Admin account already exists.'
            });
        }

        const admin = await User.create({
            name: 'ELVORA Admin',
            email: 'admin@elvora.com',
            password: 'admin123',
            role: 'admin'
        });

        res.status(201).json({
            success: true,
            message: 'Default admin account created.',
            data: {
                email: 'admin@elvora.com',
                password: 'admin123',
                note: 'Change the password after first login!'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to seed admin.',
            error: error.message
        });
    }
};
