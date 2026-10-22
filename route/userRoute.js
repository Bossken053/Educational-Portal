
const express = require("express");
const router = express.Router();

const protect = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const {
    getAllUsers,
    getUserById,
    getMyProfile,
    getMyPassport,
    updateMyProfile,
    updateUserById
} = require("../controller/userController");

router.use(protect);

// Current user's own profile and passport photograph.
router.get("/me", getMyProfile);
router.get("/me/passport", getMyPassport);

// Logged-in user's own profile.
// The controller only allows permitted profile fields.
router.patch("/me", updateMyProfile);

// Admin-only user management.
router.get("/", authorizeRoles("admin"), getAllUsers);
router.get("/:userId", authorizeRoles("admin"), getUserById);
router.patch("/:userId", authorizeRoles("admin"), updateUserById);

module.exports = router;
