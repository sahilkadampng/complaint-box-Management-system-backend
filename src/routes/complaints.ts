import express, { Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import Complaint, { IComplaint, ComplaintStatus } from '../models/Complaint.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { generateComplaintId } from '../idgenerater.js';

const router = express.Router();

// @route   GET /api/complaints
// @desc    Get all complaints (filtered by role)
// @access  Private
router.get(
    '/',
    authenticate,
    [
        query('status').optional().isIn(['submitted', 'in_review', 'assigned', 'resolved', 'escalated']),
        query('category').optional().trim(),
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 100 }),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const { status, category, page = '1', limit = '10' } = req.query;
            const pageNum = parseInt(page as string, 10);
            const limitNum = parseInt(limit as string, 10);
            const skip = (pageNum - 1) * limitNum;

            const query: any = {};

            // Students see only their complaints
            if (req.user!.role === 'student') {
                query.studentId = req.user!._id;
            }

            if (status && status !== 'all') query.status = status;
            if (category && category !== 'all') query.category = category;

            const complaints = await Complaint.find(query)
                .populate('studentId', 'name username email')
                .populate('assignedTo', 'name username')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum);

            const total = await Complaint.countDocuments(query);

            res.json({
                complaints,
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

// @route   GET /api/complaints/:id
// @desc    Get single complaint
// @access  Private
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        // Try by MongoDB _id first
        let complaint = await Complaint.findById(req.params.id)
            .populate('studentId', 'name username email')
            .populate('assignedTo', 'name username');

        // Fallback: try by short complaintId (human-friendly id)
        if (!complaint) {
            complaint = await Complaint.findOne({ complaintId: req.params.id })
                .populate('studentId', 'name username email')
                .populate('assignedTo', 'name username');
        }

        if (!complaint) {
            res.status(404).json({ error: 'Complaint not found' });
            return;
        }

        // Students can only view their own complaints
        if (
            req.user!.role === 'student' &&
            complaint.studentId.toString() !== req.user!._id.toString()
        ) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        res.json({ complaint });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

// @route   POST /api/complaints
// @desc    Create new complaint
// @access  Private (Student only)
router.post(
    '/',
    authenticate,
    authorize('student'),
    [
        body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 100 }),
        body('description')
            .trim()
            .notEmpty()
            .withMessage('Description is required')
            .isLength({ max: 1000 }),
        body('category').trim().notEmpty().withMessage('Category is required'),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }
            const { title, description, category, attachment, department, yearOfStudy } = req.body;
            const user = req.user!;
            const complaint = new Complaint({
                title,
                description,
                category,
                studentId: user._id,
                studentName: user.name,
                studentUsername: user.username,
                attachment: attachment || '',
                department: department || user.department || '',
                yearOfStudy: yearOfStudy || user.yearOfStudy || '',
                status: 'submitted',
                createdAt: new Date(),
                history: [
                    {
                        status: 'submitted',
                        date: new Date(),
                    },
                ],
            });

            await complaint.save()
            const populatedComplaint = await Complaint.findById(complaint._id)
                .populate('studentId', 'name username email');

            // Notify faculty in the same department who have email alerts enabled
            (async () => {
                try {
                    const department = populatedComplaint?.department || '';
                    if (!department) {
                        // No department: skip notification
                        return;
                    }

                    // Lazy-import User and mailer to avoid circular deps and keep handler lightweight
                    const User = (await import('../models/User.js')).default;
                    const { sendEmail } = await import('../utils/mailer.js');

                    const facultyMembers = await User.find({ role: 'faculty', department, emailAlerts: true }).select('email name username');
                    const emails = facultyMembers.map((f: any) => f.email).filter(Boolean);
                    if (emails.length === 0) return;

                    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                    const link = `${frontendUrl}/complaints/${populatedComplaint?._id || complaint._id}`;

                    const html = `
                        <p>Hello,</p>
                        <p>A new complaint has been submitted in <strong>${department}</strong>.</p>
                        <p><strong>Title:</strong> ${populatedComplaint?.title}</p>
                        <p><strong>Category:</strong> ${populatedComplaint?.category}</p>
                        <p><strong>Student:</strong> ${populatedComplaint?.studentName} (${populatedComplaint?.studentUsername})</p>
                        <p>View the complaint: <a href="${link}">${link}</a></p>
                        <p>— Complaint Box</p>
                    `;

                    // Send email to all faculty in BCC-like style (single send with multiple recipients)
                    await sendEmail(emails, `New complaint submitted in ${department}`, html);
                } catch (err) {
                    console.error('Failed to send faculty notification emails', err);
                }
            })();

            res.status(201).json({ complaint: populatedComplaint });
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'Server error' });
        }
    }
);

// @route   PUT /api/complaints/:id
// @desc    Update complaint
// @access  Private
router.put(
    '/:id',
    authenticate,
    [
        body('title').optional().trim().isLength({ max: 100 }),
        body('description').optional().trim().isLength({ max: 1000 }),
        body('category').optional().trim(),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const complaint = await Complaint.findById(req.params.id);

            if (!complaint) {
                res.status(404).json({ error: 'Complaint not found' });
                return;
            }

            // Students can only update their own complaints
            if (
                req.user!.role === 'student' &&
                complaint.studentId.toString() !== req.user!._id.toString()
            ) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }

            // Only allow updating certain fields
            const { title, description, category, attachment } = req.body;
            if (title) complaint.title = title;
            if (description) complaint.description = description;
            if (category) complaint.category = category;
            if (attachment !== undefined) complaint.attachment = attachment;

            await complaint.save();

            const populatedComplaint = await Complaint.findById(complaint._id)
                .populate('studentId', 'name username email')
                .populate('assignedTo', 'name username');

            res.json({ complaint: populatedComplaint });
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'Server error' });
        }
    }
);

// @route   PATCH /api/complaints/:id/status
// @desc    Update complaint status (Faculty only)
// @access  Private (Faculty only)
router.patch(
    '/:id/status',
    authenticate,
    authorize('faculty'),
    [
        body('status')
            .isIn(['submitted', 'in_review', 'assigned', 'resolved', 'escalated'])
            .withMessage('Invalid status'),
        body('note').optional().trim(),
        body('assignedTo').optional().trim(),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { status, note, assignedTo } = req.body;

            const complaint = await Complaint.findById(req.params.id);

            if (!complaint) {
                res.status(404).json({ error: 'Complaint not found' });
                return;
            }

            complaint.status = status as ComplaintStatus;

            // Add to history
            complaint.history.push({
                status: status as ComplaintStatus,
                date: new Date(),
                updatedBy: req.user!.name,
                note: note || '',
            });

            if (assignedTo) {
                complaint.assignedTo = assignedTo;
            }

            await complaint.save();

            const populatedComplaint = await Complaint.findById(complaint._id)
                .populate('studentId', 'name username email')
                .populate('assignedTo', 'name username');

            res.json({ complaint: populatedComplaint });
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'Server error' });
        }
    }
);

// @route   DELETE /api/complaints/:id
// @desc    Delete complaint
// @access  Private
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            res.status(404).json({ error: 'Complaint not found' });
            return;
        }

        // Students can only delete their own complaints
        if (
            req.user!.role === 'student' &&
            complaint.studentId.toString() !== req.user!._id.toString()
        ) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        await Complaint.findByIdAndDelete(req.params.id);

        res.json({ message: 'Complaint deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

export default router;