
const PROFILE_URL = "/api/users/me";
const PASSPORT_URL = "/api/users/me/passport";
const LOGOUT_URL = "/api/auth/logout";
const CHANGE_PASSWORD_URL = "/api/password/change";

const notice = document.getElementById("notice");
const logoutBtn = document.getElementById("logoutBtn");

const changePasswordForm = document.getElementById("changePasswordForm");
const currentPasswordInput = document.getElementById("currentPassword");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const passwordMessage = document.getElementById("passwordMessage");

document.getElementById("year").textContent = new Date().getFullYear();

function showNotice(message, type = "info") {
    notice.textContent = message;
    notice.className = `notice ${type}`;
    notice.hidden = false;
}

function hideNotice() {
    notice.hidden = true;
    notice.textContent = "";
}

function showPasswordMessage(message, type = "error") {
    passwordMessage.textContent = message;
    passwordMessage.className = `security-notice ${type}`;
    passwordMessage.style.display = "block";
}

function hidePasswordMessage() {
    passwordMessage.textContent = "";
    passwordMessage.className = "security-notice";
    passwordMessage.style.display = "none";
}

function displayValue(value) {
    if (value === undefined || value === null || String(value).trim() === "") {
        return "Not provided";
    }

    return String(value);
}

function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric"
    });
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        credentials: "same-origin",
        headers: {
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
        window.location.href = "/login";
        throw new Error("Your session has expired. Please log in again.");
    }

    if (response.status === 403) {
        throw new Error(
            data.message || "You do not have permission to access this page."
        );
    }

    if (!response.ok) {
        throw new Error(data.message || "The request failed.");
    }

    return data;
}

function getUserFromResponse(data) {
    if (data.user && typeof data.user === "object") {
        return data.user;
    }

    if (data.profile && typeof data.profile === "object") {
        return data.profile;
    }

    if (data._id || data.fullName || data.email) {
        return data;
    }

    return null;
}

function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = displayValue(value);
    }
}

function getInitials(name) {
    return String(name || "Student")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("") || "S";
}

function setPassportImage(imageId, fallbackId, initials) {
    const image = document.getElementById(imageId);
    const fallback = document.getElementById(fallbackId);

    fallback.textContent = initials;
    fallback.hidden = false;
    image.hidden = true;
    image.removeAttribute("src");

    image.onload = () => {
        image.hidden = false;
        fallback.hidden = true;
    };

    image.onerror = () => {
        image.hidden = true;
        fallback.hidden = false;
    };

    image.src = PASSPORT_URL;
}

function getVerification(user) {
    return user.isVerified === true || user.emailVerified === true;
}

function renderVerification(user) {
    const verified = getVerification(user);
    const label = verified ? "Verified" : "Not Verified";

    setText("verificationSummary", label);
    setText("detailVerification", label);

    const badge = document.getElementById("verificationBadge");

    badge.textContent = label;
    badge.className = `status-badge ${verified ? "verified" : "pending"}`;

    setText(
        "accountMessage",
        verified
            ? "Your email address has been verified. Your account verification requirement is complete."
            : "Your email address has not been verified yet. Check your inbox for the verification email, or use the resend verification page."
    );
}

function renderUser(user) {
    const name = user.fullName || user.name || "Student";
    const email = user.email || "";
    const phone = user.phone || "";
    const course = user.selectedCourse || "";
    const exam = user.selectedExam || "";
    const createdAt = formatDate(user.createdAt);
    const initials = getInitials(name);

    setText("welcomeName", name);
    setText("profileName", name);
    setText("profileEmail", email);
    setText("fullName", name);
    setText("phone", phone);
    setText("email", email);
    setText("createdAt", createdAt);

    setText("fullProfileName", name);
    setText("fullProfileEmail", email);
    setText("detailFullName", name);
    setText("detailEmail", email);
    setText("detailPhone", phone);
    setText("detailRole", user.role || "student");
    setText("detailCreatedAt", createdAt);

    setText("roleSummary", user.role || "student");
    setText("accountRoleBadge", user.role || "student");

    setText("selectedCourse", course || "No course selected");
    setText("courseSummary", course || "Not selected");
    setText("detailCourse", course || "No course selected");

    setText("selectedExam", exam || "No exam selected");
    setText("examSummary", exam || "Not selected");
    setText("detailExam", exam || "No exam selected");

    setText(
        "examDescription",
        exam
            ? "Your selected optional examination"
            : "You did not select an optional examination."
    );

    setText(
        "detailExamDescription",
        exam
            ? "This is the optional examination recorded on your account."
            : "No optional examination was selected during registration."
    );

    document.getElementById("topAvatar").textContent = initials;
    document.getElementById("passportFallback").textContent = initials;
    document.getElementById("profilePassportFallback").textContent = initials;

    setPassportImage("passportImage", "passportFallback", initials);
    setPassportImage("profilePassportImage", "profilePassportFallback", initials);

    renderVerification(user);
}

async function loadProfile() {
    hideNotice();

    try {
        const data = await apiRequest(PROFILE_URL);

        if (data.success === false) {
            throw new Error(data.message || "Could not load your student profile.");
        }

        const user = getUserFromResponse(data);

        if (!user) {
            throw new Error("The server did not return your profile information.");
        }

        if (user.role && user.role !== "student") {
            if (user.role === "admin") {
                window.location.href = "/admin";
            } else if (user.role === "tutor") {
                window.location.href = "/tutor-dashboard";
            } else {
                showNotice("This page is only available to student accounts.", "error");
            }

            return;
        }

        renderUser(user);
    } catch (error) {
        showNotice(error.message || "Unable to load your profile.", "error");
    }
}

function activateSection(sectionId) {
    const validSections = [
        "overview",
        "my-profile",
        "my-programme",
        "account",
        "security"
    ];

    if (!validSections.includes(sectionId)) {
        sectionId = "overview";
    }

    document.querySelectorAll(".page-section").forEach(section => {
        section.hidden = section.id !== sectionId;
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.section === sectionId);
    });

    const headings = {
        overview: "Dashboard Overview",
        "my-profile": "My Profile",
        "my-programme": "My Programme",
        account: "Account Status",
        security: "Security & Password"
    };

    document.getElementById("pageHeading").textContent = headings[sectionId];

    document.getElementById("sidebar").classList.remove("open");
}

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();

        const sectionId = link.dataset.section;
        activateSection(sectionId);
        history.replaceState(null, "", `#${sectionId}`);
    });
});

document.querySelectorAll("[data-open-section]").forEach(button => {
    button.addEventListener("click", () => {
        const sectionId = button.dataset.openSection;
        activateSection(sectionId);
        history.replaceState(null, "", `#${sectionId}`);
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
});

document.getElementById("viewProgrammeBtn").addEventListener("click", () => {
    activateSection("my-programme");
    history.replaceState(null, "", "#my-programme");
    window.scrollTo({ top: 0, behavior: "smooth" });
});

document.getElementById("menuBtn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
});

changePasswordForm.addEventListener("submit", async event => {
    event.preventDefault();
    hidePasswordMessage();

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showPasswordMessage("Please complete all three password fields.");
        return;
    }

    if (newPassword.length < 8 || newPassword.length > 128) {
        showPasswordMessage("Your new password must be between 8 and 128 characters.");
        newPasswordInput.focus();
        return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        showPasswordMessage("Your new password must contain at least one letter and one number.");
        newPasswordInput.focus();
        return;
    }

    if (newPassword !== confirmPassword) {
        showPasswordMessage("The new password and confirmation do not match.");
        confirmPasswordInput.focus();
        return;
    }

    if (newPassword === currentPassword) {
        showPasswordMessage("Choose a new password that differs from your current password.");
        newPasswordInput.focus();
        return;
    }

    changePasswordBtn.disabled = true;
    changePasswordBtn.textContent = "Changing Password...";

    try {
        const data = await apiRequest(CHANGE_PASSWORD_URL, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                currentPassword,
                newPassword,
                confirmPassword
            })
        });

        if (data.success === false) {
            throw new Error(data.message || "Unable to change your password.");
        }

        changePasswordForm.reset();

        showPasswordMessage(
            data.message || "Your password has been changed successfully.",
            "success"
        );
    } catch (error) {
        if (!passwordMessage.textContent) {
            showPasswordMessage(
                error.message || "Unable to change your password. Please try again."
            );
        }
    } finally {
        changePasswordBtn.disabled = false;
        changePasswordBtn.textContent = "Change Password";
    }
});

logoutBtn.addEventListener("click", async () => {
    if (!window.confirm("Are you sure you want to log out?")) {
        return;
    }

    logoutBtn.disabled = true;

    try {
        await apiRequest(LOGOUT_URL, {
            method: "POST"
        });

        window.location.href = "/login";
    } catch (error) {
        showNotice(error.message || "Logout failed. Please try again.", "error");
        logoutBtn.disabled = false;
    }
});

const initialSection = window.location.hash.replace("#", "");
activateSection(initialSection || "overview");

loadProfile();
