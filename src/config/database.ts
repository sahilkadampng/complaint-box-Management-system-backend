import mongoose from 'mongoose';

let isConnected = false;
let connectionPromise: Promise<void> | null = null;

export const connectDB = async (): Promise<void> => {
    if (isConnected) return;
    if (connectionPromise) return connectionPromise;

    connectionPromise = (async () => {
        try {
            const mongoURI =
                process.env.MONGODB_URI || 'mongodb://localhost:27017/complaint-box';

            await mongoose.connect(mongoURI, {
                maxPoolSize: process.env.VERCEL ? 5 : 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });

            isConnected = true;
            console.log('✅ MongoDB connected successfully');
        } catch (error: any) {
            connectionPromise = null; // Allow retry on failure
            console.error('❌ MongoDB connection error:', error.message || error);
            if (!process.env.VERCEL) {
                process.exit(1);
            }
        }
    })();

    return connectionPromise;
};