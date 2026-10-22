
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const User = require("../models/user");

const PRIVATE_UPLOADS_DIR = path.resolve(__dirname, "../private-uploads");

const SAFE_USER_FIELDS =
    "-password " +
    "-emailVerifyToken " +
    "-emailVerifyExpire " +
    "-passwordResetToken " +
    "-passwordResetExpire " +
    "-passwordResetTokenHash " +
    "-passwordResetExpires " +
    "-failedLoginAttempts " +
    "-lockUntil " +
    "-passwordChangedAt " +
    "-__v";

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

function cleanText(value) {
    return typeof value === "string" ? value.trim() : "";
}

function validateCommonProfile(body) {
    const updates = {};

    if (Object.prototype.hasOwnProperty.call(body, "fullName")) {
        const fullName = cleanText(body.fullName);

        if (fullName.length < 2 || fullName.length > 100) {
            return { error: "Name must be between 2 and 100 characters." };
        }

        updates.fullName = fullName;
    }

    if (Object.prototype.hasOwnProperty.call(body, "phone")) {
        const phone = cleanText(body.phone);

        if (phone.length < 7 || phone.length > 30) {
            return { error: "Enter a valid phone number." };
        }

        updates.phone = phone;
    }

    if (Object.prototype.hasOwnProperty.call(body, "email")) {
        const email = cleanText(body.email).toLowerCase();

        if (
            email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
            return { error: "Enter a valid email address." };
        }

        updates.email = email;
    }

    return { updates };
}

async function applyProfileUpdates(user, updates) {
    if (Object.prototype.hasOwnProperty.call(updates, "email")) {
        const emailTaken = await User.exists({
            email: updates.email,
            _id: { $ne: user._id }
        });

        if (emailTaken) {
            return "That email address is already registered.";
        }

        if (updates.email !== user.email) {
            user.email = updates.email;
            user.isVerified = false;

            // Remove any old verification token. The user must request
            // a new verification email through the existing auth flow.
            user.emailVerifyToken = undefined;
            user.emailVerifyExpire = undefined;
        }
    }

    if (Object.prototype.hasOwnProperty.call(updates, "fullName")) {
        user.fullName = updates.fullName;
    }

    if (Object.prototype.hasOwnProperty.call(updates, "phone")) {
        user.phone = updates.phone;
    }

    return null;
}

// GET ALL USERS — ADMIN ONLY THROUGH ROUTE MIDDLEWARE
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select(SAFE_USER_FIELDS)
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            message: "Users retrieved successfully.",
            count: users.length,
            users
        });
    } catch (error) {
        console.error("Get all users error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve users."
        });
    }
};

// GET ONE USER — ADMIN ONLY THROUGH ROUTE MIDDLEWARE
const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        const user = await User.findById(userId)
            .select(SAFE_USER_FIELDS)
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "User retrieved successfully.",
            user
        });
    } catch (error) {
        console.error("Get user by ID error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve user."
        });
    }
};

// GET THE LOGGED-IN USER'S PROFILE
const getMyProfile = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;

        if (!userId || !mongoose.isValidObjectId(userId)) {
            return res.status(401).json({
                success: false,
                message: "Please log in to view your profile."
            });
        }

        const user = await User.findById(userId)
            .select(SAFE_USER_FIELDS)
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Your account could not be found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile retrieved successfully.",
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                passport: user.passport || "",
                subject: user.subject || "",
                selectedCourse: user.selectedCourse || "",
                selectedExam: user.selectedExam || "",
                isVerified: user.isVerified,
                isApproved: user.isApproved,
                isRejected: user.isRejected,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
            }
        });
    } catch (error) {
        console.error("Get my profile error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve your profile."
        });
    }
};

// UPDATE THE LOGGED-IN USER'S OWN PROFILE
const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;

        if (!userId || !mongoose.isValidObjectId(userId)) {
            return res.status(401).json({
                success: false,
                message: "Please log in again."
            });
        }

        const validation = validateCommonProfile(req.body || {});

        if (validation.error) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        if (Object.keys(validation.updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Provide at least one permitted profile field to update."
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Account not found."
            });
        }

        const updateError = await applyProfileUpdates(
            user,
            validation.updates
        );

        if (updateError) {
            return res.status(409).json({
                success: false,
                message: updateError
            });
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: user.isVerified
                ? "Your profile was updated successfully."
                : "Profile updated. If you changed your email, verify the new address before logging in where verification is required.",
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                isVerified: user.isVerified
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "That email address is already registered."
            });
        }

        console.error("Update my profile error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to update your profile."
        });
    }
};

// ADMIN: UPDATE PERMITTED DETAILS OF A STUDENT, TUTOR OR ADMIN
const updateUserById = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID."
            });
        }

        const body = req.body || {};
        const validation = validateCommonProfile(body);

        if (validation.error) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const updates = validation.updates;

        if (user.role === "student") {
            if (Object.prototype.hasOwnProperty.call(body, "selectedCourse")) {
                if (!COURSE_OPTIONS.includes(body.selectedCourse)) {
                    return res.status(400).json({
                        success: false,
                        message: "Choose a valid course."
                    });
                }

                updates.selectedCourse = body.selectedCourse;
            }

            if (Object.prototype.hasOwnProperty.call(body, "selectedExam")) {
                if (
                    body.selectedExam !== "" &&
                    !EXAM_OPTIONS.includes(body.selectedExam)
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Choose a valid exam or leave it empty."
                    });
                }

                updates.selectedExam = body.selectedExam;
            }
        }

        if (user.role === "tutor") {
            if (Object.prototype.hasOwnProperty.call(body, "subject")) {
                const subject = cleanText(body.subject);

                if (subject.length > 120) {
                    return res.status(400).json({
                        success: false,
                        message: "Tutor subject cannot exceed 120 characters."
                    });
                }

                updates.subject = subject;
            }
        }

        const permittedFields = [
            "fullName",
            "email",
            "phone",
            "selectedCourse",
            "selectedExam",
            "subject"
        ];

        const submittedPermittedField = permittedFields.some(field =>
            Object.prototype.hasOwnProperty.call(body, field)
        );

        if (!submittedPermittedField) {
            return res.status(400).json({
                success: false,
                message: "No permitted profile fields were provided."
            });
        }

        const updateError = await applyProfileUpdates(user, updates);

        if (updateError) {
            return res.status(409).json({
                success: false,
                message: updateError
            });
        }

        if (Object.prototype.hasOwnProperty.call(updates, "selectedCourse")) {
            user.selectedCourse = updates.selectedCourse;
        }

        if (Object.prototype.hasOwnProperty.call(updates, "selectedExam")) {
            user.selectedExam = updates.selectedExam;
        }

        if (Object.prototype.hasOwnProperty.call(updates, "subject")) {
            user.subject = updates.subject;
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Account details updated successfully.",
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                subject: user.subject || "",
                selectedCourse: user.selectedCourse || "",
                selectedExam: user.selectedExam || "",
                isVerified: user.isVerified,
                isApproved: user.isApproved,
                isRejected: user.isRejected
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "That email address is already registered."
            });
        }

        console.error("Admin update user error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to update account details."
        });
    }
};

// GET THE LOGGED-IN USER'S OWN PASSPORT PHOTOGRAPH
const getMyPassport = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?._id;

        if (!userId || !mongoose.isValidObjectId(userId)) {
            return res.status(401).json({
                success: false,
                message: "Please log in to view your passport photograph."
            });
        }

        const user = await User.findById(userId)
            .select("passport")
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Your account could not be found."
            });
        }

        if (!user.passport || typeof user.passport !== "string") {
            return res.status(404).json({
                success: false,
                message: "No passport photograph is registered for this account."
            });
        }

        const filename = user.passport;
        const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
        const extension = path.extname(filename).toLowerCase();

        if (
            path.basename(filename) !== filename ||
            !allowedExtensions.includes(extension)
        ) {
            return res.status(400).json({
                success: false,
                message: "The stored passport filename is invalid."
            });
        }

        const filePath = path.join(PRIVATE_UPLOADS_DIR, filename);
        const fileInfo = await fs.promises.stat(filePath);

        if (!fileInfo.isFile()) {
            return res.status(404).json({
                success: false,
                message: "Passport image file was not found."
            });
        }

        const contentTypes = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp"
        };

        res.setHeader("Content-Type", contentTypes[extension]);
        res.setHeader("Cache-Control", "private, no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");

        const imageStream = fs.createReadStream(filePath);

        imageStream.on("error", error => {
            console.error("Passport image stream error:", error.message);

            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: "Unable to load your passport photograph."
                });
            } else {
                res.destroy(error);
            }
        });

        imageStream.pipe(res);
    } catch (error) {
        if (error.code === "ENOENT") {
            return res.status(404).json({
                success: false,
                message: "Passport image file was not found."
            });
        }

        console.error("Get passport error:", error.message);

        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: "Unable to load your passport photograph."
            });
        }
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    getMyProfile,
    getMyPassport,
    updateMyProfile,
    updateUserById
};
