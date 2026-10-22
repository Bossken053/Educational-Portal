
const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
    try {
        const token = req.cookies?.fhobs_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Access denied. Please log in first."
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is missing from .env");

            return res.status(500).json({
                success: false,
                message: "Server authentication is not configured."
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded.id || !decoded.role) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token."
            });
        }

        req.user = {
            id: decoded.id,
            role: decoded.role
        };

        next();
    } catch (error) {
    console.error("Get my profile error:", error);

    return res.status(500).json({
        success: false,
        message: "Unable to retrieve your profile."
    });
    }
};

module.exports = protect;
