import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: '../../.env' });

// Simple schema for migration
const complaintSchema = new mongoose.Schema({
    status: String,
    history: [{
        status: String,
        date: Date,
        updatedBy: String,
        note: String
    }]
}, { strict: false });

const Complaint = mongoose.model('Complaint', complaintSchema);

const updateComplaintStatuses = async () => {
    try {
        const mongoUri = 'mongodb+srv://sahilkadam9195_db_user:9WXSkfOmuXBtI7N4@cluster0.42hrenn.mongodb.net';
        
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Update all complaints with old status to new status
        const result = await Complaint.updateMany(
            { status: 'under_clarification' },
            { $set: { status: 'need_clarification' } }
        );

        console.log(`Updated ${result.modifiedCount} complaints with status from 'under_clarification' to 'need_clarification'`);

        // Also update history entries
        const historyResult = await Complaint.updateMany(
            { 'history.status': 'under_clarification' },
            { $set: { 'history.$[elem].status': 'need_clarification' } },
            { arrayFilters: [{ 'elem.status': 'under_clarification' }] }
        );

        console.log(`Updated ${historyResult.modifiedCount} complaints with history status updates`);

        console.log('Migration completed successfully');
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

updateComplaintStatuses();
