
const registerForm = document.getElementById("register-form");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const passportInput = document.getElementById("passport");
const passportPreview = document.getElementById("passport-preview");
const courseInput = document.getElementById("selectedCourse");
const examInput = document.getElementById("selectedExam");
const formMessage = document.getElementById("form-message");
const registerButton = document.getElementById("register-button");

document.getElementById("year").textContent =
    new Date().getFullYear();

function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
}

passportInput.addEventListener("change", () => {
    const file = passportInput.files[0];

    passportPreview.hidden = true;
    passportPreview.removeAttribute("src");

    if (!file) return;

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        passportInput.value = "";

        showMessage(
            "Please select a JPG, PNG, or WebP image.",
            "error"
        );

        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        passportInput.value = "";

        showMessage(
            "Your passport photograph must not exceed 2 MB.",
            "error"
        );

        return;
    }

    const imageUrl = URL.createObjectURL(file);

    passportPreview.src = imageUrl;
    passportPreview.hidden = false;

    passportPreview.onload = () => {
        URL.revokeObjectURL(imageUrl);
    };

    formMessage.textContent = "";
    formMessage.className = "form-message";
});

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const passport = passportInput.files[0];

    if (password.length < 8) {
        showMessage(
            "Your password must contain at least 8 characters.",
            "error"
        );

        passwordInput.focus();
        return;
    }

    if (password !== confirmPassword) {
        showMessage(
            "The passwords do not match. Please try again.",
            "error"
        );

        confirmPasswordInput.focus();
        return;
    }

    if (!courseInput.value) {
        showMessage(
            "Please select one course before registering.",
            "error"
        );

        courseInput.focus();
        return;
    }

    if (
        examInput.value &&
        !Array.from(examInput.options).some(
            option =>
                option.value === examInput.value &&
                option.value !== ""
        )
    ) {
        showMessage(
            "Please select a valid exam preparation programme.",
            "error"
        );

        examInput.focus();
        return;
    }

    if (!passport) {
        showMessage(
            "Please upload your passport photograph.",
            "error"
        );

        passportInput.focus();
        return;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(passport.type)) {
        showMessage(
            "Please select a JPG, PNG, or WebP image.",
            "error"
        );

        return;
    }

    if (passport.size > 2 * 1024 * 1024) {
        showMessage(
            "Your passport photograph must not exceed 2 MB.",
            "error"
        );

        return;
    }

    const formData = new FormData(registerForm);

    // The server determines the user's role.
    formData.delete("role");

    registerButton.disabled = true;
    registerButton.textContent = "Creating Account...";

    showMessage("Submitting your registration...", "success");

    try {
       const response = await fetch("/api/auth/register/student", {
                method: "POST",
                body: formData,
                credentials: "same-origin"
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Registration failed. Please try again."
            );
        }

        showMessage(
            result.message ||
                "Registration successful. Check your email for verification.",
            result.emailSent === false ? "error" : "success"
        );

        if (result.emailSent !== false) {
            registerForm.reset();

            passportPreview.hidden = true;
            passportPreview.removeAttribute("src");
        }
    } catch (error) {
        showMessage(
            error.message ||
                "Unable to connect to the server. Please try again.",
            "error"
        );
    } finally {
        registerButton.disabled = false;
        registerButton.textContent = "Create Student Account";
    }
});
