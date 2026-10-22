
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
    getAllTutors,
    getPendingTutors,
    getTutorStudents,
    approveTutor,
    rejectTutor,
    reactivateTutor,
    updateTutorById
} = require("../controller/tutorController");

// All tutor routes require login.
router.use(protect);

// Tutors can view their own matched students.
router.get("/my-students", authorizeRoles("tutor"), getTutorStudents);

// All routes below this point require an administrator.
router.use(authorizeRoles("admin"));

router.get("/", getAllTutors);
router.get("/pending", getPendingTutors);

// Edit tutor information.
router.patch("/:tutorId", updateTutorById);

// Existing tutor management actions.
router.patch("/:tutorId/approve", approveTutor);
router.patch("/:tutorId/reject", rejectTutor);
router.patch("/:tutorId/reactivate", reactivateTutor);

module.exports = router;
