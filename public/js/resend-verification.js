
const resendForm = document.getElementById("resendForm");
const messageBox = document.getElementById("message");

resendForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();

    messageBox.textContent = "Processing your request...";

    try {
        const response = await fetch("/api/auth/resend-verification", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        messageBox.textContent = data.message;
        messageBox.style.color = response.ok ? "green" : "red";
    } catch (error) {
        console.error("Resend verification error:", error);

        messageBox.textContent =
            "Unable to contact the server. Please try again.";
        messageBox.style.color = "red";
    }
});
