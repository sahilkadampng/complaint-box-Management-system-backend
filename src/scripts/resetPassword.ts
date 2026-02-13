/**
 * Reset password for a specific user
 * Usage: tsx src/scripts/resetPassword.ts <email> <newPassword>
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Admin from '../models/Admin.js';

dotenv.config();

async function resetPassword(email: string, newPassword: string) {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/complaint-box';
        await mongoose.connect(MONGODB_URI);
        console.log('📦 Connected to MongoDB');

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Try to find user in all collections
        let user = await Student.findOne({ email: email.toLowerCase() });
        let collection = 'Student';

        if (!user) {
            user = await Faculty.findOne({ email: email.toLowerCase() });
            collection = 'Faculty';
        }

        if (!user) {
            user = await Admin.findOne({ email: email.toLowerCase() });
            collection = 'Admin';
        }

        if (!user) {
            console.log('❌ User not found with email:', email);
            process.exit(1);
        }

        // Update password
        user.password = hashedPassword;
        await user.save();

        console.log('✅ Password reset successfully!');
        console.log('📋 Details:');
        console.log(`   Collection: ${collection}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role}`);
        console.log('\n🔐 New credentials:');
        console.log(`   Email/Username: ${user.email} or ${user.username}`);
        console.log(`   Password: ${newPassword}`);

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Get arguments
const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
    console.log('Usage: tsx src/scripts/resetPassword.ts <email> <newPassword>');
    console.log('Example: tsx src/scripts/resetPassword.ts moyemoye834@gmail.com newPassword123');
    process.exit(1);
}

resetPassword(email, newPassword);
