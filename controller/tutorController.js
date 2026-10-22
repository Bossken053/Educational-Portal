
const mongoose = require("mongoose");
const User = require("../models/user");

const SAFE_TUTOR_FIELDS =
    "-password -emailVerifyToken -emailVerifyExpire " +
    "-passwordResetToken -passwordResetExpire " +
    "-failedLoginAttempts -lockUntil -passwordChangedAt -__v";

const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET ALL TUTORS
const getAllTutors = async (req, res) => {
    try {
        const tutors = await User.find({ role: "tutor" })
            .select(SAFE_TUTOR_FIELDS)
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: tutors.length,
            tutors
        });
    } catch (error) {
        console.error("Get all tutors error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve tutors."
        });
    }
};

// GET PENDING TUTORS
const getPendingTutors = async (req, res) => {
    try {
        const tutors = await User.find({
            role: "tutor",
            isApproved: { $ne: true },
            isRejected: { $ne: true }
        })
            .select(SAFE_TUTOR_FIELDS)
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: tutors.length,
            tutors
        });
    } catch (error) {
        console.error("Get pending tutors error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve pending tutors."
        });
    }
};

// GET STUDENTS MATCHED TO THE LOGGED-IN TUTOR'S SUBJECT
const getTutorStudents = async (req, res) => {
    try {
        const tutorId = req.user?.id;

        if (!tutorId || !mongoose.isValidObjectId(tutorId)) {
            return res.status(401).json({
                success: false,
                message: "Please log in again."
            });
        }

        const tutor = await User.findOne({
            _id: tutorId,
            role: "tutor"
        }).select("subject");

        if (!tutor) {
            return res.status(404).json({
                success: false,
                message: "Tutor account not found."
            });
        }

        if (!tutor.subject || !tutor.subject.trim()) {
            return res.status(200).json({
                success: true,
                count: 0,
                students: [],
                message: "No subject is assigned to your tutor account yet."
            });
        }

        const coursePattern = new RegExp(
            "^\\s*" + escapeRegex(tutor.subject.trim()) + "\\s*$",
            "i"
        );

        const students = await User.find({
            role: "student",
            selectedCourse: coursePattern
        })
            .select(
                "fullName email phone selectedCourse selectedExam " +
                "passport isVerified createdAt"
            )
            .sort({ fullName: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: students.length,
            students
        });
    } catch (error) {
        console.error("Get tutor students error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve your students."
        });
    }
};

// APPROVE TUTOR
const approveTutor = async (req, res) => {
    try {
        const { tutorId } = req.params;

        if (!mongoose.isValidObjectId(tutorId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid tutor ID."
            });
        }

        const tutor = await User.findOne({
            _id: tutorId,
            role: "tutor"
        });

        if (!tutor) {
            return res.status(404).json({
                success: false,
                message: "Tutor not found."
            });
        }

        if (!tutor.isVerified) {
            return res.status(400).json({
                success: false,
                message: "The tutor must verify their email before approval."
            });
        }

        if (tutor.isRejected) {
            return res.status(400).json({
                success: false,
                message: "Reactivate this tutor before approving them."
            });
        }

        if (tutor.isApproved) {
            return res.status(400).json({
                success: false,
                message: "This tutor is already approved."
            });
        }

        tutor.isApproved = true;
        await tutor.save();

        return res.status(200).json({
            success: true,
            message: "Tutor approved successfully."
        });
    } catch (error) {
        console.error("Approve tutor error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to approve tutor."
        });
    }
};

// REJECT TUTOR
const rejectTutor = async (req, res) => {
    try {
        const { tutorId } = req.params;

        if (!mongoose.isValidObjectId(tutorId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid tutor ID."
            });
        }

        const tutor = await User.findOne({
            _id: tutorId,
            role: "tutor"
        });

        if (!tutor) {
            return res.status(404).json({
                success: false,
                message: "Tutor not found."
            });
        }

        tutor.isApproved = false;
        tutor.isRejected = true;
        await tutor.save();

        return res.status(200).json({
            success: true,
            message: "Tutor rejected successfully."
        });
    } catch (error) {
        console.error("Reject tutor error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to reject tutor."
        });
    }
};

// REACTIVATE TUTOR
const reactivateTutor = async (req, res) => {
    try {
        const { tutorId } = req.params;

        if (!mongoose.isValidObjectId(tutorId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid tutor ID."
            });
        }

        const tutor = await User.findOne({
            _id: tutorId,
            role: "tutor"
        });

        if (!tutor) {
            return res.status(404).json({
                success: false,
                message: "Tutor not found."
            });
        }

        tutor.isRejected = false;
        tutor.isApproved = false;
        await tutor.save();

        return res.status(200).json({
            success: true,
            message: "Tutor reactivated successfully."
        });
    } catch (error) {
        console.error("Reactivate tutor error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to reactivate tutor."
        });
    }
};

// UPDATE TUTOR DETAILS — ADMIN ONLY THROUGH THE ROUTE
const updateTutorById = async (req, res) => {
    try {
        const { tutorId } = req.params;

        if (!mongoose.isValidObjectId(tutorId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid tutor ID."
            });
        }

        const tutor = await User.findOne({
            _id: tutorId,
            role: "tutor"
        });

        if (!tutor) {
            return res.status(404).json({
                success: false,
                message: "Tutor not found."
            });
        }

        const allowedFields = ["fullName", "email", "phone", "subject"];
        const suppliedFields = allowedFields.filter((field) =>
            Object.prototype.hasOwnProperty.call(req.body, field)
        );

        if (suppliedFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Provide at least one editable tutor field."
            });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "fullName")) {
            if (typeof req.body.fullName !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Full name must be text."
                });
            }

            const fullName = req.body.fullName.trim();

            if (fullName.length < 2 || fullName.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Full name must contain 2 to 100 characters."
                });
            }

            tutor.fullName = fullName;
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "email")) {
            if (typeof req.body.email !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "A valid email address is required."
                });
            }

            const email = req.body.email.trim().toLowerCase();
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailPattern.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: "Enter a valid email address."
                });
            }

            if (email !== tutor.email) {
                const existingUser = await User.findOne({
                    email,
                    _id: { $ne: tutor._id }
                }).select("_id");

                if (existingUser) {
                    return res.status(409).json({
                        success: false,
                        message: "That email address is already in use."
                    });
                }

                tutor.email = email;
                tutor.isVerified = false;
            }
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "phone")) {
            if (typeof req.body.phone !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Phone number must be text."
                });
            }

            const phone = req.body.phone.trim();

            if (!phone || phone.length > 30) {
                return res.status(400).json({
                    success: false,
                    message: "Phone number must contain 1 to 30 characters."
                });
            }

            tutor.phone = phone;
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "subject")) {
            if (typeof req.body.subject !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Subject must be text."
                });
            }

            const subject = req.body.subject.trim();

            if (subject.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Subject cannot exceed 100 characters."
                });
            }

            tutor.subject = subject;
        }

        await tutor.save();

        const safeTutor = await User.findById(tutor._id)
            .select(SAFE_TUTOR_FIELDS)
            .lean();

        return res.status(200).json({
            success: true,
            message: tutor.isVerified
                ? "Tutor details updated successfully."
                : "Tutor details updated. The changed email must be verified again.",
            tutor: safeTutor
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "That email address is already in use."
            });
        }

        if (error.name === "ValidationError") {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        console.error("Update tutor error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update tutor details."
        });
    }
};

module.exports = {
    getAllTutors,
    getPendingTutors,
    getTutorStudents,
    approveTutor,
    rejectTutor,
    reactivateTutor,
    updateTutorById
};
