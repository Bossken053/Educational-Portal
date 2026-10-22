
const form = document.getElementById("tutor-register-form");
const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const passport = document.getElementById("passport");
const preview = document.getElementById("passport-preview");
const message = document.getElementById("form-message");

document.getElementById("year").textContent =
    new Date().getFullYear();

function showMessage(text, type) {
    message.textContent = text;
    message.className = `form-message ${type}`;
}

passport.addEventListener("change", () => {
    preview.hidden = true;
    preview.removeAttribute("src");

    const file = passport.files[0];

    if (!file) return;

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
        passport.value = "";
        showMessage(
            "Select a JPG, PNG, or WebP photograph.",
            "error"
        );
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        passport.value = "";
        showMessage(
            "The photograph must not exceed 2 MB.",
            "error"
        );
        return;
    }

    const imageURL = URL.createObjectURL(file);
    preview.src = imageURL;
    preview.hidden = false;

    preview.onload = () => URL.revokeObjectURL(imageURL);
    message.textContent = "";
    message.className = "form-message";
});

form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (password.value.length < 8) {
        showMessage(
            "Your password must contain at least 8 characters.",
            "error"
        );
        return;
    }

    if (password.value !== confirmPassword.value) {
        showMessage("The passwords do not match.", "error");
        confirmPassword.focus();
        return;
    }

    if (!passport.files.length) {
        showMessage(
            "Please upload your passport photograph.",
            "error"
        );
        return;
    }

    showMessage(
        "Tutor form validated. Backend registration is the next stage.",
        "success"
    );
});
