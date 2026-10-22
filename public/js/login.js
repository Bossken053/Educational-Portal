
const loginForm = document.getElementById("login-form");
const loginMessage = document.getElementById("login-message");
const loginButton = document.getElementById("login-button");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberCheckbox = document.getElementById("remember");

document.getElementById("year").textContent =
    new Date().getFullYear();

function displayLoginMessage(message, type) {
    loginMessage.textContent = message;
    loginMessage.className = `login-message ${type}`;
}

function getDashboardUrl(role) {
    switch (role) {
        case "admin":
            return "/admin";

        case "tutor":
            return "/tutor-dashboard";

        case "student":
            return "/student-dashboard";

        default:
            return "/";
    }
}

// Restore the remembered email address.
try {
    const savedEmail = localStorage.getItem("fhobs_remembered_email");

    if (savedEmail) {
        emailInput.value = savedEmail;
        rememberCheckbox.checked = true;
    }
} catch (error) {
    console.warn("Remember-email storage is unavailable.");
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        displayLoginMessage(
            "Please enter your email address and password.",
            "error"
        );
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    displayLoginMessage(
        "Checking your login details...",
        "success"
    );

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.success === false) {
            throw new Error(
                data.message || "Login failed. Please try again."
            );
        }

        // Remember the email only, never the password or token.
        try {
            if (rememberCheckbox.checked) {
                localStorage.setItem(
                    "fhobs_remembered_email",
                    email
                );
            } else {
                localStorage.removeItem("fhobs_remembered_email");
            }
        } catch (error) {
            console.warn("Could not save the remembered email.");
        }

        const role = data.user?.role || data.role;

        if (!role) {
            throw new Error(
                "The server did not return your account role. Please check the login controller response."
            );
        }

        const dashboardUrl = getDashboardUrl(role);

        displayLoginMessage(
            "Login successful! Opening your dashboard...",
            "success"
        );

        window.location.replace(dashboardUrl);

    } catch (error) {
        displayLoginMessage(
            error.message ||
                "Unable to connect to the server. Please try again.",
            "error"
        );
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Login to Your Account";
    }
});
