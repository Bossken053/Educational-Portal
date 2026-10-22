
const message = document.getElementById("verification-message");
const loginLink = document.getElementById("login-link");
const resendLink = document.getElementById("resend-link");

async function verifyEmail() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
        message.textContent =
            "No verification token was found in this link.";
        resendLink.hidden = false;
        return;
    }

    try {
        const response = await fetch(
            `/api/auth/verify-email?token=${encodeURIComponent(token)}`
        );

        const data = await response.json();

        message.textContent = data.message || "Verification completed.";

        if (response.ok && data.success) {
            // Remove the token from the browser's address bar.
            window.history.replaceState(
                {},
                document.title,
                window.location.pathname
            );

            if (data.message.toLowerCase().includes("waiting for admin approval")) {
                loginLink.hidden = true;
            } else {
                loginLink.hidden = false;
            }
        } else {
            resendLink.hidden = false;
        }
    } catch (error) {
        message.textContent =
            "Unable to contact the server. Please try again.";
        resendLink.hidden = false;
    }
}

verifyEmail();
