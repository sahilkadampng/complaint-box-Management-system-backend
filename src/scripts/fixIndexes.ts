import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const fixIndexes = async () => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/complaint-box';
        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('Database connection not established');
        }
        
        const usersCollection = db.collection('users');

        console.log('\n📋 Checking existing indexes...');
        const indexes = await usersCollection.indexes();
        console.log('Current indexes:', indexes.map(i => i.name));

        // Drop problematic unique indexes
        const indexesToDrop = ['phoneNumber_1', 'studentId_1', 'rollNumber_1'];
        
        for (const indexName of indexesToDrop) {
            try {
                await usersCollection.dropIndex(indexName);
                console.log(`✅ Dropped index: ${indexName}`);
            } catch (error: any) {
                if (error.code === 27) {
                    console.log(`ℹ️  Index ${indexName} doesn't exist (already dropped)`);
                } else {
                    console.log(`⚠️  Could not drop ${indexName}:`, error.message);
                }
            }
        }

        // Create new sparse indexes
        console.log('\n📝 Creating new sparse indexes...');
        
        await usersCollection.createIndex(
            { phoneNumber: 1 },
            { unique: true, sparse: true, name: 'phoneNumber_1' }
        );
        console.log('✅ Created sparse index: phoneNumber_1');

        await usersCollection.createIndex(
            { studentId: 1 },
            { unique: true, sparse: true, name: 'studentId_1' }
        );
        console.log('✅ Created sparse index: studentId_1');

        await usersCollection.createIndex(
            { rollNumber: 1 },
            { unique: true, sparse: true, name: 'rollNumber_1' }
        );
        console.log('✅ Created sparse index: rollNumber_1');

        console.log('\n✅ Index migration completed successfully!');
        console.log('ℹ️  Sparse indexes allow multiple empty values while ensuring uniqueness for non-empty values.');
        
        await mongoose.disconnect();
        console.log('\n✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Error fixing indexes:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

// Run the script
fixIndexes();
