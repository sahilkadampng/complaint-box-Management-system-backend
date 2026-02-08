import express, { Request, Response } from 'express';
import jwt, { type SignOptions, type Secret } from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import VerificationCode from '../models/VerificationCode.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { errorHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Generate JWT token (includes role to help server determine collection)
const generateToken = (userId: string, role?: 'student' | 'faculty' | 'admin'): string => {
    const secret: Secret = process.env.JWT_SECRET ?? 'fallback-secret';
    const expiresInEnv = process.env.JWT_EXPIRES_IN ?? '7d';
    const signOptions: SignOptions = { expiresIn: expiresInEnv as SignOptions['expiresIn'] };
    return jwt.sign({ userId, role }, secret, signOptions);
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
        body('role').isIn(['student', 'faculty', 'admin']).withMessage('Role must be student, faculty, or admin'),
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
                section,
                yearOfStudy,
                program,
                phoneNumber,
                studentId,
                rollNumber,
            } = req.body;

            // Check if username exists for the same role
            // Check username/email across both collections
            const { usernameExists, emailExists } = await (await import('../services/userService.js')).usernameOrEmailExists(username, email);
            if (usernameExists) {
                res.status(400).json({ error: 'Username already exists' });
                return;
            }
            if (emailExists) {
                res.status(400).json({ error: 'Email already registered' });
                return;
            }

            // Create in the right collection
            const { user: createdUser, collection } = await (await import('../services/userService.js')).createUserByRole({
                name,
                username: username.toLowerCase(),
                email: email.toLowerCase(),
                password,
                role,
                profilePicture,
                department,
                section,
                yearOfStudy,
                program,
                phoneNumber,
                studentId,
                rollNumber,
            });

            const token = generateToken(createdUser._id.toString(), role);

            res.status(201).json({
                token,
                user: createdUser,
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
        body('role').isIn(['student', 'faculty', 'admin']).withMessage('Role must be student, faculty, or admin'),
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { username, password, role } = req.body;

            const { user, collection } = await (await import('../services/userService.js')).findUserForLogin(username, role);

            if (!user) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            // Ensure role included in token to simplify subsequent lookups
            const token = generateToken(user._id.toString(), role);

            // Remove password from response
            const obj: any = user.toObject();
            delete obj.password;

            res.json({
                token,
                user: obj,
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
            // Prevent role change via profile update
            if (updateData.role) {
                res.status(400).json({ error: 'Changing role via profile update is not supported' });
                return;
            }

            const updated = await (await import('../services/userService.js')).updateUserById(req.user!._id.toString(), updateData);

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

            // Fetch user including password using userService
            const { user } = await (await import('../services/userService.js')).findUserById(req.user!._id, { withPassword: true });
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

// @route   PATCH /api/auth/admin/send-code
// @desc    Send verification code to admin email
// @access  Public
router.patch(
    '/admin/send-code',
    [body('email').isEmail().withMessage('Please provide a valid email')],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { email } = req.body;

            // Check if user with this email exists and is admin
            const { user } = await (await import('../services/userService.js')).findUserByEmail(
                email,
                'admin'
            );

            if (!user) {
                res.status(404).json({ error: 'Admin account not found' });
                return;
            }

            // Generate 6-digit code
            const code = Math.floor(100000 + Math.random() * 900000).toString();

            // Save code in database with 10 minute expiration
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
            await VerificationCode.create({
                email,
                code,
                expiresAt
            });

            // Send email (using mailer utility)
            const { sendEmail } = await import('../utils/mailer.js');
            await sendEmail(
                email,
                'Admin Login Verification Code - Complaint Box',
                `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <style>
                            body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8f9fa; }
                            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                            .header { padding: 40px 20px; text-align: center; }
                            .logo { font-size: 28px; font-weight: bold; margin-bottom: 10px; letter-spacing: -0.5px; }
                            .header-subtitle { font-size: 14px; opacity: 0.9; }
                            .content { padding: 40px 30px; }
                            .greeting { font-size: 18px; color: #1f2937; font-weight: 500; margin-bottom: 20px; }
                            .message { font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 30px; }
                            .code-section { background: linear-gradient(135deg, #F0F0F0 0%, #F0F0F0 100%); border-left: 4px solid #404040; padding: 25px; margin: 30px 0; border-radius: 6px; }
                            .code-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 12px; }
                            .code-display { font-size: 42px; font-weight: bold; color: #404040; letter-spacing: 6px; font-family: 'Arial', monospace; text-align: center; margin: 15px 0; }
                            .code-info { font-size: 13px; color: #6b7280; text-align: center; margin-top: 15px; }
                            .security-notice { background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 15px; margin: 25px 0; font-size: 13px; color: #78350f; }
                            .security-notice strong { color: #b45309; }
                            .divider { height: 1px; background-color: #e5e7eb; margin: 30px 0; }
                            .footer { background-color: #f9fafb; padding: 25px 30px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
                            .footer-text { margin-bottom: 10px; line-height: 1.6; }
                            .footer-links { margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb; }
                            .footer-links a { color: #1e40af; text-decoration: none; margin-right: 15px; }
                            .footer-links a:hover { text-decoration: underline; }
                            .timestamp { color: #9ca3af; font-size: 11px; margin-top: 15px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <div class="logo"><img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdQoEr1ttWgUGvrKG6hcm9UDzR0P-lE0_dNQ&s"></div>
                                <div class="header-subtitle">Admin Portal Verification</div>
                            </div>
                            
                            <div class="content">
                                <div class="greeting">Hello Admin,</div>
                                <div class="message">
                                    We received a request to access your admin account. To ensure your account security, please use the verification code below to complete your login.
                                </div>
                                
                                <div class="code-section">
                                    <div class="code-label">Your Verification Code</div>
                                    <div class="code-display">${code}</div>
                                    <div class="code-info">This code expires in <strong>10 minutes</strong></div>
                                </div>
                                
                                <div class="security-notice">
                                    <strong>Security Reminder:</strong> Never share this code with anyone. Our team will never ask for your verification code via email, phone, or message.
                                </div>
                                
                                <div class="message">
                                    If you did not request this verification code, please:
                                    <ul style="margin: 10px 0; padding-left: 20px; color: #4b5563;">
                                        <li>Ignore this email</li>
                                        <li>Change your password immediately</li>
                                        <li>Contact support if you notice suspicious activity</li>
                                    </ul>
                                </div>
                                
                                <div class="divider"></div>
                            </div>
                            
                            <div class="footer">
                                <div class="footer-text">
                                    This is an automated message from DYP DPU Panel. Please do not reply to this email.
                                </div>
                                <div class="footer-links">
                                    <a href="#">Help Center</a>
                                    <a href="#">Report Abuse</a>
                                    <a href="#">Privacy Policy</a>
                                </div>
                                <div class="timestamp">
                                    Message ID: ${new Date().getTime()}<br>
                                    Sent on ${new Date().toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </body>
                    </html>
                `,
                `Admin Login Verification Code: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this code, please change your password immediately and contact support.\n\nFor security, never share this code with anyone.`
            );

            res.json({ message: 'Verification code sent successfully' });
        } catch (error: any) {
            console.error('Send code error:', error);
            res.status(500).json({ error: error.message || 'Failed to send verification code' });
        }
    }
);

// @route   PATCH /api/auth/admin/verify-code
// @desc    Verify admin code
// @access  Public
router.patch(
    '/admin/verify-code',
    [
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('code').trim().notEmpty().withMessage('Verification code is required')
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { email, code } = req.body;

            // Find verification code in database
            const storedCode = await VerificationCode.findOne({ email });

            if (!storedCode) {
                res.status(400).json({ error: 'No verification code found. Please request a new code.' });
                return;
            }

            // Check if code has expired
            if (new Date() > storedCode.expiresAt) {
                await VerificationCode.deleteOne({ email });
                res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
                return;
            }

            // Verify code matches
            if (storedCode.code !== code) {
                res.status(400).json({ error: 'Invalid verification code' });
                return;
            }

            // Code is valid - clean up
            await VerificationCode.deleteOne({ email });

            res.json({ message: 'Code verified successfully' });
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'Verification failed' });
        }
    }
);

// @route   POST /api/auth/admin/login
// @desc    Admin login with email and password (after verification)
// @access  Public
router.post(
    '/admin/login',
    [
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password').trim().notEmpty().withMessage('Password is required')
    ],
    async (req: Request, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }

            const { email, password } = req.body;

            // Find admin user by email
            const { user } = await (await import('../services/userService.js')).findUserByEmail(email, 'admin');

            if (!user) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            // Verify password
            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            // Generate token
            const token = generateToken(user._id.toString(), 'admin');

            // Remove password from response
            const obj: any = user.toObject();
            delete obj.password;

            res.json({
                token,
                user: obj,
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message || 'Login failed' });
        }
    }
);
export default router;

