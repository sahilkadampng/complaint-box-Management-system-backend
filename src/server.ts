import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { connectDB } from './config/database.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { swaggerSpec } from './config/swagger.js';

// Routes
import authRoutes from './routes/auth.js';
import complaintRoutes from './routes/complaints.js';
import userRoutes from './routes/users.js';
import utilsRoutes from './routes/utils.js';

// Load environment variables
if (!process.env.VERCEL) {
    dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));

app.options('*', cors()); // IMPORTANT preflight fix

// Increase payload limits to allow file uploads sent as base64 (frontend enforces file size too)
// Set slightly above frontend limit (10MB) to allow encoding overhead
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));


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
    });
}

export default app;

