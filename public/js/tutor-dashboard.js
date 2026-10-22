
const PROFILE_URL = "/api/users/me";
const PASSPORT_URL = "/api/users/me/passport";
const STUDENTS_URL = "/api/tutors/my-students";
const LOGOUT_URL = "/api/auth/logout";
const CHANGE_PASSWORD_URL = "/api/password/change";

const notice = document.getElementById("notice");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");
const refreshStudentsBtn = document.getElementById("refreshStudentsBtn");

let currentProfile = null;
let studentsLoaded = false;

/* --------------------------------------------------
   GENERAL HELPERS
-------------------------------------------------- */

const yearElement = document.getElementById("year");

if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
}

function showNotice(message, type = "info") {
    if (!notice) return;

    notice.textContent = message;
    notice.className = `notice ${type}`;
    notice.hidden = false;
}

function hideNotice() {
    if (!notice) return;

    notice.hidden = true;
    notice.textContent = "";
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
        throw new Error(data.message || "The request could not be completed.");
    }

    return data;
}

function getProfileFromResponse(data) {
    if (data.user && typeof data.user === "object") {
        return data.user;
    }

    if (data.profile && typeof data.profile === "object") {
        return data.profile;
    }

    if (data._id || data.email || data.fullName) {
        return data;
    }

    return null;
}

function setText(elementId, value) {
    const element = document.getElementById(elementId);

    if (element) {
        element.textContent = displayValue(value);
    }
}

function setBadge(elementId, text, className) {
    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = text;
    element.className = `badge ${className || ""}`.trim();
}

/* --------------------------------------------------
   PROFILE AND ACCOUNT STATUS
-------------------------------------------------- */

function getApprovalStatus(user) {
    if (user.isRejected === true) {
        return {
            text: "Rejected",
            className: "danger",
            message:
                "Your tutor application has been rejected. Contact the administrator " +
                "for information about the next steps."
        };
    }

    if (user.isApproved === true) {
        return {
            text: "Approved",
            className: "success",
            message: "Your tutor account has been approved by the administrator."
        };
    }

    return {
        text: "Pending Approval",
        className: "warning",
        message:
            "Your tutor account is awaiting administrator approval. " +
            "You may need to wait until the review is complete."
    };
}

function getVerificationStatus(user) {
    const verified = user.isVerified === true || user.emailVerified === true;

    return verified
        ? { text: "Verified", className: "success" }
        : { text: "Not Verified", className: "warning" };
}

function setPassportImage(imageId, fallbackId, initials) {
    const image = document.getElementById(imageId);
    const fallback = document.getElementById(fallbackId);

    if (!image || !fallback) return;

    fallback.textContent = initials || "T";
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

function renderProfile(user) {
    currentProfile = user;

    const fullName = user.fullName || user.name || "Tutor";
    const email = user.email || "";
    const phone = user.phone || "";
    const subject = user.subject || "";
    const createdAt = formatDate(user.createdAt);

    const initials = fullName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("") || "T";

    setText("welcomeName", fullName);
    setText("profileName", fullName);
    setText("profileEmail", email);
    setText("fullName", fullName);
    setText("email", email);
    setText("phone", phone);
    setText("subject", subject);
    setText("createdAt", createdAt);
    setText("subjectSummary", subject || "Not provided");

    setText("profilePageName", fullName);
    setText("profilePageEmail", email);
    setText("profileFullName", fullName);
    setText("profileEmailAddress", email);
    setText("profilePhone", phone);
    setText("profileSubject", subject);
    setText("profileRole", user.role || "tutor");
    setText("profileCreatedAt", createdAt);

    const initialsElement = document.getElementById("welcomeInitials");

    if (initialsElement) {
        initialsElement.textContent = initials;
    }

    setPassportImage("passportImage", "passportFallback", initials);
    setPassportImage("profilePassportImage", "profilePassportFallback", initials);

    const verification = getVerificationStatus(user);

    setBadge("verificationBadge", verification.text, verification.className);
    setText("emailSummary", verification.text);

    const approval = getApprovalStatus(user);

    setBadge("approvalBadge", approval.text, approval.className);
    setText("approvalSummary", approval.text);
    setText("approvalMessage", approval.message);

    setBadge("roleBadge", user.role || "Tutor", "success");
}

async function loadProfile() {
    if (refreshBtn) refreshBtn.disabled = true;

    hideNotice();

    try {
        const data = await apiRequest(PROFILE_URL);

        if (data.success === false) {
            throw new Error(data.message || "Could not load your profile.");
        }

        const user = getProfileFromResponse(data);

        if (!user) {
            throw new Error(
                "The server did not return profile information. " +
                "Check GET /api/users/me."
            );
        }

        if (user.role && user.role !== "tutor") {
            showNotice(
                "This dashboard is for tutor accounts. Please log in with a tutor account.",
                "error"
            );
            return;
        }

        renderProfile(user);
        await loadStudents(true);
    } catch (error) {
        showNotice(error.message || "Unable to load your tutor profile.", "error");
    } finally {
        if (refreshBtn) refreshBtn.disabled = false;
    }
}

/* --------------------------------------------------
   STUDENTS
-------------------------------------------------- */

function showStudentsMessage(message, type = "info") {
    const element = document.getElementById("studentsMessage");

    if (!element) return;

    element.textContent = message;
    element.className = "students-message";

    if (type === "error") {
        element.classList.add("students-error");
    }

    if (type === "loading") {
        element.classList.add("students-loading");
    }

    element.hidden = false;
}

function renderStudents(students) {
    const tableBody = document.getElementById("studentsTableBody");
    const tableWrapper = document.getElementById("studentsTableWrapper");
    const countElement = document.getElementById("studentCount");

    if (!tableBody || !tableWrapper || !countElement) return;

    tableBody.replaceChildren();
    countElement.textContent = String(students.length);
    setText("studentCountSummary", students.length);

    if (students.length === 0) {
        tableWrapper.hidden = true;

        showStudentsMessage(
            "No students are currently registered for your course. " +
            "Check again after students register."
        );

        return;
    }

    students.forEach((student, index) => {
        const row = document.createElement("tr");

        const values = [
            String(index + 1),
            displayValue(student.fullName),
            displayValue(student.email),
            displayValue(student.phone),
            displayValue(student.selectedCourse),
            student.selectedExam && String(student.selectedExam).trim()
                ? String(student.selectedExam)
                : "Not selected"
        ];

        values.forEach((value, cellIndex) => {
            const cell = document.createElement("td");
            cell.textContent = value;

            if (cellIndex === 1) cell.className = "student-name";
            if (cellIndex === 4) cell.className = "student-course";

            row.appendChild(cell);
        });

        tableBody.appendChild(row);
    });

    tableWrapper.hidden = false;

    const message = document.getElementById("studentsMessage");

    if (message) message.hidden = true;
}

async function loadStudents(silent = false) {
    if (!silent) {
        showStudentsMessage("Loading students...", "loading");
    }

    if (refreshStudentsBtn) refreshStudentsBtn.disabled = true;

    try {
        const data = await apiRequest(STUDENTS_URL);

        if (data.success === false) {
            throw new Error(data.message || "Could not load students.");
        }

        const students = Array.isArray(data.students) ? data.students : [];

        renderStudents(students);
        studentsLoaded = true;
    } catch (error) {
        const wrapper = document.getElementById("studentsTableWrapper");
        const body = document.getElementById("studentsTableBody");

        if (wrapper) wrapper.hidden = true;
        if (body) body.replaceChildren();

        setText("studentCount", "0");
        setText("studentCountSummary", "Unavailable");

        showStudentsMessage(
            error.message || "Unable to load your students.",
            "error"
        );
    } finally {
        if (refreshStudentsBtn) refreshStudentsBtn.disabled = false;
    }
}

/* --------------------------------------------------
   CHANGE PASSWORD FORM
-------------------------------------------------- */

function addPasswordStyles() {
    if (document.getElementById("passwordSectionStyles")) return;

    const style = document.createElement("style");
    style.id = "passwordSectionStyles";

    style.textContent = `
        .password-card {
            max-width: 650px;
            margin: 24px auto;
            padding: 28px;
            background: var(--card-bg, #fff);
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
        }

        .password-card-header h2 {
            margin: 0 0 10px;
        }

        .password-card-header p {
            margin: 0 0 24px;
            line-height: 1.6;
            color: #64748b;
        }

        .password-field {
            margin-bottom: 20px;
        }

        .password-field label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
        }

        .password-input-wrapper {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .password-input-wrapper input {
            box-sizing: border-box;
            width: 100%;
            min-width: 0;
            padding: 12px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font: inherit;
        }

        .password-input-wrapper input:focus {
            outline: 2px solid #2563eb;
            outline-offset: 1px;
        }

        .toggle-password {
            padding: 10px 12px;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            background: #f8fafc;
            cursor: pointer;
        }

        .password-field small {
            display: block;
            margin-top: 7px;
            color: #64748b;
        }

        #changePasswordBtn {
            width: 100%;
            padding: 13px 18px;
            border: 0;
            border-radius: 8px;
            background: #1d4ed8;
            color: #fff;
            font: inherit;
            font-weight: 600;
            cursor: pointer;
        }

        #changePasswordBtn:disabled {
            opacity: 0.65;
            cursor: not-allowed;
        }

        .password-message {
            margin: 12px 0;
            padding: 12px;
            border-radius: 8px;
            line-height: 1.5;
        }

        .password-message.success {
            color: #166534;
            background: #dcfce7;
        }

        .password-message.error {
            color: #991b1b;
            background: #fee2e2;
        }

        @media (max-width: 600px) {
            .password-card {
                margin: 12px 0;
                padding: 18px;
            }
        }
    `;

    document.head.appendChild(style);
}

function addPasswordSection() {
    const navigation = document.querySelector(".navigation");
    const mainContent = document.querySelector(".main-content");

    if (!navigation || !mainContent) {
        console.error(
            "Tutor dashboard navigation or main content was not found."
        );
        return;
    }

    // Create the link if it doesn't already exist.
    let navLink = navigation.querySelector(
        '[data-section="change-password"]'
    );

    if (!navLink) {
        navLink = document.createElement("a");
        navLink.href = "#change-password";
        navLink.className = "nav-link";
        navLink.dataset.section = "change-password";
        navLink.textContent = "Change Password";
        navigation.appendChild(navLink);
    }

    // Create the password section if it doesn't already exist.
    let section = document.getElementById("change-password");

    if (!section) {
        section = document.createElement("section");
        section.id = "change-password";
        section.className = "page-section";
        section.hidden = true;

        section.innerHTML = `
            <div class="password-card">
                <div class="password-card-header">
                    <h2>Change Password</h2>
                    <p>
                        Update your password to help keep your
                        FHOBS SOLUTIONS account secure.
                    </p>
                </div>

                <form id="changePasswordForm" autocomplete="off">
                    <div class="password-field">
                        <label for="currentPassword">Current Password</label>
                        <div class="password-input-wrapper">
                            <input
                                type="password"
                                id="currentPassword"
                                name="currentPassword"
                                autocomplete="current-password"
                                required
                            >
                            <button
                                type="button"
                                class="toggle-password"
                                data-target="currentPassword"
                            >Show</button>
                        </div>
                    </div>

                    <div class="password-field">
                        <label for="newPassword">New Password</label>
                        <div class="password-input-wrapper">
                            <input
                                type="password"
                                id="newPassword"
                                name="newPassword"
                                minlength="8"
                                autocomplete="new-password"
                                required
                            >
                            <button
                                type="button"
                                class="toggle-password"
                                data-target="newPassword"
                            >Show</button>
                        </div>
                        <small>Use at least 8 characters.</small>
                    </div>

                    <div class="password-field">
                        <label for="confirmPassword">Confirm New Password</label>
                        <div class="password-input-wrapper">
                            <input
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                minlength="8"
                                autocomplete="new-password"
                                required
                            >
                            <button
                                type="button"
                                class="toggle-password"
                                data-target="confirmPassword"
                            >Show</button>
                        </div>
                    </div>

                    <p
                        id="passwordMessage"
                        class="password-message"
                        role="status"
                        aria-live="polite"
                        hidden
                    ></p>

                    <button type="submit" id="changePasswordBtn">
                        Update Password
                    </button>
                </form>
            </div>
        `;

        mainContent.appendChild(section);
    }

    addPasswordStyles();

    const form = document.getElementById("changePasswordForm");

    if (form && form.dataset.listenerAttached !== "true") {
        form.dataset.listenerAttached = "true";
        form.addEventListener("submit", changePassword);
    }

    // Event delegation ensures all Show/Hide buttons work.
    if (!section.dataset.passwordToggleAttached) {
        section.dataset.passwordToggleAttached = "true";

        section.addEventListener("click", event => {
            const button = event.target.closest(".toggle-password");

            if (!button) return;

            const input = document.getElementById(button.dataset.target);

            if (!input) return;

            const shouldShow = input.type === "password";

            input.type = shouldShow ? "text" : "password";
            button.textContent = shouldShow ? "Hide" : "Show";
            button.setAttribute(
                "aria-label",
                `${shouldShow ? "Hide" : "Show"} ${input.name}`
            );
        });
    }
}

async function changePassword(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const currentPassword =
        document.getElementById("currentPassword").value;
    const newPassword =
        document.getElementById("newPassword").value;
    const confirmPassword =
        document.getElementById("confirmPassword").value;

    const button = document.getElementById("changePasswordBtn");

    if (!currentPassword || !newPassword || !confirmPassword) {
        showPasswordMessage("Please fill in all password fields.", "error");
        return;
    }

    if (newPassword.length < 8) {
        showPasswordMessage(
            "Your new password must contain at least 8 characters.",
            "error"
        );
        return;
    }

    if (newPassword !== confirmPassword) {
        showPasswordMessage("The new passwords do not match.", "error");
        return;
    }

    if (currentPassword === newPassword) {
        showPasswordMessage(
            "Your new password must be different from your current password.",
            "error"
        );
        return;
    }

    button.disabled = true;
    button.textContent = "Updating...";

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
            throw new Error(data.message || "Could not change your password.");
        }

        form.reset();

        document.querySelectorAll(".toggle-password").forEach(toggle => {
            toggle.textContent = "Show";
        });

        showPasswordMessage(
            data.message || "Your password has been changed successfully.",
            "success"
        );
    } catch (error) {
        showPasswordMessage(
            error.message || "Unable to change your password.",
            "error"
        );
    } finally {
        button.disabled = false;
        button.textContent = "Update Password";
    }
}

function showPasswordMessage(text, type) {
    const message = document.getElementById("passwordMessage");

    if (!message) return;

    message.textContent = text;
    message.className = `password-message ${type}`;
    message.hidden = false;
}

/* --------------------------------------------------
   NAVIGATION
-------------------------------------------------- */

function activateSection(sectionId) {
    const validSections = [
        "dashboard",
        "my-students",
        "profile",
        "account-status",
        "change-password"
    ];

    if (!validSections.includes(sectionId)) {
        sectionId = "dashboard";
    }

    document.querySelectorAll(".page-section").forEach(section => {
        section.hidden = section.id !== sectionId;
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.section === sectionId);
    });

    const headings = {
        dashboard: "Tutor Dashboard",
        "my-students": "My Students",
        profile: "My Profile",
        "account-status": "Account Status",
        "change-password": "Change Password"
    };

    const heading = document.getElementById("pageHeading");

    if (heading) {
        heading.textContent = headings[sectionId];
    }

    const sidebar = document.getElementById("sidebar");

    if (sidebar) {
        sidebar.classList.remove("open");
    }

    if (sectionId === "my-students" && !studentsLoaded) {
        loadStudents();
    }
}

function setupNavigation() {
    // Attach listeners after the password link has been created.
    document.querySelectorAll(".nav-link").forEach(link => {
        if (link.dataset.navigationAttached === "true") return;

        link.dataset.navigationAttached = "true";

        link.addEventListener("click", event => {
            event.preventDefault();

            const sectionId = link.dataset.section;

            activateSection(sectionId);
            history.replaceState(null, "", `#${sectionId}`);
        });
    });
}

/* --------------------------------------------------
   BUTTONS AND LOGOUT
-------------------------------------------------- */

const menuBtn = document.getElementById("menuBtn");

if (menuBtn) {
    menuBtn.addEventListener("click", () => {
        const sidebar = document.getElementById("sidebar");

        if (sidebar) sidebar.classList.toggle("open");
    });
}

const viewStudentsBtn = document.getElementById("viewStudentsBtn");

if (viewStudentsBtn) {
    viewStudentsBtn.addEventListener("click", () => {
        activateSection("my-students");
        history.replaceState(null, "", "#my-students");
        loadStudents();
    });
}

if (refreshBtn) {
    refreshBtn.addEventListener("click", loadProfile);
}

if (refreshStudentsBtn) {
    refreshStudentsBtn.addEventListener("click", () => loadStudents());
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        const confirmed = window.confirm("Are you sure you want to log out?");

        if (!confirmed) return;

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
}

/* --------------------------------------------------
   INITIALIZE DASHBOARD
-------------------------------------------------- */

// IMPORTANT: create the link first, then attach navigation listeners.
addPasswordSection();
setupNavigation();

const initialSection = window.location.hash.replace("#", "");

activateSection(initialSection || "dashboard");
loadProfile();
