
const express = require("express");
const router = express.Router();

const {
    registerStudent,
    registerTutor,
    verifyEmail,
    resendVerification,
    login,
    logout
} = require("../controller/authController");

const upload = require("../middleware/uploadMiddleware");
const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

// Public student registration
router.post(
    "/register/student",
    upload.single("passport"),
    registerStudent
);

// Only authenticated administrators can create tutor accounts
router.post(
    "/register/tutor",
    protect,
    authorizeRoles("admin"),
    upload.single("passport"),
    registerTutor
);

// Email verification
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", resendVerification);

// Login and logout
router.post("/login", login);
router.post("/logout", logout);

module.exports = router;
