# Job Portal

Job Portal is a **MERN Stack-based web application** designed to streamline the job application process. The platform provides separate roles for **Applicants** and **Recruiters**, with secure authentication and role-based access.

The application uses **JWT-based authentication** to protect REST APIs and maintain secure user sessions.

## Features

### Recruiter
- Create, update, and delete job postings
- View and manage job applications
- Shortlist, accept, or reject applications
- View applicant resumes
- Edit profile

### Applicant
- Browse available jobs
- Search jobs using fuzzy search and filters
- Apply for jobs with an SOP
- Track submitted applications
- Upload profile picture
- Upload resume
- Edit profile

## Tech Stack

- **Frontend:** React.js
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Authentication:** JWT
- **APIs:** REST APIs

## Project Structure

```text
Job-Portal/
├── backend/
│   └── public/
│       ├── profile/
│       └── resume/
├── frontend/
└── README.md
```

## Getting Started

### Prerequisites

Make sure the following are installed on your machine:

- Node.js
- MongoDB
- npm

### 1. Start MongoDB

```bash
sudo service mongod start
```

### 2. Setup Backend

Navigate to the backend directory:

```bash
cd backend
```

Install the backend dependencies:

```bash
npm install
```

Start the Express server:

```bash
npm start
```

The backend server will run on:

```text
http://localhost:4444
```

### 3. Setup Frontend

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install the frontend dependencies:

```bash
npm install
```

Start the frontend development server:

```bash
npm start
```

The frontend will run on:

```text
http://localhost:3000
```

Open **http://localhost:3000** in your browser and create an account as an Applicant or Recruiter to start using the application.

## Dependencies

### Frontend

- @material-ui/core
- @material-ui/icons
- @material-ui/lab
- axios
- material-ui-chip-input
- react-phone-input-2

### Backend

- bcrypt
- body-parser
- connect-flash
- connect-mongo
- cors
- crypto
- express
- express-session
- jsonwebtoken
- mongoose
- mongoose-type-email
- multer
- passport
- passport-jwt
- passport-local
- uuid

## Machine Specifications

The application was tested on the following environment:

- **Operating System:** Elementary OS 5.1 (Hera)
- **Terminal:** Bash
- **Processor:** Intel Core i7-8750H @ 2.20 GHz
- **RAM:** 16 GB