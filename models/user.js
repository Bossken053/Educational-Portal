
const mongoose = require("mongoose");

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

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        password: {
            type: String,
            required: true,
            select: false
        },

        role: {
            type: String,
            enum: ["admin", "student", "tutor"],
            default: "student",
            required: true
        },

        passport: {
            type: String,
            default: ""
        },

        subject: {
            type: String,
            trim: true,
            default: ""
        },

        // One course per student.
        // Registration controller will require a valid course for students.
        selectedCourse: {
            type: String,
            enum: [...COURSE_OPTIONS, ""],
            default: ""
        },

        // Exam preparation is optional.
        selectedExam: {
            type: String,
            enum: [...EXAM_OPTIONS, ""],
            default: ""
        },

        isVerified: {
            type: Boolean,
            default: false
        },

        emailVerifyToken: {
            type: String,
            default: undefined,
            select: false
        },

        emailVerifyExpire: {
            type: Date,
            default: undefined,
            select: false
        },

        passwordResetToken: {
            type: String,
            default: undefined,
            select: false
        },

        passwordResetExpire: {
            type: Date,
            default: undefined,
            select: false
        },

        isApproved: {
            type: Boolean,
            default: false
        },

        failedLoginAttempts: {
            type: Number,
            default: 0,
            select: false
        },

        lockUntil: {
            type: Date,
            default: undefined,
            select: false
        },

        passwordChangedAt: {
            type: Date,
            default: undefined,
            select: false
        },

        isRejected: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);
