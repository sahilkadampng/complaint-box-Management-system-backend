import mongoose, { Schema, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";

export interface IFaculty extends Document {
    _id: Types.ObjectId;
    name: string;
    username: string;
    email: string;
    password: string;
    role: "faculty";
    profilePicture?: string;
    department?: string;
    section?: string;
    phoneNumber?: string;
    program?: string;
    emailAlerts?: boolean;
    systemMessages?: boolean;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const FacultySchema = new Schema<IFaculty>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        username: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            unique: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        role: {
            type: String,
            enum: ["faculty"],
            default: "faculty",
            immutable: true,
        },
        profilePicture: {
            type: String,
            default: "",
        },
        department: {
            type: String,
            default: "",
        },
        section: {
            type: String,
            default: "",
        },
        phoneNumber: {
            type: String,
            default: "",
        },
        program: {
            type: String,
            default: "",
        },
        // Notification preferences (same as students)
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
            default: "system",
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
FacultySchema.pre("save", async function (next) {
    const doc = this as any;
    if (!doc.isModified("password")) return next();

    const salt = await bcrypt.genSalt(10);
    doc.password = await bcrypt.hash(doc.password, salt);
    next();
});

// Compare password
FacultySchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    const doc = this as any;
    return bcrypt.compare(candidatePassword, doc.password);
};

export default mongoose.model<IFaculty>("Faculty", FacultySchema);
