
require("dotenv").config();

const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const multer = require("multer");

const connectDB = require("./config/db");

const authRoute = require("./route/authRoute");
const tutorRoute = require("./route/tutorRoute");
const userRoute = require("./route/userRoute");
const passwordRoute = require("./route/passwordRoute");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(express.static(path.join(__dirname, "public")));

// API routes
app.use("/api/auth", authRoute);
app.use("/api/tutors", tutorRoute);
app.use("/api/users", userRoute);
app.use("/api/password", passwordRoute);

// Website pages
const pages = {
    "/": "index.html",
    "/register": "register.html",
    "/login": "login.html",
    "/forgot-password": "forgot-password.html",
    "/verify-email": "verify-email.html",
    "/resend-verification": "resend-verification.html",
    "/admin": "admin.html",
    "/student-dashboard": "student-dashboard.html",
    "/tutor-dashboard": "tutor-dashboard.html",
    "/reset-password": "reset-password.html"
};

for (const [url, file] of Object.entries(pages)) {
    app.get(url, (req, res) => {
        res.sendFile(
            path.join(__dirname, "public", file),
            error => {
                if (error) {
                    console.error(`Could not load ${file}:`, error.message);

                    if (!res.headersSent) {
                        res.status(error.statusCode || 500).send(
                            `Could not load ${file}. Check that the file exists in the public folder.`
                        );
                    }
                }
            }
        );
    });
}

// Error handling
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const message =
            err.code === "LIMIT_FILE_SIZE"
                ? "Passport photograph must not exceed 2 MB."
                : "Passport upload failed.";

        return res.status(400).json({
            success: false,
            message
        });
    }

    if (err.message && err.message.startsWith("Only JPG, PNG")) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    console.error("Request error:", err.message);

    return res.status(500).json({
        success: false,
        message: "An unexpected server error occurred."
    });
});

// Start server
const startServer = async () => {
    try {
        await connectDB();

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(
                `Server is running at http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();
