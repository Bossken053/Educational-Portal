const User = require("../models/user");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const transporter = require("../config/mailer");

const COURSE_OPTIONS = [
    "Computer Basics & Office Skills",
    "Graphic Design & Digital Marketing",
    "Web & Software Development",
    "Networking, Cybersecurity & IT Support",
    "Data Analytics & Business",
    "Kids & Teens Tech",
    "Healthcare Assistant Training"
];

const EXAM_OPTIONS = [
    "IELTS Preparation",
    "TOEFL iBT Preparation",
    "PTE Academic Preparation",
    "GRE Preparation",
    "GMAT Preparation",
    "SAT Preparation"
];

const createVerificationEmail = (user, token) => {
    const link =
        `${process.env.CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;

    const safeName = String(user.fullName)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    return {
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Verify your FHOBS SOLUTIONS account",
        text: `Hello ${user.fullName},

Verify your email using this link:

${link}

This link expires in 15 minutes.`,
        html: `
            <div style="font-family:Arial,sans-serif;line-height:1.6">
                <h2>Welcome to FHOBS SOLUTIONS</h2>
                <p>Hello ${safeName},</p>
                <p>Please verify your email address.</p>
                <p>
                    <a href="${link}"
                       style="display:inline-block;padding:12px 20px;
                       background:#123b70;color:white;text-decoration:none;
                       border-radius:5px">
                       Verify Email Address
                    </a>
                </p>
                <p>This link expires in 15 minutes.</p>
                <p>If the button does not work, open this link:</p>
                <p>${link}</p>
            </div>
        `
    };
};

// -----------------------------
// STUDENT REGISTRATION
// -----------------------------
const registerStudent = async (req, res) => {
    return registerUser(req, res, "student");
};

// -----------------------------
// TUTOR REGISTRATION
// -----------------------------
const registerTutor = async (req, res) => {
    return registerUser(req, res, "tutor");
};

// -----------------------------
// SHARED REGISTRATION FUNCTION
// -----------------------------
async function registerUser(req, res, role) {
    try {
        const {
            fullName,
            email,
            phone,
            password,
            confirmPassword,
            subject,
            selectedCourse,
            selectedExam
        } = req.body;

        if (
            !fullName ||
            !email ||
            !phone ||
            !password ||
            !confirmPassword
        ) {
            return res.status(400).json({
                success: false,
                message: "Please complete all required fields."
            });
        }

        if (
            typeof fullName !== "string" ||
            typeof email !== "string" ||
            typeof phone !== "string" ||
            typeof password !== "string" ||
            typeof confirmPassword !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid registration data."
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters."
            });
        }

        // Tutors must provide their subject or area of expertise.
        if (
            role === "tutor" &&
            (typeof subject !== "string" || !subject.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide your subject or area of expertise."
            });
        }

        // Students must choose exactly one valid course.
        if (role === "student") {
            if (
                typeof selectedCourse !== "string" ||
                !COURSE_OPTIONS.includes(selectedCourse.trim())
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please select one valid course."
                });
            }

            // Exam selection is optional, but must be valid if supplied.
            if (
                selectedExam !== undefined &&
                selectedExam !== "" &&
                (
                    typeof selectedExam !== "string" ||
                    !EXAM_OPTIONS.includes(selectedExam.trim())
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a valid exam preparation programme."
                });
            }
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please upload your passport photograph."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const rawToken = crypto.randomBytes(32).toString("hex");

        const hashedToken = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        const user = new User({
            fullName: fullName.trim(),
            email: normalizedEmail,
            phone: phone.trim(),
            password: hashedPassword,

            // The server assigns the role.
            role,

            passport: req.file.filename,
            subject: role === "tutor" ? subject.trim() : "",

            // Save student programme selections.
            // Tutors do not register through the student course form.
            selectedCourse:
                role === "student" ? selectedCourse.trim() : "",

            selectedExam:
                role === "student" && selectedExam
                    ? selectedExam.trim()
                    : "",

            isVerified: false,
            isApproved: role === "student",

            emailVerifyToken: hashedToken,
            emailVerifyExpire: new Date(
                Date.now() + 15 * 60 * 1000
            )
        });

        await user.save();

        try {
            await transporter.sendMail(
                createVerificationEmail(user, rawToken)
            );
        } catch (emailError) {
            console.error(
                "Verification email failed:",
                emailError.message
            );

            return res.status(201).json({
                success: true,
                emailSent: false,
                message:
                    "Your account was created, but the verification email could not be sent. Request a new verification link."
            });
        }

        return res.status(201).json({
            success: true,
            emailSent: true,
            message:
                "Registration successful. Check your email for the verification link."
        });
    } catch (error) {
        console.error("Registration error:", error.message);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: "Some registration details are invalid."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Registration failed. Please try again."
        });
    }
}

// -----------------------------
// VERIFY EMAIL
// -----------------------------
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;

        if (!token || typeof token !== "string") {
            return res.status(400).json({
                success: false,
                message: "Verification token is missing."
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await User.findOne({
            emailVerifyToken: hashedToken,
            emailVerifyExpire: { $gt: new Date() }
        }).select("+emailVerifyToken +emailVerifyExpire");

        if (!user) {
            return res.status(400).json({
                success: false,
                message:
                    "This verification link is invalid or expired. Request a new link."
            });
        }

        user.isVerified = true;
        user.emailVerifyToken = undefined;
        user.emailVerifyExpire = undefined;

        await user.save();

        return res.status(200).json({
            success: true,
            message:
                user.role === "tutor" && !user.isApproved
                    ? "Email verified successfully. Your tutor account is waiting for admin approval."
                    : "Email verified successfully. You can now log in."
        });
    } catch (error) {
        console.error("Email verification error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Email verification failed. Please try again."
        });
    }
};

// -----------------------------
// RESEND VERIFICATION EMAIL
// -----------------------------
const resendVerification = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== "string") {
            return res.status(400).json({
                success: false,
                message: "Please enter your email address."
            });
        }

        const genericResponse = {
            success: true,
            message:
                "If your account exists and needs verification, a new link will be sent."
        };

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user || user.isVerified) {
            return res.status(200).json(genericResponse);
        }

        const rawToken = crypto.randomBytes(32).toString("hex");

        user.emailVerifyToken = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        user.emailVerifyExpire = new Date(
            Date.now() + 15 * 60 * 1000
        );

        await user.save();

        try {
            await transporter.sendMail(
                createVerificationEmail(user, rawToken)
            );
        } catch (emailError) {
            console.error(
                "Resend verification email failed:",
                emailError.message
            );

            return res.status(503).json({
                success: false,
                message:
                    "The email service is temporarily unavailable. Please try again later."
            });
        }

        return res.status(200).json(genericResponse);
    } catch (error) {
        console.error("Resend verification error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to process your request right now."
        });
    }
};

// -----------------------------
// LOGIN
// -----------------------------
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        }).select("+password +failedLoginAttempts +lockUntil");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        if (user.lockUntil && user.lockUntil > new Date()) {
            return res.status(423).json({
                success: false,
                message:
                    "Your account is temporarily locked. Please try again later."
            });
        }

        // Clear an expired lock.
        if (user.lockUntil && user.lockUntil <= new Date()) {
            user.failedLoginAttempts = 0;
            user.lockUntil = undefined;
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatches) {
            user.failedLoginAttempts =
                (user.failedLoginAttempts || 0) + 1;

            if (user.failedLoginAttempts >= 5) {
                user.lockUntil = new Date(
                    Date.now() + 15 * 60 * 1000
                );
            }

            await user.save();

            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        if (!user.isVerified) {
            return res.status(403).json({
                success: false,
                code: "EMAIL_NOT_VERIFIED",
                message:
                    "Please verify your email before logging in."
            });
        }

        if (user.role === "tutor" && !user.isApproved) {
            return res.status(403).json({
                success: false,
                code: "TUTOR_PENDING_APPROVAL",
                message:
                    "Your email is verified, but your tutor account is awaiting admin approval."
            });
        }

        if (user.role === "admin" && !user.isApproved) {
            return res.status(403).json({
                success: false,
                message: "This administrator account is not approved."
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is missing from .env");
        }

        user.failedLoginAttempts = 0;
        user.lockUntil = undefined;
        await user.save();

        const token = jwt.sign(
            {
                id: user._id.toString(),
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        res.cookie("fhobs_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 1000,
            path: "/"
        });

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Login failed. Please try again."
        });
    }
};

// -----------------------------
// LOGOUT
// -----------------------------
const logout = (req, res) => {
    res.clearCookie("fhobs_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/"
    });

    return res.status(200).json({
        success: true,
        message: "You have logged out successfully."
    });
};

module.exports = {
    registerStudent,
    registerTutor,
    verifyEmail,
    resendVerification,
    login,
    logout
};
