import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const dropIndex = async () => {
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

        const indexes = ['phoneNumber_1', 'studentId_1', 'rollNumber_1'];
        for (const indexName of indexes) {
            try {
                await collection.dropIndex(indexName);
                console.log(`✅ Dropped ${indexName} index`);
            } catch (e: any) {
                console.log(`⚠️  ${indexName} - ${e.message}`);
            }
        }

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

dropIndex();
