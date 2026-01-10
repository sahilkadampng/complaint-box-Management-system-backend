import { Response } from "express";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth.js";

export const changePassword = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?._id;
        const { currentPassword, newPassword } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const user = await User.findById(userId).select("+password");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const isMatch = await user.comparePassword(currentPassword);

        if (!isMatch) {
            return res.status(401).json({
                error: "Current password is incorrect"
            });
        }

        // pre-save hook will hash it
        user.password = newPassword;
        await user.save();

        return res.status(200).json({
            message: "Password changed successfully"
        });

    } catch (error) {
        return res.status(500).json({ error: "Something went wrong" });
    }
};

