import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { connectDB } from './config/database.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { swaggerSpec } from './config/swagger.js';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { setupKeepAlive } from './utils/keepAlive.js';

// Routes
import authRoutes from './routes/auth.js';
import complaintRoutes from './routes/complaints.js';
import userRoutes from './routes/users.js';
import utilsRoutes from './routes/utils.js';

// Load environment variables
if (!process.env.VERCEL) {
    dotenv.config();
}
//rate limit
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware - Allow requests from same origin (for Swagger) and configured origins
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like Swagger UI on same domain)
        if (!origin) return callback(null, true);

        // Allow configured origins
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Allow same-origin requests (Railway/Vercel deployment with Swagger)
        callback(null, true);
    },
    credentials: true,
}));

app.options('*', cors()); // IMPORTANT preflight fix

// Increase payload limits to allow file uploads sent as base64 (frontend enforces file size too)
// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// ratelimite
app.use('/api/', limiter);
// compression
app.use(compression());

// Set reasonable JSON payload limit (file uploads now go through Multer + Cloudinary)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));


/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Check if the server is running
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Server is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 message:
 *                   type: string
 *                   example: "Server is running"
 */
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Complaint Box API Documentation',
    customfavIcon: '/favicon.ico'
}));

// Swagger JSON
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/users', userRoutes);
app.use('/api/utils', utilsRoutes);

/**
 * @swagger
 * /api:
 *   get:
 *     summary: API information
 *     description: Get API information and available endpoints
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "OK"
 *                 message:
 *                   type: string
 *                   example: "Complaint Box API"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 documentation:
 *                   type: string
 *                   example: "/api-docs"
 *                 endpoints:
 *                   type: array
 *                   items:
 *                     type: string
 */
// Add root /api handler to respond to bare '/api' requests and avoid 404s
app.get('/api', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Complaint Box API',
        version: '1.0.0',
        documentation: '/api-docs',
        endpoints: ['/api/health', '/api/auth', '/api/complaints', '/api/users', '/api/utils'],
    });
});

app.get('/', (req, res) => {
    res.json({ status: 'Backend Live 🚀' });
});


// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server only outside Vercel's serverless runtime
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
        setupKeepAlive();
    });
}

export default app;

