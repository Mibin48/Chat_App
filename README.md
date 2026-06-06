# ChatApp - Real-Time Secure Chat Application

A modern, real-time secure chat application featuring rich messaging features, file sharing, profile updates, and advanced security configurations. The project is split into a React (Vite) frontend and a Node.js (Express) backend.

## 🚀 Features

### 💬 Real-Time Chat & Messaging
- **Instant Messaging**: Real-time communication powered by **Socket.io**.
- **Typing Indicators**: Displays real-time typing indicators (`is typing...`) for active users.
- **Read Receipts**: Tracks and shows when messages are read by the recipient.
- **Message Operations**: Supports editing and deleting sent messages in real-time.
- **Emoji Reactions**: React to messages with emojis.
- **Message Search**: Search through chat logs by text queries.

### 📁 Media & Profile Management
- **File Uploads**: Share images and documents over chat, uploaded and stored securely on **Cloudinary**.
- **Profile Customization**: Update profile pictures and full name.
- **Status Presence**: Set custom status text and emojis (e.g. 💻 Working, 😴 Sleeping).

### 🔒 Enterprise-Grade Security
- **WAF / Intrusion Shield**: **Arcjet Shield** active in live mode to protect endpoints from common attacks (SQLi, XSS, etc.).
- **Rate Limiting**: Sliding window rate limits applied globally using Arcjet to prevent brute-force attacks.
- **Bot Protection**: Automated detection and block rules for scrapers, crawlers, and spoofed bots.
- **Header Security**: HTTP response headers secured using **Helmet** (excluding Content Security Policy to allow static resource loading).
- **NoSQL Injection Guard**: User inputs sanitized using **Express Mongo Sanitize** to intercept malicious MongoDB query operators.
- **HttpOnly Cookies**: Session tokens (JWTs) are issued inside `httpOnly`, `sameSite`, and `secure` scoped cookies to prevent XSS-based token theft.
- **Secure Logout**: Cross-site cookie configurations explicitly removed during user logout to ensure session destruction.

---

## 🛠️ Technology Stack

- **Frontend**: React, Vite, Axios, TailwindCSS, Lucide Icons, Socket.io-client. *(Glassmorphism UI, premium design)*
- **Backend**: Node.js, Express, MongoDB (Mongoose), Socket.io, JWT, Bcrypt. *(Email sends to actual user email)*
- **Email Service**: Brevo (Sendinblue) now uses the signed‑up user's email address directly.
- **Cloud Integrations**: Cloudinary (Media storage), Resend (Transactional emails), Arcjet (Security API).

---

## ⚙️ Project Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB Database (Atlas or local instance)
- Accounts with Cloudinary, Resend, and Arcjet (site key)

### Installation
1. Clone the repository and install dependencies at the root directory:
   ```bash
   npm run build
   ```
   *This command runs installation scripts for both the `backend` and `frontend` sub-folders, and generates the production assets for the frontend.*

### Environment Variables
Configure environment variables by duplicating the example templates in each directory.

#### 1. Backend Config
Create a `backend/.env` file based on [backend/.env.example](file:///d:/Projects/ChatApp/backend/.env.example):
```env
PORT=3000
MONGO_URL=your_mongodb_connection_string
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key
BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM=onboarding@resend.dev
EMAIL_FROM_NAME=YourName
VERIFIED_EMAIL=your_email@example.com
CLIENT_URL=http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
ARCJET_KEY=your_arcjet_api_key
ARCJET_ENV=development
```

#### 2. Frontend Config
Create a `frontend/.env.development` and `frontend/.env.production` based on [frontend/.env.example](file:///d:/Projects/ChatApp/frontend/.env.example):
```env
VITE_API_URL=http://localhost:3000
```

---

## 🏃 Running the Application

### Development Mode
To run both backend and frontend servers concurrently for local development:

1. **Start Backend Server**:
   ```bash
   cd backend
   npm run dev
   ```
2. **Start Frontend Server**:
   ```bash
   cd frontend
   npm run dev
   ```

### Production Mode
1. Compile and build the frontend assets:
   ```bash
   npm run build
   ```
2. Start the backend production server (which serves the built React assets statically):
   ```bash
   npm start
   ```
