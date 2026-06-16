import axios from "axios";

let API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1") {
        API_URL = API_URL.replace("localhost", hostname).replace("127.0.0.1", hostname);
    }
}

export const axiosInstance = axios.create({
    baseURL: `${API_URL}/api`,
    withCredentials: true,
})