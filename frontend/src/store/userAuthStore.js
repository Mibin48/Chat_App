import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { io } from "socket.io-client";
import { playOnlineSound, playOfflineSound } from "../lib/soundUtils";
import toast from "react-hot-toast";
import { generateE2EEKeyPair, getPrivateKey, clearPrivateKey, clearGroupKeys } from "../lib/cryptoUtils";

// Use environment variable for Socket.io connection
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Helper to safely extract error messages
const getErrorMessage = (error, defaultMsg = "Something went wrong") => {
    return error.response?.data?.message || error.response?.data?.error || error.message || defaultMsg;
};

export const userAuthStore = create((set, get) => ({
    authUser: null,
    isLoggingIn: false,
    onlineUsers: [],
    isSigningUp: false,
    isCheckingAuth: true,
    isDeletingAccount: false,
    socket: null,

    checkAuth: async () => {
        try {
            const res = await axiosInstance.get("/auth/check");
            set({ authUser: res.data })
            get().connectSocket();
            await get().syncE2EEKeys();
        } catch (error) {
            console.log("Error in authCheck:", error);
            set({ authUser: null });
        }
        finally {
            set({ isCheckingAuth: false });
        }
    },

    signup: async (data) => {
        set({ isSigningUp: true })
        try {
            // Generate E2EE keys locally before signup
            let publicKeyJwk = null;
            try {
                publicKeyJwk = await generateE2EEKeyPair();
            } catch (err) {
                console.error("Failed to generate E2EE keys during signup:", err);
            }

            const payload = { ...data };
            if (publicKeyJwk) {
                payload.publicKey = publicKeyJwk;
            }

            const res = await axiosInstance.post("/auth/signup", payload);
            set({ authUser: res.data });

            toast.success("Account created successfully!");
            get().connectSocket();
        }
        catch (error) {
            toast.error(getErrorMessage(error, "Failed to create account"));
        }
        finally {
            set({ isSigningUp: false })
        }
    },

    login: async (data) => {
        set({ isLoggingIn: true });
        try {
            const res = await axiosInstance.post("/auth/login", data);
            set({ authUser: res.data });
            toast.success("Logged in successfully");
            get().connectSocket();
            await get().syncE2EEKeys();
        } catch (error) {
            toast.error(getErrorMessage(error, "Login failed"));
        } finally {
            set({ isLoggingIn: false });
        }
    },

    logout: async () => {
        try {
            await axiosInstance.post("/auth/logout");
            set({ authUser: null });
            toast.success("Logged out successfully");
            get().disconnectSocket();
            await clearPrivateKey();
            await clearGroupKeys();
        } catch (error) {
            toast.error(getErrorMessage(error, "Logout failed"));
        }
    },

    syncE2EEKeys: async () => {
        const { authUser } = get();
        if (!authUser) return;

        try {
            const privateKey = await getPrivateKey();
            if (!privateKey || !authUser.publicKey) {
                console.log("[E2EE] Syncing keys: generating a new keypair...");
                const publicKeyJwk = await generateE2EEKeyPair();
                const res = await axiosInstance.put("/auth/update-public-key", {
                    publicKey: publicKeyJwk
                });
                set({ authUser: res.data });
                console.log("[E2EE] Keys successfully generated and synced with database.");
            } else {
                console.log("[E2EE] Keys verified: client is ready.");
            }
        } catch (error) {
            console.error("[E2EE] Key sync failed:", error);
        }
    },
    updateProfile: async (data) => {
        try {
            const res = await axiosInstance.put("auth/update-profile", data)
            set({ authUser: res.data })
            toast.success("Profile Updated Successfully");
        } catch (error) {
            console.log("Error in Updating the profile:", error);
            toast.error(getErrorMessage(error, "Failed to update profile"));
        }
    },

    updateStatus: async (customStatus, statusEmoji) => {
        try {
            const res = await axiosInstance.put("/auth/update-status", { customStatus, statusEmoji });
            set({ authUser: res.data });
            toast.success("Status updated");
        } catch (error) {
            console.log("Error updating status:", error);
            toast.error(getErrorMessage(error, "Failed to update status"));
        }
    },

    deleteAccount: async () => {
        set({ isDeletingAccount: true });
        try {
            await axiosInstance.delete("/auth/delete-account");
            set({ authUser: null });
            get().disconnectSocket();
            toast.success("Your account has been permanently deleted.");
            return true;
        } catch (error) {
            console.error("Error in deleteAccount:", error);
            toast.error(getErrorMessage(error, "Failed to delete account. Please try again."));
            return false;
        } finally {
            set({ isDeletingAccount: false });
        }
    },

    connectSocket: () => {
        const { authUser } = get();
        if (!authUser || get().socket?.connected) return;

        const socket = io(BASE_URL, {
            withCredentials: true, // this ensures cookies are sent with the connection
            transports: ["websocket"],
        });

        socket.connect();

        set({ socket });

        // listen for online users event
        socket.on("getOnlineUsers", (userIds) => {
            const prevOnlineCount = get().onlineUsers.length;
            const newOnlineCount = userIds.length;
            if (prevOnlineCount > 0) {
                if (newOnlineCount > prevOnlineCount) {
                    playOnlineSound();
                } else if (newOnlineCount < prevOnlineCount) {
                    playOfflineSound();
                }
            }
            set({ onlineUsers: userIds });
        });
    },

    disconnectSocket: () => {
        if (get().socket?.connected) get().socket.disconnect();
    },
}));