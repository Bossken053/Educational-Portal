const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Please log in first."
            });
        }

        // Temporary debugging information
        console.log("Logged-in user role:", req.user.role);
        console.log("Allowed roles:", allowedRoles);

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: "Access denied. Administrator permission is required."
            });
        }

        next();
    };
};

module.exports = authorizeRoles;