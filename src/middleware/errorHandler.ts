import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
    statusCode?: number;
    status?: string;
}

export const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Handle body-parser "payload too large" errors explicitly
    const msg = err.message || '';
    if ((err as any).type === 'entity.too.large' || /too large/i.test(msg)) {
        res.status(413).json({ status: 'error', error: 'Payload too large. Please upload smaller files (max 10MB).' });
        return;
    }

    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';

    res.status(statusCode).json({
        status,
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
    const err: AppError = new Error(`Route ${req.originalUrl} not found`);
    err.statusCode = 404;
    next(err);
};

