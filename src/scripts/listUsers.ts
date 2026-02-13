/**
 * List all users in the database
 * Usage: tsx src/scripts/listUsers.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Admin from '../models/Admin.js';

dotenv.config();

async function listUsers() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/complaint-box';
        await mongoose.connect(MONGODB_URI);
        console.log('📦 Connected to MongoDB\n');

        console.log('👨‍🎓 STUDENTS:');
        const students = await Student.find().select('name username email role department').limit(10);
        students.forEach((s, i) => {
            console.log(`${i + 1}. ${s.name}`);
            console.log(`   Username: ${s.username}`);
            console.log(`   Email: ${s.email}`);
            console.log(`   Department: ${s.department || 'N/A'}\n`);
        });
        console.log(`Total students: ${await Student.countDocuments()}\n`);

        console.log('👨‍🏫 FACULTY:');
        const faculty = await Faculty.find().select('name username email role department').limit(10);
        faculty.forEach((f, i) => {
            console.log(`${i + 1}. ${f.name}`);
            console.log(`   Username: ${f.username}`);
            console.log(`   Email: ${f.email}`);
            console.log(`   Department: ${f.department || 'N/A'}\n`);
        });
        console.log(`Total faculty: ${await Faculty.countDocuments()}\n`);

        console.log('👨‍💼 ADMINS:');
        const admins = await Admin.find().select('name username email role').limit(10);
        admins.forEach((a, i) => {
            console.log(`${i + 1}. ${a.name}`);
            console.log(`   Username: ${a.username}`);
            console.log(`   Email: ${a.email}\n`);
        });
        console.log(`Total admins: ${await Admin.countDocuments()}\n`);

        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

listUsers();
