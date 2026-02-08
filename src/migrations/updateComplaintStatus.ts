import mongoose from 'mongoose';
import Complaint from '../models/Complaint.js';
import dotenv from 'dotenv';

dotenv.config();

const updateComplaintStatuses = async () => {
    try {
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/complaint-box';
        
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
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

updateComplaintStatuses();
