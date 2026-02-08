import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/complaint-box';

        await mongoose.connect(mongoURI);

        console.log('✅ MongoDB connected successfully');
    } catch (error: any) {
        console.error('❌ MongoDB connection error:', error.message || error);
        console.error('Full error:', error);
        // Don't exit in development - let the server start and show errors
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB error:', err);
});

