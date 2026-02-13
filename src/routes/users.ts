import express, { Response } from 'express';
import { query, body, validationResult } from 'express-validator';
import Complaint from '../models/Complaint.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: User management endpoints
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve list of users (faculty and admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [student, faculty, admin]
 *         description: Filter users by role
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Faculty and admin only
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get single user
 *     description: Retrieve a specific user's profile (students can only view their own)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     description: Update user information (faculty only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [student, faculty]
 *               department:
 *                 type: string
 *               yearOfStudy:
 *                 type: string
 *               emailAlerts:
 *                 type: boolean
 *               systemMessages:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation error or role change not supported
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Faculty only
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user
 *     description: Delete a user and their complaints (user themselves or faculty)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
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

