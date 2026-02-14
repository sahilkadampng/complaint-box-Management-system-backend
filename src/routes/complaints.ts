import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult, query } from 'express-validator';
import Complaint, { IComplaint, ComplaintStatus } from '../models/Complaint.js';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.js';
import { generateComplaintId } from '../idgenerater.js';
import { uploadSingle } from '../middleware/upload.js';
import { uploadToCloudinary } from '../services/uploadService.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Complaints
 *     description: Complaint management endpoints
 */

/**
 * @swagger
 * /api/complaints:
 *   get:
 *     summary: Get all complaints
 *     description: Retrieve complaints filtered by role (students see only their complaints, faculty/admin see all)
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [submitted, in_review, need_clarification, assigned, resolved, escalated, all]
 *         description: Filter by complaint status
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by complaint category
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
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Complaints retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 complaints:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Complaint'
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
 *       500:
 *         description: Server error
 */
// @route   GET /api/complaints
// @desc    Get all complaints (filtered by role)
// @access  Private
router.get(
    '/',
    authenticate,
    [
        query('status').optional().isIn(['submitted', 'in_review', 'need_clarification', 'assigned', 'resolved', 'escalated']),
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
            .select('-attachment -readBy')
                .populate('studentId', 'name username email')
                .populate('assignedTo', 'name username')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean()
                .exec();

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

/**
 * @swagger
 * /api/complaints/{id}:
 *   get:
 *     summary: Get single complaint
 *     description: Retrieve a specific complaint by ID (students can only view their own)
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Complaint ID (MongoDB _id or complaintId)
 *     responses:
 *       200:
 *         description: Complaint retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 complaint:
 *                   $ref: '#/components/schemas/Complaint'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Complaint not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/complaints:
 *   post:
 *     summary: Create new complaint
 *     description: Submit a new complaint (students only)
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *                 example: "Broken equipment in lab"
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "The computers in Lab 301 are not working properly"
 *               category:
 *                 type: string
 *                 example: "Infrastructure"
 *               attachment:
 *                 type: string
 *                 description: Base64 encoded file
 *               department:
 *                 type: string
 *                 example: "Computer Science"
 *               yearOfStudy:
 *                 type: string
 *                 example: "2024"
 *     responses:
 *       201:
 *         description: Complaint created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 complaint:
 *                   $ref: '#/components/schemas/Complaint'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Only students can create complaints
 *       500:
 *         description: Server error
 */
// @route   POST /api/complaints
// @desc    Create new complaint
// @access  Private (Student only)
router.post(
    '/',
    authenticate,
    authorize('student'),
    // Multer parses multipart/form-data; text fields land in req.body, file in req.file
    (req: Request, res: Response, next: NextFunction) => {
        uploadSingle(req, res, (err: any) => {
            if (err) {
                const message = err.code === 'LIMIT_FILE_SIZE'
                    ? 'File too large. Maximum size is 10 MB.'
                    : err.message || 'File upload error';
                return res.status(400).json({ error: message });
            }
            next();
        });
    },
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
            const { title, description, category, department, yearOfStudy } = req.body;
            const user = req.user!;

            // Upload attachment to Cloudinary if provided
            let attachmentUrl = '';
            if (req.file) {
                const result = await uploadToCloudinary(req.file.buffer);
                attachmentUrl = result.url;
            }

            const complaint = new Complaint({
                title,
                description,
                category,
                studentId: user._id,
                studentName: user.name,
                studentUsername: user.username,
                attachment: attachmentUrl,
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

            await complaint.save();
            const populatedComplaint = await Complaint.findById(complaint._id)
                .populate('studentId', 'name username email')
                .populate('assignedTo', 'name username');

            // Notify faculty in the same department who have email alerts enabled
            (async () => {
                try {
                    const department = populatedComplaint?.department || '';
                    if (!department) {
                        // No department: skip notification
                        return;
                    }
                    // Lazy-import mailer/models to avoid circular deps and keep handler lightweight
                    const { sendEmail } = await import('../utils/mailer.js');
                    const Faculty = (await import('../models/Faculty.js')).default;

                    const facultyMembers = await Faculty.find({ department, emailAlerts: true }).select('email name username');
                    const emails = facultyMembers.map((f: any) => f.email).filter(Boolean);
                    if (emails.length === 0) return;

                    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                    const link = `${frontendUrl}/complaints/${populatedComplaint?._id || complaint._id}`;
                    const studentLabel = populatedComplaint?.studentName
                        ? `${populatedComplaint.studentName} (${populatedComplaint.studentUsername})`
                        : 'N/A';

                    const html = `
                        <div style="font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;padding:32px;color:#0f172a;">
                            <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:14px;box-shadow:0 12px 32px rgba(15,23,42,0.12);overflow:hidden;border:1px solid #e5e7eb;">
                            <div style="background:#4D2B8C;padding:24px 28px;color:#ffffff;">
                                <h2 style="margin:0;font-size:20px;font-weight:600;">New Complaint Assigned</h2>
                                <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">
                                Action required for the ${department} department
                                </p>
                            </div>
                            <div style="padding:26px 28px;">
                                <img style="display:block; margin:0 auto;" src="" height="200px" width="260px">
                                <p style="margin:0 0 10px;margin-top:20px;font-size:15px;">Hello Team,</p>
                                <p style="margin:0 0 18px;font-size:14px;color:#334155;line-height:1.6;">
                                A new complaint has been submitted under the 
                                <strong style="color:#0f172a;">${department}</strong> department.  
                                Please review the information below and take necessary action.
                                </p>
                                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 18px;margin-bottom:20px;">
                                <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:4px;">
                                    Complaint Title
                                </div>
                                <div style="font-size:16px;font-weight:600;color:#0f172a;margin-bottom:12px;">
                                    ${populatedComplaint?.title || 'Untitled complaint'}
                                </div>
                                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                                    <span style="padding:6px 12px;background:#eef2ff;color:#3730a3;border-radius:999px;font-size:12px;font-weight:500;">
                                    ${populatedComplaint?.category || 'Uncategorized'}
                                    </span>
                                    <span style="padding:6px 12px;background:#ecfeff;color:#155e75;border-radius:999px;font-size:12px;font-weight:500;">
                                    Student: ${`N/A`}
                                    </span>
                                </div>
                                </div>
                                <div style="text-align:center;margin:24px 0;">
                                <a href="${link}" 
                                    style="display:inline-block;background:#85409D;color:#ffffff;
                                    text-decoration:none;padding:14px 26px;border-radius:12px;
                                    font-size:14px;font-weight:600;">
                                    View Complaint Details ->
                                </a>
                                </div>
                                <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
                                <p style="margin:0;font-size:12px;color:#64748b;line-height:1.6;text-align:center;">
                                You are receiving this email because you are subscribed to department complaint notifications.  
                                Please do not reply to this automated message.
                                </p>
                            </div>
                            </div>
                        </div>
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

/**
 * @swagger
 * /api/complaints/{id}:
 *   put:
 *     summary: Update complaint
 *     description: Update complaint details (students can only update their own)
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Complaint ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 maxLength: 100
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *               category:
 *                 type: string
 *               attachment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Complaint updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 complaint:
 *                   $ref: '#/components/schemas/Complaint'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Complaint not found
 *       500:
 *         description: Server error
 */
// @route   PUT /api/complaints/:id
// @desc    Update complaint
// @access  Private
router.put(
    '/:id',
    authenticate,
    // Multer for optional file replacement
    (req: Request, res: Response, next: NextFunction) => {
        uploadSingle(req, res, (err: any) => {
            if (err) {
                const message = err.code === 'LIMIT_FILE_SIZE'
                    ? 'File too large. Maximum size is 10 MB.'
                    : err.message || 'File upload error';
                return res.status(400).json({ error: message });
            }
            next();
        });
    },
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
            const { title, description, category } = req.body;
            if (title) complaint.title = title;
            if (description) complaint.description = description;
            if (category) complaint.category = category;

            // Upload new attachment to Cloudinary if a file was provided
            if (req.file) {
                const result = await uploadToCloudinary(req.file.buffer);
                complaint.attachment = result.url;
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

/**
 * @swagger
 * /api/complaints/{id}/status:
 *   patch:
 *     summary: Update complaint status
 *     description: Update complaint status and add notes (faculty only)
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Complaint ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [submitted, in_review, need_clarification, assigned, resolved, escalated]
 *               note:
 *                 type: string
 *                 description: Optional note about status change
 *               assignedTo:
 *                 type: string
 *                 description: Faculty member ID to assign complaint to
 *               clarificationMessage:
 *                 type: string
 *                 description: Message when requesting clarification
 *     responses:
 *       200:
 *         description: Status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 complaint:
 *                   $ref: '#/components/schemas/Complaint'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Faculty only
 *       404:
 *         description: Complaint not found
 *       500:
 *         description: Server error
 */
// @route   PATCH /api/complaints/:id/status
// @desc    Update complaint status (Faculty only)
// @access  Private (Faculty only)
router.patch(
    '/:id/status',
    authenticate,
    authorize('faculty'),
    [
        body('status')
            .isIn(['submitted', 'in_review', 'need_clarification', 'assigned', 'resolved', 'escalated'])
            .withMessage('Invalid status'),
        body('note').optional().trim(),
        body('assignedTo').optional().trim(),
        body('clarificationMessage').optional().trim(),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { status, note, assignedTo, clarificationMessage } = req.body;

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

            // Set clarification message if status is need_clarification
            if (status === 'need_clarification' && clarificationMessage) {
                complaint.clarificationMessage = clarificationMessage;
            } else if (status !== 'need_clarification') {
                // Clear clarification message if status changes from need_clarification
                complaint.clarificationMessage = '';
            }

            // Reset read status when faculty updates - student needs to see the update
            complaint.isRead = false;
            complaint.readBy = [];

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

/**
 * @swagger
 * /api/complaints/{id}:
 *   delete:
 *     summary: Delete complaint
 *     description: Delete a complaint (students can only delete their own)
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Complaint ID
 *     responses:
 *       200:
 *         description: Complaint deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Complaint not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/complaints/{id}/read:
 *   patch:
 *     summary: Mark complaint as read
 *     description: Mark a complaint as read by the current user
 *     tags: [Complaints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Complaint ID
 *     responses:
 *       200:
 *         description: Complaint marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 complaint:
 *                   $ref: '#/components/schemas/Complaint'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Complaint not found
 *       500:
 *         description: Server error
 */
// @route   PATCH /api/complaints/:id/read
// @desc    Mark complaint as read
// @access  Private
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            res.status(404).json({ error: 'Complaint not found' });
            return;
        }

        // Check if user already marked as read
        if (!complaint.readBy.includes(req.user!._id.toString())) {
            complaint.readBy.push(req.user!._id.toString());
        }

        // If all relevant users have read, mark as read
        if (complaint.readBy.length > 0 && !complaint.isRead) {
            complaint.isRead = true;
        }

        await complaint.save();

        res.json({
            message: 'Complaint marked as read',
            complaint,
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message || 'Server error' });
    }
});
export default router;