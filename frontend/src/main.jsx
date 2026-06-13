import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from "react-router";

// Auto-unregister stale service worker in development mode to avoid caching/interception issues
if (import.meta.env.DEV) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('[Dev SW] Unregistered stale service worker to prevent cache interference.');
            window.location.reload();
          }
        });
      }
    });
  }
}

// Apply saved theme before first paint (prevents flash)
const savedTheme = localStorage.getItem("aether-theme");
const systemLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
const initialTheme = savedTheme || (systemLight ? "amethyst" : "dark");
document.documentElement.setAttribute("data-theme", initialTheme);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
