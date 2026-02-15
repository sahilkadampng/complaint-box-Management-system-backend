import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const createAdminUser = async () => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/complaint-box';
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');

        // Admin user details
        const adminData = {
            name: 'System Administrator',
            username: 'sahil',
            email: 'sahilkadam9195@gmail.com', // Change this to your email
            password: 'Admin@12345', // Change this password
            phoneNumber: '+91 93078 91604', // Add unique phone number
            role: 'admin' as const,
            createdBy: 'system',
        };

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ username: adminData.username });
        if (existingAdmin) {
            console.log('❌ Admin user already exists with username:', adminData.username);
            console.log('Existing admin email:', existingAdmin.email);
            await mongoose.disconnect();
            process.exit(0);
        }

        // Check if email already exists
        const existingEmail = await Admin.findOne({ email: adminData.email });
        if (existingEmail) {
            console.log('❌ A user already exists with email:', adminData.email);
            await mongoose.disconnect();
            process.exit(0);
        }

        // Create admin user
        const admin = new Admin(adminData);
        await admin.save();

        console.log('✅ Admin user created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('👤 Username:', adminData.username);
        console.log('📧 Email:', adminData.email);
        console.log('🔑 Password:', adminData.password);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n⚠️  IMPORTANT: Change the password after first login!');
        console.log('\n📝 To customize admin details, edit this script before running.');

        await mongoose.disconnect();
        console.log('\n✅ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin user:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

// Run the script
createAdminUser();
