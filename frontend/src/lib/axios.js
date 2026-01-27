import axios from "axios";

// Use environment variable for API URL
// In development: http://localhost:3000
// In production: https://chat-app-backend-536w.onrender.com
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export const axiosInstance = axios.create({
    baseURL: `${API_URL}/api`,
    withCredentials: true,
})