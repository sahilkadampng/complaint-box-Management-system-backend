import mongoose, { Schema, Document } from 'mongoose';

export interface IVerificationCode extends Document {
    email: string;
    code: string;
    expiresAt: Date;
    createdAt: Date;
}

const VerificationCodeSchema = new Schema<IVerificationCode>(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true
        },
        code: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true // Index for efficient TTL cleanup
        }
    },
    {
        timestamps: true
    }
);

// Automatically delete expired codes (MongoDB TTL index)
VerificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Clean up old codes before creating new one for the same email
VerificationCodeSchema.pre('save', async function (next) {
    if (this.isNew) {
        await mongoose.model('VerificationCode').deleteMany({ email: this.email });
    }
    next();
});

const VerificationCode = mongoose.model<IVerificationCode>('VerificationCode', VerificationCodeSchema);

export default VerificationCode;
