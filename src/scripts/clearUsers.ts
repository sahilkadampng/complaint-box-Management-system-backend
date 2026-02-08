import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const clearUsers = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        const collection = mongoose.connection.db?.collection('users');
        if (!collection) {
            console.log('❌ Could not access users collection');
            await mongoose.disconnect();
            process.exit(1);
        }

        // Drop all indexes
        try {
            await collection.dropIndexes();
            console.log('✅ Dropped all indexes');
        } catch (e: any) {
            console.log('⚠️  Error dropping indexes:', e.message);
        }

        // Delete all users
        const result = await collection.deleteMany({});
        console.log(`✅ Deleted ${result.deletedCount} users`);

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

clearUsers();
