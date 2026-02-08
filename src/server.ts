import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Routes
import authRoutes from './routes/auth.js';
import complaintRoutes from './routes/complaints.js';
import userRoutes from './routes/users.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));

app.options('*', cors()); //IMPORTANT preflight fix

// Increase payload limits to allow file uploads sent as base64 (frontend enforces file size too)
// Set slightly above frontend limit (10MB) to allow encoding overhead
app.use(express.json({ limit: '12mb' }));
app.use(express.urlencoded({ extended: true, limit: '12mb' }));


// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/users', userRoutes);

// Add root /api handler to respond to bare '/api' requests and avoid 404s
app.get('/api', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Complaint Box API',
        endpoints: ['/api/health', '/api/auth', '/api/complaints', '/api/users'],
    });
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

