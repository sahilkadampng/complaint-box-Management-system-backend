import express, { Response } from 'express';
import { query, body, validationResult } from 'express-validator';
import Complaint from '../models/Complaint.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users (Faculty and Admin)
// @access  Private (Faculty and Admin only)
router.get(
    '/',
    authenticate,
    authorize('faculty', 'admin'),
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { role, page = '1', limit = '50' } = req.query;

            const pageNum = parseInt(page as string, 10);
            const limitNum = parseInt(limit as string, 10);

            const { users, total } = await (await import('../services/userService.js')).listUsers(
                (role as any) || undefined,
                pageNum,
                limitNum
            );

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
    const { user } = await (await import('../services/userService.js')).findUserById(req.params.id);

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

            // Disallow role changes via this endpoint (would require migration)
            if (updateData.role) {
                res.status(400).json({ error: 'Changing role via update is not supported; recreate user in target role.' });
                return;
            }

            const updated = await (await import('../services/userService.js')).updateUserById(
                req.params.id,
                updateData
            );

            if (!updated) {
                res.status(404).json({ error: 'User not found' });
                return;
            }

            res.json({ user: updated });
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
    const { user: userToDelete, collection } = await (await import('../services/userService.js')).findUserById(targetId);
        if (!userToDelete) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Only the user themselves or faculty can delete the account
        if (req.user!.role !== 'faculty' && req.user!._id.toString() !== targetId) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

    // If student, remove complaints created by this user
    if (collection === 'student') {
        await Complaint.deleteMany({ studentId: userToDelete._id });
        await (await import('../services/userService.js')).deleteUserById(targetId);
        res.json({ message: 'User and related complaints deleted successfully' });
        return;
    }

    // Faculty deletion
    await (await import('../services/userService.js')).deleteUserById(targetId);
    res.json({ message: 'Faculty deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

export default router; 

