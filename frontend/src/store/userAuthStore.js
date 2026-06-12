import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import { io } from "socket.io-client";
import { playOnlineSound, playOfflineSound } from "../lib/soundUtils";
import toast from "react-hot-toast";
import { 
    generateE2EEKeyPair, getPrivateKey, clearPrivateKey, clearGroupKeys,
    encryptPrivateKeyWithPassword, decryptPrivateKeyWithPassword
} from "../lib/cryptoUtils";

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
    needsRecovery: false,
    dismissedRecovery: false,

    checkAuth: async () => {
        try {
            const res = await axiosInstance.get("/auth/check");
            set({ authUser: res.data })
            get().connectSocket();
            await get().syncE2EEKeys();
            get().subscribeToPushNotifications();
        } catch (error) {
            if (error.response?.status !== 401) {
                console.log("Error in authCheck:", error);
            }
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
            let backupFields = {};
            try {
                publicKeyJwk = await generateE2EEKeyPair();
                const privateKey = await getPrivateKey();
                if (privateKey) {
                    backupFields = await encryptPrivateKeyWithPassword(privateKey, data.password);
                }
            } catch (err) {
                console.error("Failed to generate E2EE keys during signup:", err);
            }

            const payload = { ...data, ...backupFields };
            if (publicKeyJwk) {
                payload.publicKey = publicKeyJwk;
            }

            const res = await axiosInstance.post("/auth/signup", payload);
            set({ authUser: res.data });

            toast.success("Account created successfully!");
            get().connectSocket();
            get().subscribeToPushNotifications();
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
            await get().syncE2EEKeys(data.password);
            get().subscribeToPushNotifications();
        } catch (error) {
            toast.error(getErrorMessage(error, "Login failed"));
        } finally {
            set({ isLoggingIn: false });
        }
    },

    logout: async () => {
        try {
            // Attempt to notify server and unsubscribe from push notifications, but do not block logout if SW hangs or API fails
            try {
                if ('serviceWorker' in navigator && 'PushManager' in window) {
                    const registration = await Promise.race([
                        navigator.serviceWorker.ready,
                        new Promise((_, reject) => setTimeout(() => reject(new Error("SW ready timeout")), 1000))
                    ]);
                    const subscription = await registration.pushManager.getSubscription();
                    if (subscription) {
                        await axiosInstance.post("/push/unsubscribe", { endpoint: subscription.endpoint });
                        await subscription.unsubscribe();
                        console.log("Successfully unsubscribed from push notifications on logout.");
                    }
                }
            } catch (pushErr) {
                console.warn("Could not unsubscribe from push during logout:", pushErr.message);
            }

            try {
                await axiosInstance.post("/auth/logout");
            } catch (apiErr) {
                console.warn("Server logout API failed:", apiErr);
            }
        } finally {
            // ALWAYS clear local state and log out locally even if API or SW calls failed
            set({ authUser: null, dismissedRecovery: false, needsRecovery: false });
            toast.success("Logged out successfully");
            get().disconnectSocket();
            try {
                await clearPrivateKey();
                await clearGroupKeys();
            } catch (dbErr) {
                console.error("Failed to clear E2EE keys on logout:", dbErr);
            }
        }
    },

    subscribeToPushNotifications: async () => {
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
                console.warn("Push notifications are not supported in this browser.");
                return;
            }

            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    console.log("Push notification permission denied.");
                    return;
                }
            } else if (Notification.permission === 'denied') {
                console.log("Push notification permission is blocked in browser settings.");
                return;
            }

            const registration = await navigator.serviceWorker.ready;
            const keyRes = await axiosInstance.get("/push/key");
            const vapidPublicKey = keyRes.data.publicKey;

            const urlBase64ToUint8Array = (base64String) => {
                const padding = '='.repeat((4 - base64String.length % 4) % 4);
                const base64 = (base64String + padding)
                    .replace(/\-/g, '+')
                    .replace(/_/g, '/');
                const rawData = window.atob(base64);
                const outputArray = new Uint8Array(rawData.length);
                for (let i = 0; i < rawData.length; ++i) {
                    outputArray[i] = rawData.charCodeAt(i);
                }
                return outputArray;
            };

            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            await axiosInstance.post("/push/subscribe", { subscription });
            console.log("Successfully subscribed to background push notifications.");
        } catch (error) {
            console.error("Failed to subscribe to push notifications:", error);
        }
    },

    syncE2EEKeys: async (password = null) => {
        set({ needsRecovery: false, dismissedRecovery: false });
    },

    recoverPrivateKey: async (password) => {
        set({ needsRecovery: false, dismissedRecovery: false });
        return true;
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