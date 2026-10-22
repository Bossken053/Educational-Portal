
const resetForm = document.getElementById("reset-form");
const resetMessage = document.getElementById("reset-message");
const resetButton = document.getElementById("reset-button");

const newPasswordInput = document.getElementById("new-password");
const confirmPasswordInput = document.getElementById("confirm-password");

const params = new URLSearchParams(window.location.search);
const token = params.get("token");

function showMessage(message, type) {
    resetMessage.textContent = message;
    resetMessage.className = `message ${type}`;
}

if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    resetForm.hidden = true;

    showMessage(
        "The reset link is incomplete or invalid. Please open the complete link from your email or request a new one.",
        "error"
    );
}

resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
        showMessage("This reset link is invalid. Please request a new one.", "error");
        return;
    }

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (
        newPassword.length < 8 ||
        newPassword.length > 128 ||
        !/[A-Za-z]/.test(newPassword) ||
        !/\d/.test(newPassword)
    ) {
        showMessage(
            "Use a password between 8 and 128 characters, including a letter and a number.",
            "error"
        );
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage("The passwords do not match.", "error");
        return;
    }

    resetButton.disabled = true;
    resetButton.textContent = "Resetting...";

    try {
        const response = await fetch("/api/password/reset", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                token,
                newPassword,
                confirmPassword
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Password reset failed.");
        }

        resetForm.reset();
        resetForm.hidden = true;

        showMessage(
            data.message || "Password reset successfully. You can now log in.",
            "success"
        );

        // Remove the token from the address bar after successful use.
        window.history.replaceState(
            {},
            document.title,
            window.location.pathname
        );
    } catch (error) {
        showMessage(
            error.message || "Unable to connect to the server. Please try again.",
            "error"
        );
    } finally {
        resetButton.disabled = false;
        resetButton.textContent = "Reset Password";
    }
});
