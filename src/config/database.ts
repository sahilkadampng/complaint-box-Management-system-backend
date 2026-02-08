import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async (): Promise<void> => {
    if (isConnected) {
        return;
    }

    try {
        const mongoURI =
            process.env.MONGODB_URI || 'mongodb://localhost:27017/complaint-box';

        await mongoose.connect(mongoURI);

        isConnected = true;
        console.log('✅ MongoDB connected successfully');
    } catch (error: any) {
        console.error('❌ MongoDB connection error:', error.message || error);

        // ❌ Never process.exit on Vercel
        if (!process.env.VERCEL) {
            process.exit(1);
        }
    }
};

// Optional but safe
mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err);
});
