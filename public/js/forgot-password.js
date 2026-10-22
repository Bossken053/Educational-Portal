
const forgotForm = document.getElementById("forgot-form");
const emailInput = document.getElementById("email");
const forgotButton = document.getElementById("forgot-button");
const forgotMessage = document.getElementById("forgot-message");

function showMessage(message, type) {
    forgotMessage.textContent = message;
    forgotMessage.className = `message ${type}`;
    forgotMessage.hidden = false;
}

forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();

    if (!email) {
        showMessage("Please enter your email address.", "error");
        emailInput.focus();
        return;
    }

    forgotButton.disabled = true;
    forgotButton.textContent = "Sending Instructions...";
    forgotMessage.hidden = true;

    try {
        const response = await fetch("/api/password/forgot", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.success !== true) {
            throw new Error(
                data.message || "Unable to process your request. Please try again."
            );
        }

        showMessage(
            data.message ||
            "If an account exists for that email, password reset instructions will be sent.",
            "success"
        );

        forgotForm.reset();
    } catch (error) {
        showMessage(
            error.message ||
            "Unable to connect to the server. Please try again.",
            "error"
        );
    } finally {
        forgotButton.disabled = false;
        forgotButton.textContent = "Send Reset Instructions";
    }
});
