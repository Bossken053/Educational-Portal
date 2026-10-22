
const API_URL = "/api/tutors";
const AUTH_URL = "/api/auth";
const USERS_URL = "/api/users";
const PASSWORD_URL = "/api/password";

const tableBody = document.getElementById("tutorTableBody");
const notice = document.getElementById("notice");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const tableTitle = document.getElementById("tableTitle");

const pageHeading = document.getElementById("pageHeading");
const pageSubtitle = document.getElementById("pageSubtitle");
const dashboardNav = document.getElementById("dashboardNav");
const usersNav = document.getElementById("usersNav");
const accountNav = document.getElementById("accountNav");
const tutorsView = document.getElementById("tutorsView");
const usersView = document.getElementById("usersView");
const accountView = document.getElementById("accountView");

const userTableBody = document.getElementById("userTableBody");
const userSearchInput = document.getElementById("userSearchInput");
const userRoleFilter = document.getElementById("userRoleFilter");
const refreshUsersBtn = document.getElementById("refreshUsersBtn");
const userDetailsDialog = document.getElementById("userDetailsDialog");
const userDetailsContent = document.getElementById("userDetailsContent");
const userDialogTitle = document.getElementById("userDialogTitle");
const closeUserDetailsBtn = document.getElementById("closeUserDetailsBtn");

const adminProfileForm = document.getElementById("adminProfileForm");
const adminPasswordForm = document.getElementById("adminPasswordForm");

let tutors = [];
let users = [];
let usersLoaded = false;
let currentAdmin = null;

const COURSE_OPTIONS = [
    "Computer Basics & Office Skills",
    "Graphic Design & Digital Marketing",
    "Web & Software Development",
    "Networking, Cybersecurity & IT Support",
    "Data Analytics & Business",
    "Kids & Teens Tech",
    "Healthcare Assistant Training"
];

const EXAM_OPTIONS = [
    "IELTS Preparation",
    "TOEFL iBT Preparation",
    "PTE Academic Preparation",
    "GRE Preparation",
    "GMAT Preparation",
    "SAT Preparation"
];

function showNotice(message, type = "success") {
    notice.textContent = message;
    notice.className = `notice ${type}`;
    notice.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        credentials: "same-origin",
        headers: {
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
        window.location.href = "/login";
        throw new Error("Your session has expired. Please log in again.");
    }

    if (response.status === 403) {
        throw new Error(data.message || "You do not have permission to do this.");
    }

    if (!response.ok) {
        throw new Error(data.message || "The request failed.");
    }

    return data;
}

function createCell(content) {
    const cell = document.createElement("td");
    cell.appendChild(content);
    return cell;
}

function createTextElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent =
        text === undefined || text === null || text === ""
            ? "Not provided"
            : String(text);
    return element;
}

function createStatus(text, className) {
    return createTextElement("span", `status ${className}`, text);
}

function createEmptyRow(table, columnCount, message) {
    table.replaceChildren();
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = columnCount;
    cell.className = "empty-state";
    cell.textContent = message;
    row.appendChild(cell);
    table.appendChild(row);
}

function formatDate(dateValue) {
    if (!dateValue) return "Not available";
    const date = new Date(dateValue);
    return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString();
}

function createButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `action-btn ${className || ""}`.trim();
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
}

function jsonBody(value) {
    return JSON.stringify(value);
}

// --------------------------------------------------
// NAVIGATION
// --------------------------------------------------

function setActiveView(view) {
    const showingUsers = view === "users";
    const showingAccount = view === "account";

    tutorsView.hidden = showingUsers || showingAccount;
    usersView.hidden = !showingUsers;
    accountView.hidden = !showingAccount;

    dashboardNav.classList.toggle("active", view === "tutors");
    usersNav.classList.toggle("active", showingUsers);
    accountNav.classList.toggle("active", showingAccount);

    document.querySelectorAll("[data-filter]").forEach(link => {
        link.classList.toggle(
            "active",
            view === "tutors" && link.dataset.filter === statusFilter.value
        );
    });

    if (showingUsers) {
        pageHeading.textContent = "User Management";
        pageSubtitle.textContent = "Edit student and tutor account details.";
        if (!usersLoaded) loadUsers();
    } else if (showingAccount) {
        pageHeading.textContent = "My Account";
        pageSubtitle.textContent = "Manage your administrator profile and security.";
        loadAdminProfile();
    } else {
        pageHeading.textContent = "Dashboard";
        pageSubtitle.textContent = "Manage tutor registrations and approvals.";
    }
}

dashboardNav.addEventListener("click", event => {
    event.preventDefault();
    statusFilter.value = "all";
    tableTitle.textContent = "All Tutors";
    renderTutors();
    setActiveView("tutors");
});

usersNav.addEventListener("click", event => {
    event.preventDefault();
    setActiveView("users");
});

accountNav.addEventListener("click", event => {
    event.preventDefault();
    setActiveView("account");
});

document.querySelectorAll("[data-filter]").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();
        statusFilter.value = link.dataset.filter;
        const filter = statusFilter.value;

        tableTitle.textContent =
            filter === "all"
                ? "All Tutors"
                : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Tutors`;

        renderTutors();
        setActiveView("tutors");
    });
});

// --------------------------------------------------
// TUTOR MANAGEMENT
// --------------------------------------------------

function getTutorStatus(tutor) {
    if (tutor.isRejected) return "rejected";
    if (tutor.isApproved) return "approved";
    return "pending";
}

function updateTutorSummary() {
    document.getElementById("totalTutors").textContent = tutors.length;
    document.getElementById("pendingTutors").textContent =
        tutors.filter(t => getTutorStatus(t) === "pending").length;
    document.getElementById("approvedTutors").textContent =
        tutors.filter(t => getTutorStatus(t) === "approved").length;
    document.getElementById("rejectedTutors").textContent =
        tutors.filter(t => getTutorStatus(t) === "rejected").length;
}

function renderTutors() {
    tableBody.replaceChildren();

    const query = searchInput.value.trim().toLowerCase();
    const filter = statusFilter.value;

    const filtered = tutors.filter(tutor => {
        const matchesStatus = filter === "all" || getTutorStatus(tutor) === filter;
        const text = [tutor.fullName, tutor.email, tutor.subject]
            .filter(Boolean).join(" ").toLowerCase();
        return matchesStatus && text.includes(query);
    });

    if (!filtered.length) {
        createEmptyRow(tableBody, 5, "No tutors match your search.");
        return;
    }

    filtered.forEach(tutor => {
        const row = document.createElement("tr");
        const info = document.createElement("div");
        info.appendChild(createTextElement("div", "tutor-name", tutor.fullName));
        info.appendChild(createTextElement("div", "tutor-email", tutor.email));
        row.appendChild(createCell(info));
        row.appendChild(createCell(createTextElement("span", "", tutor.subject)));

        row.appendChild(createCell(createStatus(
            tutor.isVerified ? "Verified" : "Not verified",
            tutor.isVerified ? "verified" : "unverified"
        )));

        const status = getTutorStatus(tutor);
        row.appendChild(createCell(createStatus(
            status[0].toUpperCase() + status.slice(1),
            status
        )));

        const actions = document.createElement("div");
        actions.className = "action-buttons";

        actions.appendChild(createButton("Edit Details", "", () => openEditDialog(tutor)));

        if (status === "pending") {
            const approve = createButton("Approve", "approve-btn", () =>
                manageTutor(tutor._id, "approve"));
            approve.disabled = !tutor.isVerified;
            actions.appendChild(approve);
            actions.appendChild(createButton("Reject", "reject-btn", () =>
                manageTutor(tutor._id, "reject")));
        } else if (status === "approved") {
            actions.appendChild(createButton("Reject", "reject-btn", () =>
                manageTutor(tutor._id, "reject")));
        } else {
            actions.appendChild(createButton("Reactivate", "reactivate-btn", () =>
                manageTutor(tutor._id, "reactivate")));
        }

        row.appendChild(createCell(actions));
        tableBody.appendChild(row);
    });
}

async function loadTutors() {
    createEmptyRow(tableBody, 5, "Loading tutors...");

    try {
        const data = await apiRequest(API_URL);
        tutors = Array.isArray(data.tutors) ? data.tutors : [];
        updateTutorSummary();
        renderTutors();
    } catch (error) {
        showNotice(error.message, "error");
        createEmptyRow(tableBody, 5, "Could not load tutors.");
    }
}

async function manageTutor(tutorId, action) {
    const prompts = {
        approve: "Approve this tutor?",
        reject: "Reject this tutor?",
        reactivate: "Return this tutor to pending approval?"
    };

    if (!window.confirm(prompts[action])) return;

    try {
        const data = await apiRequest(
            `${API_URL}/${encodeURIComponent(tutorId)}/${action}`,
            { method: "PATCH" }
        );
        showNotice(data.message || "Tutor updated successfully.");
        await Promise.all([loadTutors(), refreshUsersIfLoaded()]);
    } catch (error) {
        showNotice(error.message, "error");
    }
}

statusFilter.addEventListener("change", () => {
    const filter = statusFilter.value;
    tableTitle.textContent = filter === "all"
        ? "All Tutors"
        : `${filter[0].toUpperCase() + filter.slice(1)} Tutors`;
    renderTutors();
});

searchInput.addEventListener("input", renderTutors);
document.getElementById("refreshBtn").addEventListener("click", loadTutors);

// --------------------------------------------------
// USER MANAGEMENT
// --------------------------------------------------

function getUserName(user) {
    return user.fullName || user.name || "Name not provided";
}

function updateUserSummary() {
    document.getElementById("totalUsers").textContent = users.length;
    document.getElementById("studentCount").textContent =
        users.filter(user => user.role === "student").length;
    document.getElementById("userTutorCount").textContent =
        users.filter(user => user.role === "tutor").length;
    document.getElementById("adminCount").textContent =
        users.filter(user => user.role === "admin").length;
}

function renderUsers() {
    userTableBody.replaceChildren();

    const query = userSearchInput.value.trim().toLowerCase();
    const selectedRole = userRoleFilter.value;

    const filtered = users.filter(user => {
        const matchesRole = selectedRole === "all" || user.role === selectedRole;
        const text = [getUserName(user), user.email, user.phone, user.role]
            .filter(Boolean).join(" ").toLowerCase();
        return matchesRole && text.includes(query);
    });

    if (!filtered.length) {
        createEmptyRow(userTableBody, 7, "No users match your search.");
        return;
    }

    filtered.forEach(user => {
        const row = document.createElement("tr");
        row.appendChild(createCell(createTextElement("span", "tutor-name", getUserName(user))));
        row.appendChild(createCell(createTextElement("span", "", user.email)));
        row.appendChild(createCell(createTextElement("span", "", user.phone)));

        const role = user.role || "unknown";
        row.appendChild(createCell(createStatus(
            role[0].toUpperCase() + role.slice(1), role
        )));

        const verified = user.isVerified === true;
        row.appendChild(createCell(createStatus(
            verified ? "Verified" : "Not verified",
            verified ? "verified" : "unverified"
        )));

        row.appendChild(createCell(createTextElement("span", "", formatDate(user.createdAt))));

        const actions = document.createElement("div");
        actions.className = "action-buttons";
        actions.appendChild(createButton("View Details", "", () => loadUserDetails(user._id)));
        actions.appendChild(createButton("Edit Details", "", () => openEditDialog(user)));
        actions.appendChild(createButton("Send Reset Email", "reset-password-btn", () =>
            requestPasswordReset(user)));

        row.appendChild(createCell(actions));
        userTableBody.appendChild(row);
    });
}

async function loadUsers() {
    createEmptyRow(userTableBody, 7, "Loading users...");
    refreshUsersBtn.disabled = true;

    try {
        const data = await apiRequest(USERS_URL);
        users = Array.isArray(data.users) ? data.users : [];
        usersLoaded = true;
        updateUserSummary();
        renderUsers();
    } catch (error) {
        showNotice(error.message, "error");
        createEmptyRow(userTableBody, 7, "Could not load users.");
    } finally {
        refreshUsersBtn.disabled = false;
    }
}

async function refreshUsersIfLoaded() {
    if (usersLoaded) await loadUsers();
}

userSearchInput.addEventListener("input", renderUsers);
userRoleFilter.addEventListener("change", renderUsers);
refreshUsersBtn.addEventListener("click", loadUsers);

// --------------------------------------------------
// ADMIN PROFILE
// --------------------------------------------------

async function loadAdminProfile() {
    try {
        const data = await apiRequest(`${USERS_URL}/me`);
        currentAdmin = data.user;

        document.getElementById("adminFullName").value = currentAdmin.fullName || "";
        document.getElementById("adminEmail").value = currentAdmin.email || "";
        document.getElementById("adminPhone").value = currentAdmin.phone || "";

        const avatar = document.getElementById("adminAvatar");
        avatar.textContent = (currentAdmin.fullName || "A").charAt(0).toUpperCase();
    } catch (error) {
        showNotice(error.message, "error");
    }
}

adminProfileForm.addEventListener("submit", async event => {
    event.preventDefault();

    const button = document.getElementById("saveProfileBtn");
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Saving...";

    const body = {
        fullName: document.getElementById("adminFullName").value.trim(),
        email: document.getElementById("adminEmail").value.trim(),
        phone: document.getElementById("adminPhone").value.trim()
    };

    try {
        const data = await apiRequest(`${USERS_URL}/me`, {
            method: "PATCH",
            body: jsonBody(body)
        });

        currentAdmin = data.user;
        showNotice(data.message || "Your profile was updated.");
        await loadAdminProfile();
        await refreshUsersIfLoaded();
    } catch (error) {
        showNotice(error.message, "error");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
});

// --------------------------------------------------
// ADMIN PASSWORD CHANGE
// --------------------------------------------------

adminPasswordForm.addEventListener("submit", async event => {
    event.preventDefault();

    const currentPassword = document.getElementById("adminCurrentPassword").value;
    const newPassword = document.getElementById("adminNewPassword").value;
    const confirmPassword = document.getElementById("adminConfirmPassword").value;

    if (newPassword.length < 8 || newPassword.length > 128) {
        showNotice("The new password must be between 8 and 128 characters.", "error");
        return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        showNotice("Include at least one letter and one number in your new password.", "error");
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotice("The new passwords do not match.", "error");
        return;
    }

    const button = document.getElementById("changeAdminPasswordBtn");
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Updating...";

    try {
        const data = await apiRequest(`${PASSWORD_URL}/change`, {
            method: "PATCH",
            body: jsonBody({ currentPassword, newPassword, confirmPassword })
        });

        showNotice(data.message || "Password changed successfully.");
        adminPasswordForm.reset();
    } catch (error) {
        showNotice(error.message, "error");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
});

// --------------------------------------------------
// USER DETAILS
// --------------------------------------------------

function addDetail(label, value) {
    const paragraph = document.createElement("p");
    const strong = document.createElement("strong");
    strong.textContent = `${label}: `;
    paragraph.appendChild(strong);
    paragraph.appendChild(document.createTextNode(
        value === undefined || value === null || value === ""
            ? "Not provided"
            : String(value)
    ));
    userDetailsContent.appendChild(paragraph);
}

async function loadUserDetails(userId) {
    try {
        const data = await apiRequest(`${USERS_URL}/${encodeURIComponent(userId)}`);
        const user = data.user;
        if (!user) throw new Error("The server did not return user details.");

        userDetailsContent.replaceChildren();
        userDialogTitle.textContent = "User Details";

        addDetail("Name", getUserName(user));
        addDetail("Email", user.email);
        addDetail("Phone", user.phone);
        addDetail("Role", user.role);
        addDetail("Email Verification", user.isVerified ? "Verified" : "Not verified");

        if (user.role === "student") {
            addDetail("Selected Course", user.selectedCourse);
            addDetail("Selected Exam", user.selectedExam || "None selected");
        }

        if (user.role === "tutor") {
            addDetail("Subject", user.subject);
            addDetail("Approval", user.isApproved ? "Approved" : user.isRejected ? "Rejected" : "Pending");
        }

        addDetail("Account Created", formatDate(user.createdAt));
        userDetailsDialog.showModal();
    } catch (error) {
        showNotice(error.message, "error");
    }
}

// --------------------------------------------------
// EDIT USER OR TUTOR DETAILS
// --------------------------------------------------

function addFormLabel(form, text, htmlFor) {
    const label = document.createElement("label");
    label.htmlFor = htmlFor;
    label.textContent = text;
    form.appendChild(label);
}

function addFormInput(form, { id, label, value = "", type = "text", required = false, maxLength }) {
    addFormLabel(form, label, id);
    const input = document.createElement("input");
    input.id = id;
    input.name = id;
    input.type = type;
    input.value = value || "";
    input.required = required;
    if (maxLength) input.maxLength = maxLength;
    form.appendChild(input);
    return input;
}

function addFormSelect(form, { id, label, value = "", options, optional = false }) {
    addFormLabel(form, label, id);
    const select = document.createElement("select");
    select.id = id;
    select.name = id;

    if (optional) {
        const none = document.createElement("option");
        none.value = "";
        none.textContent = "No exam selected";
        select.appendChild(none);
    }

    options.forEach(optionValue => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        select.appendChild(option);
    });

    select.value = value || "";
    form.appendChild(select);
    return select;
}

function openEditDialog(user) {
    if (!user || !user._id || !["student", "tutor", "admin"].includes(user.role)) {
        showNotice("Unable to edit this account.", "error");
        return;
    }

    userDetailsContent.replaceChildren();
    userDialogTitle.textContent = `Edit ${user.role} details`;

    const form = document.createElement("form");
    form.className = "admin-form dialog-form";

    addFormInput(form, {
        id: "editFullName",
        label: "Full name",
        value: user.fullName,
        required: true,
        maxLength: 100
    });

    addFormInput(form, {
        id: "editEmail",
        label: "Email address",
        value: user.email,
        type: "email",
        required: true,
        maxLength: 254
    });

    addFormInput(form, {
        id: "editPhone",
        label: "Phone number",
        value: user.phone,
        required: true,
        maxLength: 30
    });

    if (user.role === "student") {
        addFormSelect(form, {
            id: "editSelectedCourse",
            label: "Selected course",
            value: user.selectedCourse,
            options: COURSE_OPTIONS
        });

        addFormSelect(form, {
            id: "editSelectedExam",
            label: "Optional exam",
            value: user.selectedExam,
            options: EXAM_OPTIONS,
            optional: true
        });
    }

    if (user.role === "tutor") {
        addFormInput(form, {
            id: "editSubject",
            label: "Teaching subject",
            value: user.subject,
            maxLength: 120
        });
    }

    const note = document.createElement("p");
    note.className = "table-note";
    note.textContent = "Password, role, email verification, and tutor approval status cannot be changed in this form.";
    form.appendChild(note);

    const actions = document.createElement("div");
    actions.className = "dialog-actions";

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "primary-btn";
    saveButton.textContent = "Save Changes";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "refresh-btn";
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => userDetailsDialog.close());

    actions.append(saveButton, cancelButton);
    form.appendChild(actions);

    form.addEventListener("submit", async event => {
        event.preventDefault();

        const body = {
            fullName: document.getElementById("editFullName").value.trim(),
            email: document.getElementById("editEmail").value.trim(),
            phone: document.getElementById("editPhone").value.trim()
        };

        if (user.role === "student") {
            body.selectedCourse = document.getElementById("editSelectedCourse").value;
            body.selectedExam = document.getElementById("editSelectedExam").value;
        }

        if (user.role === "tutor") {
            body.subject = document.getElementById("editSubject").value.trim();
        }

        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            const endpoint = user.role === "tutor"
                ? `${API_URL}/${encodeURIComponent(user._id)}/details`
                : `${USERS_URL}/${encodeURIComponent(user._id)}`;

            const data = await apiRequest(endpoint, {
                method: "PATCH",
                body: jsonBody(body)
            });

            userDetailsDialog.close();
            showNotice(data.message || "Account details updated successfully.");

            usersLoaded = false;
            await Promise.all([loadTutors(), loadUsers()]);
        } catch (error) {
            showNotice(error.message, "error");
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save Changes";
        }
    });

    userDetailsContent.appendChild(form);
    userDetailsDialog.showModal();
}

// --------------------------------------------------
// ADMIN-INITIATED PASSWORD RESET EMAIL
// --------------------------------------------------

async function requestPasswordReset(user) {
    if (!user || !user._id) {
        showNotice("This user does not have a valid account ID.", "error");
        return;
    }

    if (!window.confirm(
        `Send a password reset email to ${user.email || "this user"}?\n\n` +
        "The link expires after 15 minutes."
    )) return;

    try {
        const data = await apiRequest(
            `${PASSWORD_URL}/admin-reset/${encodeURIComponent(user._id)}`,
            { method: "POST" }
        );
        showNotice(data.message || "Password reset email sent.");
    } catch (error) {
        showNotice(error.message, "error");
    }
}

// --------------------------------------------------
// DIALOG AND LOGOUT
// --------------------------------------------------

closeUserDetailsBtn.addEventListener("click", () => userDetailsDialog.close());

userDetailsDialog.addEventListener("click", event => {
    if (event.target === userDetailsDialog) userDetailsDialog.close();
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
    try {
        await apiRequest(`${AUTH_URL}/logout`, { method: "POST" });
        window.location.href = "/login";
    } catch (error) {
        showNotice(error.message, "error");
    }
});

// --------------------------------------------------
// INITIAL LOAD
// --------------------------------------------------

loadTutors();
