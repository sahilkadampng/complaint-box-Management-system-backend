import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Admin from '../models/Admin.js';
import { Document } from 'mongoose';

export type UserDoc = Document & any;

export const findUserById = async (id: string, opts?: { withPassword?: boolean }): Promise<{ user: UserDoc | null; collection: 'student' | 'faculty' | 'admin' | null }> => {
    const select = opts?.withPassword ? '+password' : '-password';

    let user = await Student.findById(id).select(select as any);
    if (user) return { user, collection: 'student' };

    user = await Faculty.findById(id).select(select as any);
    if (user) return { user, collection: 'faculty' };

    user = await Admin.findById(id).select(select as any);
    if (user) return { user, collection: 'admin' };

    return { user: null, collection: null };
};

export const findUserForLogin = async (username: string, role: 'student' | 'faculty' | 'admin') => {
    const uname = (username || '').toLowerCase();
    if (role === 'faculty') {
        return { user: await Faculty.findOne({ username: uname }).select('+password'), collection: 'faculty' as const };
    }
    if (role === 'admin') {
        return { user: await Admin.findOne({ username: uname }).select('+password'), collection: 'admin' as const };
    }
    return { user: await Student.findOne({ username: uname }).select('+password'), collection: 'student' as const };
};

export const findUserByEmail = async (email: string, role?: 'student' | 'faculty' | 'admin') => {
    const emailLower = (email || '').toLowerCase();
    if (role === 'admin') {
        return { user: await Admin.findOne({ email: emailLower }).select('+password'), collection: 'admin' as const };
    }
    if (role === 'faculty') {
        return { user: await Faculty.findOne({ email: emailLower }).select('+password'), collection: 'faculty' as const };
    }
    if (role === 'student') {
        return { user: await Student.findOne({ email: emailLower }).select('+password'), collection: 'student' as const };
    }
    // Search all collections if no role specified
    let user = await Student.findOne({ email: emailLower }).select('+password');
    if (user) return { user, collection: 'student' as const };
    
    user = await Faculty.findOne({ email: emailLower }).select('+password');
    if (user) return { user, collection: 'faculty' as const };
    
    user = await Admin.findOne({ email: emailLower }).select('+password');
    if (user) return { user, collection: 'admin' as const };
    
    return { user: null, collection: null };
};

export const usernameOrEmailExists = async (username: string, email: string) => {
    const uname = (username || '').toLowerCase();
    const emailLower = (email || '').toLowerCase();

    const studentByUsername = await Student.findOne({ username: uname });
    const facultyByUsername = await Faculty.findOne({ username: uname });
    const adminByUsername = await Admin.findOne({ username: uname });

    const studentByEmail = await Student.findOne({ email: emailLower });
    const facultyByEmail = await Faculty.findOne({ email: emailLower });
    const adminByEmail = await Admin.findOne({ email: emailLower });

    return {
        usernameExists: !!studentByUsername || !!facultyByUsername || !!adminByUsername,
        emailExists: !!studentByEmail || !!facultyByEmail || !!adminByEmail,
    };
};

export const createUserByRole = async (data: any) => {
    if (data.role === 'faculty') {
        const faculty = new Faculty(data);
        await faculty.save();
        const obj: any = faculty.toObject();
        delete obj.password;
        return { user: obj, collection: 'faculty' as const };
    }

    if (data.role === 'admin') {
        const admin = new Admin({ ...data, role: 'admin' });
        await admin.save();
        const obj: any = admin.toObject();
        delete obj.password;
        return { user: obj, collection: 'admin' as const };
    }

    const student = new Student({ ...data, role: 'student' });
    await student.save();
    const obj: any = student.toObject();
    delete obj.password;
    return { user: obj, collection: 'student' as const };
};

export const updateUserById = async (id: string, updateData: any) => {
    // Prevent role changes via this helper
    if (updateData.role) {
        throw new Error('Changing role is not supported via update; recreate the user to change role');
    }

    const { user, collection } = await findUserById(id);
    if (!user) return null;

    if (collection === 'faculty') {
        const updated = await Faculty.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select('-password');
        return updated;
    }

    if (collection === 'admin') {
        const updated = await Admin.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select('-password');
        return updated;
    }

    const updated = await Student.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select('-password');
    return updated;
};

export const deleteUserById = async (id: string) => {
    const { user, collection } = await findUserById(id);
    if (!user) return { deleted: false };

    if (collection === 'faculty') {
        await Faculty.findByIdAndDelete(id);
        return { deleted: true, collection: 'faculty' };
    }

    if (collection === 'admin') {
        await Admin.findByIdAndDelete(id);
        return { deleted: true, collection: 'admin' };
    }

    await Student.findByIdAndDelete(id);
    return { deleted: true, collection: 'student', user };
};

export const listUsers = async (role?: 'student' | 'faculty' | 'admin', page = 1, limit = 50) => {
    const skip = (page - 1) * limit;

    // Faculty only
    if (role === 'faculty') {
        const users = await Faculty.find({}).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
        const total = await Faculty.countDocuments();
        return { users, total };
    }

    // Admin only
    if (role === 'admin') {
        const users = await Admin.find({}).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
        const total = await Admin.countDocuments();
        return { users, total };
    }

    // Student only
    if (role === 'student') {
        const users = await Student.find({}).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit);
        const total = await Student.countDocuments();
        return { users, total };
    }

    // All users: fetch all three collections, merge, sort, then paginate
    const [students, faculty, admins] = await Promise.all([
        Student.find({}).select('-password'),
        Faculty.find({}).select('-password'),
        Admin.find({}).select('-password'),
    ]);

    const merged = [...students, ...faculty, ...admins]
        // Ensure each record has a createdAt date for sorting
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const total = merged.length;
    const paged = merged.slice(skip, skip + limit);

    return { users: paged, total };
};
