
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline/promises");
const { stdin, stdout } = require("process");

const connectDB = require("../config/db");
const User = require("../models/user");

const rl = readline.createInterface({
    input: stdin,
    output: stdout
});

async function createAdmin() {
    try {
        console.log("\n=== FHOBS SOLUTIONS ADMIN SETUP ===\n");

        const fullName = (
            await rl.question("Enter admin full name: ")
        ).trim();

        const email = (
            await rl.question("Enter admin email: ")
        ).trim().toLowerCase();

        const phone = (
            await rl.question("Enter admin phone number: ")
        ).trim();

        const password = await rl.question("Enter admin password: ");
        const confirmPassword = await rl.question(
            "Confirm admin password: "
        );

        if (!fullName || !email || !phone || !password) {
            throw new Error("All fields are required.");
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            throw new Error("Enter a valid email address.");
        }

        if (password.length < 8) {
            throw new Error("Password must contain at least 8 characters.");
        }

        if (password !== confirmPassword) {
            throw new Error("Passwords do not match.");
        }

        await connectDB();

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            throw new Error(
                "This email already exists. No account was changed."
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const admin = await User.create({
            fullName,
            email,
            phone,
            password: hashedPassword,
            role: "admin",
            isVerified: true,
            isApproved: true
        });

        console.log("\nAdministrator created successfully!");
        console.log("Name:", admin.fullName);
        console.log("Email:", admin.email);
        console.log("Role:", admin.role);
        console.log("Email verified:", admin.isVerified);
        console.log("Approved:", admin.isApproved);
        console.log("\nYou can now log in through Postman.");
    } catch (error) {
        console.error("\nAdmin setup failed:", error.message);
        process.exitCode = 1;
    } finally {
        rl.close();

        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
    }
}

createAdmin();
