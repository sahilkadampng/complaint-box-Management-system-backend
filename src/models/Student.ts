import mongoose, { Schema, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";

export interface IStudent extends Document {
    _id: Types.ObjectId;
    name: string;
    username: string;
    email: string;
    password: string;
    role: "student";
    profilePicture?: string;
    department?: string;
    section?: string;
    phoneNumber?: string;
    program?: string;
    yearOfStudy?: string;
    studentId?: string;
    rollNumber?: string;
    emailAlerts?: boolean;
    systemMessages?: boolean;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const StudentSchema = new Schema<IStudent>(
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
            enum: ["student"],
            default: "student",
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
            unique: true,
            sparse: true,
        },
        program: {
            type: String,
            default: "",
        },
        yearOfStudy: {
            type: String,
            default: "",
        },
        studentId: {
            type: String,
            default: "",
            unique: true,
            sparse: true,
        },
        rollNumber: {
            type: String,
            default: "",
            unique: true,
            sparse: true,
        },
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
StudentSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare password
StudentSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IStudent>("Student", StudentSchema);
