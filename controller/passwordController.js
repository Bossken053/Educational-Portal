
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const transporter = require("../config/mailer");

const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER;
const CLIENT_URL = (process.env.CLIENT_URL || "http://localhost:5000").replace(/\/+$/, "");

const RESET_TOKEN_EXPIRY_MINUTES = 15;
const SALT_ROUNDS = 12;

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

function createResetToken() {
    const token = crypto.randomBytes(32).toString("hex");

    return {
        token,
        tokenHash: hashToken(token),
        expiresAt: new Date(
            Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000
        )
    };
}

function isValidPassword(password) {
    return (
        typeof password === "string" &&
        password.length >= 8 &&
        password.length <= 128
    );
}

function getUserId(req) {
    return req.user?.id || req.user?._id;
}

async function sendResetEmail(user, token) {
    const resetLink =
        `${CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;

    await transporter.sendMail({
        from: EMAIL_FROM,
        to: user.email,
        subject: "Reset Your FHOBS SOLUTIONS Password",
        text: [
            `Hello ${user.fullName},`,
            "",
            "We received a request to reset your FHOBS SOLUTIONS password.",
            "",
            `Open this link to choose a new password: ${resetLink}`,
            "",
            `This link expires in ${RESET_TOKEN_EXPIRY_MINUTES} minutes.`,
            "If you did not request this, you can ignore this email."
        ].join("\n"),
        html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;line-height:1.6;color:#222">
                <h2 style="color:#1455a0">FHOBS SOLUTIONS</h2>
                <p>Hello ${escapeHtml(user.fullName)},</p>
                <p>We received a request to reset your password.</p>
                <p>
                    <a href="${resetLink}"
                       style="display:inline-block;background:#1455a0;color:#fff;padding:12px 20px;text-decoration:none;border-radius:5px">
                        Reset Password
                    </a>
                </p>
                <p>If the button does not work, copy this link into your browser:</p>
                <p style="overflow-wrap:anywhere">${resetLink}</p>
                <p>This link expires in ${RESET_TOKEN_EXPIRY_MINUTES} minutes.</p>
                <p>If you did not request a password reset, you can ignore this email.</p>
            </div>
        `
    });
}

function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}

/*
 * POST /api/password/forgot
 * Public: request a password reset email.
 */
exports.forgotPassword = async (req, res) => {
    try {
        const email =
            typeof req.body.email === "string"
                ? req.body.email.trim().toLowerCase()
                : "";

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Please enter your email address."
            });
        }

        const user = await User.findOne({ email });

        // Do not reveal whether an account exists.
        const genericMessage =
            "If an account exists for that email, password reset instructions will be sent.";

        if (!user) {
            return res.status(200).json({
                success: true,
                message: genericMessage
            });
        }

        const reset = createResetToken();

        user.passwordResetToken = reset.tokenHash;
        user.passwordResetExpire = reset.expiresAt;

        await user.save();

        try {
            await sendResetEmail(user, reset.token);
        } catch (emailError) {
            // Remove this token if sending the email fails.
            user.passwordResetToken = undefined;
            user.passwordResetExpire = undefined;
            await user.save();

            console.error("Password reset email failed:", emailError.message);

            return res.status(500).json({
                success: false,
                message: "Unable to send the reset email right now. Please try again later."
            });
        }

        return res.status(200).json({
            success: true,
            message: genericMessage
        });
    } catch (error) {
        console.error("Forgot password error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Something went wrong. Please try again later."
        });
    }
};

/*
 * POST /api/password/reset
 * Public: reset a password using the emailed token.
 * Expected body: { token, newPassword, confirmPassword }
 */
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword, confirmPassword } = req.body;

        if (
            typeof token !== "string" ||
            !/^[a-f0-9]{64}$/i.test(token)
        ) {
            return res.status(400).json({
                success: false,
                message: "The reset link is invalid or has expired."
            });
        }

        if (!isValidPassword(newPassword)) {
            return res.status(400).json({
                success: false,
                message: "Your new password must be between 8 and 128 characters."
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "The passwords do not match."
            });
        }

        const user = await User.findOne({
            passwordResetToken: hashToken(token),
            passwordResetExpire: { $gt: new Date() }
        }).select("+passwordResetToken +passwordResetExpire +password");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "The reset link is invalid or has expired."
            });
        }

        user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
        user.passwordResetToken = undefined;
        user.passwordResetExpire = undefined;
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        user.passwordChangedAt = new Date();

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password reset successful. You can now log in with your new password."
        });
    } catch (error) {
        console.error("Reset password error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to reset your password right now."
        });
    }
};

/*
 * POST /api/password/change
 * Protected: a logged-in user changes their own password.
 * Expected body: { currentPassword, newPassword, confirmPassword }
 */
exports.changePassword = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Please log in again."
            });
        }

        if (
            typeof currentPassword !== "string" ||
            !currentPassword ||
            typeof newPassword !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter your current password and new password."
            });
        }

        if (!isValidPassword(newPassword)) {
            return res.status(400).json({
                success: false,
                message: "Your new password must be between 8 and 128 characters."
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "The passwords do not match."
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({
                success: false,
                message: "Your new password must be different from your current password."
            });
        }

        const user = await User.findById(userId).select("+password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Account not found."
            });
        }

        const passwordMatches = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!passwordMatches) {
            return res.status(400).json({
                success: false,
                message: "Your current password is incorrect."
            });
        }

        user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
        user.passwordResetToken = undefined;
        user.passwordResetExpire = undefined;
        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        user.passwordChangedAt = new Date();

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Your password has been changed successfully."
        });
    } catch (error) {
        console.error("Change password error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to change your password right now."
        });
    }
};

/*
 * POST /api/password/admin-reset/:userId
 * Admin only: email a reset link to a selected account.
 */
exports.adminResetPassword = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!/^[a-f0-9]{24}$/i.test(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const reset = createResetToken();

        user.passwordResetToken = reset.tokenHash;
        user.passwordResetExpire = reset.expiresAt;

        await user.save();

        try {
            await sendResetEmail(user, reset.token);
        } catch (emailError) {
            user.passwordResetToken = undefined;
            user.passwordResetExpire = undefined;
            await user.save();

            console.error("Admin password reset email failed:", emailError.message);

            return res.status(500).json({
                success: false,
                message: "Unable to send the reset email. Please try again later."
            });
        }

        return res.status(200).json({
            success: true,
            message: "A password reset link has been sent to the user's registered email address."
        });
    } catch (error) {
        console.error("Admin reset password error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to initiate the password reset."
        });
    }
};
