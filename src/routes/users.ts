import express, { Response } from 'express';
import { query, body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (Faculty only)
// @access  Private (Faculty only)
router.get(
    '/',
    authenticate,
    authorize('faculty'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { role, page = '1', limit = '50' } = req.query;

            const query: any = {};
            if (role) {
                query.role = role;
            }

            const pageNum = parseInt(page as string, 10);
            const limitNum = parseInt(limit as string, 10);
            const skip = (pageNum - 1) * limitNum;

            const users = await User.find(query)
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum);

            const total = await User.countDocuments(query);

            res.json({
                users,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum),
                },
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'Server error' });
        }
    }
);

// @route   GET /api/users/:id
// @desc    Get single user
// @access  Private
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.params.id).select('-password');

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Students can only view their own profile
        if (req.user!.role === 'student' && req.user!._id.toString() !== req.params.id) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        res.json({ user });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

// @route   PUT /api/users/:id
// @desc    Update user (Faculty only)
// @access  Private (Faculty only)
router.put(
    '/:id',
    authenticate,
    authorize('faculty'),
    [
        body('name').optional().trim().notEmpty(),
        body('email').optional().isEmail(),
        body('role').optional().isIn(['student', 'faculty']),
        body('department').optional().trim(),
        body('yearOfStudy').optional().trim(),
        body('emailAlerts').optional().isBoolean(),
        body('systemMessages').optional().isBoolean(),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const updateData: any = { ...req.body };

            const user = await User.findByIdAndUpdate(req.params.id, updateData, {
                new: true,
                runValidators: true,
            }).select('-password');

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

// @route   DELETE /api/users/:id
// @desc    Delete user and their complaints
// @access  Private (user themselves or faculty)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const targetId = req.params.id;
        const userToDelete = await User.findById(targetId);
        if (!userToDelete) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Only the user themselves or faculty can delete the account
        if (req.user!.role !== 'faculty' && req.user!._id.toString() !== targetId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        // Remove complaints created by this user
        await Complaint.deleteMany({ studentId: userToDelete._id });

        // Remove user
        await User.findByIdAndDelete(targetId);

        res.json({ message: 'User and related complaints deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

export default router; 

