import mongoose, { Schema, Document } from 'mongoose';
import { Types } from "mongoose";
import bcrypt from 'bcryptjs';

export interface IUser extends Document {

    _id: Types.ObjectId;
    name: string;
    username: string;
    email: string;
    password: string;
    role: 'student' | 'faculty' | 'admin';
    profilePicture?: string;
    department?: string;
    yearOfStudy?: string;
    program?: string;
    phoneNumber?: string;
    studentId?: string;
    rollNumber?: string;
    section?: string;
    // Notification preferences
    emailAlerts?: boolean;
    systemMessages?: boolean;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        username: {
            type: String,
            required: [true, 'Username is required'],
            trim: true,
            lowercase: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [6, 'Password must be at least 6 characters'],
            select: false, // Don't return password by default
        },
        role: {
            type: String,
            enum: ['student', 'faculty', 'admin'],
            required: [true, 'Role is required'],
        },
        profilePicture: {
            type: String,
            default: '',
        },
        department: {
            type: String,
            default: '',
        },
        yearOfStudy: {
            type: String,
            default: '',
        },
        program: {
            type: String,
            default: '',
        },
        section: {
            type: String,
            default: '',
        },
        phoneNumber: {
            type: String,
            default: '',
            unique: true,
            sparse: true, // Allow multiple empty values
        },
        studentId: {
            type: String,
            default: '',
            unique: true,
            sparse: true, // Allow multiple empty values
        },
        rollNumber: {
            type: String,
            default: '',
            unique: true,
            sparse: true, // Allow multiple empty values
        },
        // Notification preferences
        emailAlerts: {
            type: Boolean,
            default: true,
        },
        systemMessages: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: String,
            default: 'system',
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare password
UserSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

// Compound index for username + role uniqueness
UserSchema.index({ username: 1, role: 1 }, { unique: true });

export default mongoose.model<IUser>('User', UserSchema);

