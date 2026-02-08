import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Admin from '../models/Admin.js';

export interface AuthRequest extends Request {
    user?: any;
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
            userId: string;
            role?: 'student' | 'faculty' | 'admin';
        };

        let user = null;

        // If role included in token, fetch directly from that collection
        if (decoded.role === 'faculty') {
            user = await Faculty.findById(decoded.userId).select('-password');
        } else if (decoded.role === 'admin') {
            user = await Admin.findById(decoded.userId).select('-password');
        } else if (decoded.role === 'student') {
            user = await Student.findById(decoded.userId).select('-password');
        } else {
            // Fallback: try all collections
            user = await Student.findById(decoded.userId).select('-password') || 
                   await Faculty.findById(decoded.userId).select('-password') ||
                   await Admin.findById(decoded.userId).select('-password');
        }

        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const authorize = (...roles: ('student' | 'faculty' | 'admin')[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        next();
    };
};

