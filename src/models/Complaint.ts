import mongoose, { Schema, Document } from 'mongoose';

export type ComplaintStatus =
    | 'submitted'
    | 'in_review'
    | 'assigned'
    | 'need_clarification'
    | 'resolved'
    | 'escalated';

export interface IComplaintHistory {
    status: ComplaintStatus;
    date: Date;
    updatedBy?: string;
    note?: string;
}

export interface IComplaint extends Document {
    title: string;
    description: string;
    category: string;
    studentId: mongoose.Types.ObjectId;
    studentName: string;
    studentUsername: string;
    status: ComplaintStatus;
    history: IComplaintHistory[];
    attachment?: string;
    department?: string;
    yearOfStudy?: string;
    assignedTo?: mongoose.Types.ObjectId;
    clarificationMessage?: string;
    isRead: boolean;
    readBy: string[];
    createdAt: Date;
    updatedAt: Date;
}

const ComplaintHistorySchema = new Schema<IComplaintHistory>(
    {
        status: {
            type: String,
            enum: ['submitted', 'in_review', 'need_clarification', 'assigned', 'resolved', 'escalated'],
            required: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        updatedBy: {
            type: String,
            default: '',
        },
        note: {
            type: String,
            default: '',
        },
    },
    { _id: false }
);

const ComplaintSchema = new Schema<IComplaint>(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
        },
        studentId: {
            type: Schema.Types.ObjectId,
            ref: 'Student',
            required: true,
        },
        studentName: {
            type: String,
            required: true,
        },
        studentUsername: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ['submitted', 'in_review', 'need_clarification', 'assigned', 'resolved', 'escalated'],
            default: 'submitted',
        },
        history: {
            type: [ComplaintHistorySchema],
            default: [],
        },
        attachment: {
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
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: 'Faculty',
            default: null,
        },
        clarificationMessage: {
            type: String,
            default: '',
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        readBy: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

// Add initial history entry before saving
ComplaintSchema.pre('save', function (next) {
    if (this.isNew && this.history.length === 0) {
        this.history.push({
            status: this.status,
            date: new Date(),
        });
    }
    next();
});

// Indexes for better query performance
ComplaintSchema.index({ studentId: 1, createdAt: -1 });
ComplaintSchema.index({ status: 1 });
ComplaintSchema.index({ category: 1 });
ComplaintSchema.index({ assignedTo: 1 });

export default mongoose.model<IComplaint>('Complaint', ComplaintSchema);

