import express, { Request, Response } from 'express';
import crypto from 'crypto';

const router = express.Router();

/**
 * @swagger
 * /api/utils/generate-jwt-secret:
 *   post:
 *     summary: Generate a secure JWT secret
 *     description: Generates a cryptographically secure random JWT secret string that can be used as JWT_SECRET in environment variables
 *     tags: [Utils]
 *     security: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               length:
 *                 type: number
 *                 description: Length of the secret (default 64 bytes)
 *                 example: 64
 *     responses:
 *       200:
 *         description: JWT secret generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secret:
 *                   type: string
 *                   description: The generated JWT secret
 *                   example: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
 *                 length:
 *                   type: number
 *                   description: Length of the generated secret
 *                   example: 64
 *                 message:
 *                   type: string
 *                   description: Instructions for using the secret
 *                   example: "Copy this secret and add it to your .env file as JWT_SECRET"
 *       400:
 *         description: Bad request - invalid length parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/generate-jwt-secret', async (req: Request, res: Response): Promise<void> => {
    try {
        // Get requested length from body, default to 64 bytes
        const length = req.body?.length || 64;

        // Validate length
        if (typeof length !== 'number' || length < 32 || length > 256) {
            res.status(400).json({ 
                error: 'Length must be a number between 32 and 256' 
            });
            return;
        }

        // Generate cryptographically secure random bytes and convert to hex
        const secret = crypto.randomBytes(length).toString('hex');

        res.json({
            secret,
            length: secret.length,
            message: 'Copy this secret and add it to your .env file as JWT_SECRET',
            usage: `JWT_SECRET=${secret}`,
        });
    } catch (error: any) {
        res.status(500).json({ 
            error: error.message || 'Failed to generate JWT secret' 
        });
    }
});

/**
 * @swagger
 * /api/utils/hash-password:
 *   post:
 *     summary: Hash a password using bcrypt
 *     description: Utility endpoint to hash passwords for testing or admin creation
 *     tags: [Utils]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *                 description: Password to hash
 *                 example: "mySecurePassword123"
 *     responses:
 *       200:
 *         description: Password hashed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hash:
 *                   type: string
 *                   description: The bcrypt hash of the password
 *                 message:
 *                   type: string
 *                   example: "Password hashed successfully"
 *       400:
 *         description: Bad request - password not provided
 *       500:
 *         description: Server error
 */
router.post('/hash-password', async (req: Request, res: Response): Promise<void> => {
    try {
        const { password } = req.body;

        if (!password || typeof password !== 'string') {
            res.status(400).json({ 
                error: 'Password is required and must be a string' 
            });
            return;
        }

        const bcrypt = await import('bcryptjs');
        const salt = await bcrypt.default.genSalt(10);
        const hash = await bcrypt.default.hash(password, salt);

        res.json({
            hash,
            message: 'Password hashed successfully',
        });
    } catch (error: any) {
        res.status(500).json({ 
            error: error.message || 'Failed to hash password' 
        });
    }
});

export default router;
