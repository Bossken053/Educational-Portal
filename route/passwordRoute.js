
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
    forgotPassword,
    changePassword,
    adminResetPassword,
    resetPassword
} = require("../controller/passwordController");

// Public: request a password reset email.
router.post("/forgot", forgotPassword);

// Public: reset password using the emailed token.
router.post("/reset", resetPassword);

// Protected: a logged-in user changes their own password.
router.patch("/change", protect, changePassword);

// Admin only: send a reset link to another user's registered email.
router.post(
    "/admin-reset/:userId",
    protect,
    authorizeRoles("admin"),
    adminResetPassword
);

module.exports = router;
