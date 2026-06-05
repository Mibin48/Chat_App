import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from "react-router";

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
