# ChatApp Frontend (React + Vite PWA)

This frontend implements a premium glassmorphism user interface for the real‑time secure chat application, built with React, Vite, TailwindCSS, and custom design tokens.

## 📱 Progressive Web App (PWA) Features

### 1. Offline Database Caching (IndexedDB Version 2)
The client upgrades the local database (`aether-e2ee-db`) to Version `2` to register key-value cache stores:
- `key-store`: Secure storage for the client's E2EE Private Key.
- `chats-cache`: Stores offline copies of conversation lists and active group structures.
- `messages-cache`: Holds the last 50 encrypted messages of active channels to preserve local storage limits.
- `outgoing-queue`: Stores outbox items enqueued when offline.

### 2. Outbox Synchronization Pipeline
When network connection drops:
- **Redirection**: Send triggers are intercepted and written to `outgoing-queue` locally.
- **Pending Display**: Message bubbles render a grey spinning clock indicator for queued items.
- **Sequential Sync (Series Execution)**: Once online, the app flushes outbox items sequentially using a `for...of` loop rather than a parallel Promise call. This guarantees recipient timeline ordering is preserved.
- **Auth Guard**: Sync runs `checkAuth` before flushing. If the user session cookie has expired, syncing pauses and alerts the user to log in first.
- **Error Capture & Manual Retry**: Retries are capped at `5` for connection dropouts. If a server error (e.g. 400 Bad Request) occurs, the message is marked as failed, retries stop, and the bubble displays a red `(!)` indicator. Users can click this indicator to retry sending manually.

---

## 🔒 Cryptographic Key Backup & Recovery
- **Password-Derived Key**: Generates a 256-bit Key Encryption Key (KEK) using Web Crypto's **PBKDF2** with **600,000 iterations**, SHA-256, and a unique 16-byte salt fetched from the server.
- **Automated Backup**: Automatically encrypts (AES-GCM) and uploads private key keys to the server database during registration.
- **Key Recovery Prompt**: If a browser engine or embedded container (like Lenovo Vantage) wipes IndexedDB, the app intercepts the key loss, blocks the interface with a premium glassmorphic modal, and prompts users for their login credentials to securely restore E2EE access.

---

## 🛠️ Build and Development Scripts

Start the local development server:
```bash
npm run dev
```

Compile and build production assets (statically cached by PWA service workers via `vite-plugin-pwa`):
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```
