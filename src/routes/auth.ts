import express, { Request, Response } from 'express';
import jwt, { type SignOptions, type Secret } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Generate JWT token
const generateToken = (userId: string): string => {
    const secret: Secret = process.env.JWT_SECRET ?? 'fallback-secret';
    const expiresInEnv = process.env.JWT_EXPIRES_IN ?? '7d';
    const signOptions: SignOptions = { expiresIn: expiresInEnv as SignOptions['expiresIn'] };
    return jwt.sign({ userId }, secret, signOptions);
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post(
    '/signup',
    [
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('username')
            .trim()
            .notEmpty()
            .withMessage('Username is required')
            .isLength({ min: 3 })
            .withMessage('Username must be at least 3 characters'),
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters'),
        body('role').isIn(['student', 'faculty']).withMessage('Role must be student or faculty'),
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const {
                name,
                username,
                email,
                password,
                role,
                profilePicture,
                department,
                yearOfStudy,
                program,
                phoneNumber,
                studentId,
                rollNumber,
            } = req.body;

            // Check if username exists for the same role
            const existingUser = await User.findOne({ username: username.toLowerCase(), role });
            if (existingUser) {
                res.status(400).json({ error: 'Username already exists for this role' });
                return;
            }

            // Check if email exists
            const existingEmail = await User.findOne({ email: email.toLowerCase() });
            if (existingEmail) {
                res.status(400).json({ error: 'Email already registered' });
                return;
            }

            const user = new User({
                name,
                username: username.toLowerCase(),
                email: email.toLowerCase(),
                password,
                role,
                profilePicture,
                department,
                yearOfStudy,
                program,
                phoneNumber,
                studentId,
                rollNumber,
            });

            await user.save();

            const token = generateToken(user._id.toString());

            // Remove password from response
            const { password: _pwd, ...safeUser } = user.toObject();

            res.status(201).json({
                token,
                user: safeUser,
            });
        } catch (error: any) {
            console.error('Signup error:', error);
            if (error.code === 11000) {
                res.status(400).json({ error: 'Username or email already exists' });
                return;
            }
            res.status(500).json({ 
                error: error.message || 'Server error',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
    '/login',
    [
        body('username').trim().notEmpty().withMessage('Username is required'),
        body('password').notEmpty().withMessage('Password is required'),
        body('role').isIn(['student', 'faculty']).withMessage('Role must be student or faculty'),
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { username, password, role } = req.body;

            const user = await User.findOne({
                username: username.toLowerCase(),
                role,
            }).select('+password');

            if (!user) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            const token = generateToken(user._id.toString());

            // Remove password from response
            const { password: _pwd, ...safeUser } = user.toObject();

            res.json({
                token,
                user: safeUser,
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'Server error' });
        }
    }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        res.json({ user: req.user });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
    '/profile',
    authenticate,
    [
        body('name').optional().trim().notEmpty(),
        body('email').optional().isEmail(),
        body('password').optional().isLength({ min: 6 }),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const updateData = { ...req.body };

            // If password is present here it's allowed but we prefer dedicated change-password route
            const user = await User.findByIdAndUpdate(
                req.user!._id,
                updateData,
                { new: true, runValidators: true }
            ).select('-password');

            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json({ user });
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'Server error' });
        }
    }
);

// @route   POST /api/auth/change-password
// @desc    Change password (requires current password)
// @access  Private
router.post(
    '/change-password',
    authenticate,
    [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { currentPassword, newPassword } = req.body;

            // Fetch user including password
            const user = await User.findById(req.user!._id).select('+password');
            if (!user) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            const match = await user.comparePassword(currentPassword);
            if (!match) {
                res.status(401).json({ error: 'Current password is incorrect' });
                return;
            }

            user.password = newPassword;
            await user.save();

            res.json({ message: 'Password changed successfully' });
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'Server error' });
        }
    }
);

export default router;

