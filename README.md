# FHOBS SOLUTIONS Learning Platform

An online learning platform designed to connect students and tutors through a secure, user-friendly educational website.

The platform is being developed to simplify student registration, tutor registration, email verification, and educational account management.

## About the Project

FHOBS SOLUTIONS Learning Platform is a web development project designed to provide an online environment where students can register, tutors can apply to teach, and administrators can manage user accounts.

The project combines frontend web technologies with a Node.js backend and MongoDB database to provide a foundation for a secure and scalable educational platform.

## Project Objectives

- Create a professional educational website.
- Allow students to create accounts.
- Allow tutors to register and submit their areas of expertise.
- Implement email verification for user accounts.
- Enable administrators to approve tutor accounts.
- Store user information in a MongoDB database.
- Protect passwords and sensitive account information.
- Provide a foundation for student, tutor, and administrator dashboards.

## Features

### Website Interface
- Responsive homepage.
- Student registration page.
- Tutor registration page.
- Login page.
- Email verification page.
- User-friendly navigation.

### Student Management
- Student registration form.
- Personal information collection.
- Passport photograph upload.
- Password confirmation.
- Email verification.

### Tutor Management
- Tutor registration form.
- Subject or area of expertise.
- Passport photograph upload.
- Email verification.
- Administrator approval workflow.

### Authentication and Security
- Password hashing with bcrypt.
- Email verification tokens.
- Expiring verification links.
- Server-side validation.
- Role-based account structure.
- Private storage for uploaded passport photographs.

### Database
- MongoDB integration.
- Mongoose user model.
- Student, tutor, and administrator roles.
- Email verification status.
- Tutor approval status.
- Account security fields.

## Technologies Used

### Frontend
- HTML5
- CSS3
- JavaScript

### Backend
- Node.js
- Express.js

### Database
- MongoDB
- Mongoose

### Authentication and Security
- bcryptjs
- JSON Web Token (JWT)
- dotenv

### Email and File Uploads
- Nodemailer
- Brevo SMTP
- Multer

### Development Tools
- Visual Studio Code
- Git
- GitHub
- Postman

## Project Structure


fhobs-learning-platform/
├── config/
│   ├── db.js
│   └── mailer.js
├── controller/
│   └── authController.js
├── middleware/
│   └── uploadMiddleware.js
├── models/
│   └── user.js
├── route/
│   └── authRoute.js
├── public/
│   ├── index.html
│   ├── register.html
│   ├── tutor-register.html
│   ├── login.html
│   ├── verify-email.html
│   ├── css/
│   └── js/
├── private-uploads/
├── .env
├── .gitignore
├── package.json
└── server.js
