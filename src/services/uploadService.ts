import cloudinary from '../config/cloudinary.js';
import type { UploadApiResponse } from 'cloudinary';

interface UploadResult {
    url: string;
    publicId: string;
}

/**
 * Upload a file buffer to Cloudinary.
 * Returns the secure URL and the public_id (for future deletion).
 */
export const uploadToCloudinary = (
    buffer: Buffer,
    folder = 'complaint-attachments'
): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'auto', // auto-detect image vs pdf
                quality: 'auto:good',  // auto-optimise quality
                fetch_format: 'auto',  // serve webp where supported
            },
            (error, result?: UploadApiResponse) => {
                if (error || !result) return reject(error ?? new Error('Upload failed'));
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );
        stream.end(buffer);
    });
};

/**
 * Delete a file from Cloudinary by public_id.
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (err) {
        console.error('Cloudinary delete error:', err);
    }
};
