# Aether Chat Backend (Node + Express)

This backend powers the real‑time chat application, handling authentication, message routing via Socket.io, and email notifications through Brevo. It follows a secure, premium‑grade architecture with robust rate‑limiting and input sanitisation.

## 📦 Technology Stack

- **Node.js** with **Express**
- **MongoDB** (Mongoose) for data persistence
- **Socket.io** for real‑time bi‑directional communication
- **JWT** for stateless authentication
- **Bcrypt** for password hashing
- **Brevo (Sendinblue)** for transactional emails (now sends to the actual user email)
- **Arcjet** for WAF and rate‑limiting protection
- **E2EE Backup & Recovery**: Backend schema and auth endpoints updated to store and serve `encryptedPrivateKey`, `privateKeyIv`, and `passwordSalt` securely to allow clients to recover Web Crypto private keys on storage clearance.

## ⚙️ Environment Variables

Create a `backend/.env` file (see `backend/.env.example`) and configure:
```
PORT=3000
MONGO_URL=your_mongodb_uri
JWT_SECRET=your_jwt_secret
BREVO_API_KEY=your_brevo_api_key
VERIFIED_EMAIL=your_verified_email@example.com
CLIENT_URL=http://localhost:5173
```

## 🚀 Running the Backend

```bash
cd backend
npm install
npm run dev   # Starts the server on PORT (default 3000)
```

In production, build the frontend assets and start the backend with:
```bash
npm start
```

## 📧 Email Sending

The `sendWelcomeEmail` function now directly uses the user's email address, removing the sandbox fallback. Ensure your Brevo account is active and the API key is valid.

---
