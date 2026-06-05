import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { userAuthStore } from "./userAuthStore";

const playNotificationChime = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        const playChime = (time, pitch) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = "sine";
            osc.frequency.setValueAtTime(pitch, time);
            
            gain.gain.setValueAtTime(0.08, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
            
            osc.start(time);
            osc.stop(time + 0.3);
        };
        
        const now = ctx.currentTime;
        playChime(now, 587.33); // D5
        playChime(now + 0.08, 880); // A5
    } catch (e) {
        console.error("Failed to play notification sound:", e);
    }
};

const getErrorMessage = (error, defaultMsg = "Something went wrong") => {
    return error.response?.data?.message || error.response?.data?.error || error.message || defaultMsg;
};

export const userChatStore = create((set, get) => ({
    allContacts: [],
    chats: [],
    messages: [],
    activeTab: "chats",
    selectedUser: null,
    isUsersLoading: false,
    isMessagesLoading: false,
    isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,

    toggleSound: () => {
        localStorage.setItem("isSoundEnabled", !get().isSoundEnabled)
        set({ isSoundEnabled: !get().isSoundEnabled })
    },

    setActiveTab: (tab) => set({ activeTab: tab }),
    setSelectedUser: (selectedUser) => {
        set({ selectedUser });
        if (selectedUser) {
            set({
                chats: get().chats.map(c =>
                    c._id === selectedUser._id ? { ...c, unreadCount: 0 } : c
                )
            });
            get().markMessagesAsRead(selectedUser._id);
        }
    },

    getAllContacts: async () => {
        set({ isUsersLoading: true });
        try {
            const res = await axiosInstance.get("/messages/contacts");
            set({ allContacts: res.data });
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to load contacts"));
        } finally {
            set({ isUsersLoading: false });
        }
    },

    getMyChatPartners: async () => {
        set({ isUsersLoading: true });
        try {
            const res = await axiosInstance.get("/messages/chats");
            set({ chats: res.data });
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to load chats"));
        } finally {
            set({ isUsersLoading: false });
        }
    },
    getMessagesByUserId: async (userId) => {
        set({ isMessagesLoading: true });
        try {
            const res = await axiosInstance.get(`/messages/${userId}`);
            set({ messages: res.data });
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to load messages"));
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    sendMessage: async (messageData) => {
        const { selectedUser, messages } = get();
        const { authUser } = userAuthStore.getState();

        const tempId = `temp-${Date.now()}`;

        const optimisticMessage = {
            _id: tempId,
            senderId: authUser._id,
            recieverId: selectedUser._id,
            text: messageData.text,
            image: messageData.image,
            createdAt: new Date().toISOString(),
            isOptimistic: true, // flag to identify optimistic messages (optional)
        };
        // immediately update the ui by adding the message
        set({ messages: [...messages, optimisticMessage] });

        try {
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
            set({ messages: messages.concat(res.data) });
            get().getMyChatPartners();
        } catch (error) {
            // remove optimistic message on failure
            set({ messages: messages });
            toast.error(getErrorMessage(error, "Failed to send message"));
        }
    },
    subscribeToMessages: () => {
        const socket = userAuthStore.getState().socket;
        if (!socket) return;

        socket.off("newMessage");

        socket.on("newMessage", (newMessage) => {
            const { selectedUser, isSoundEnabled, chats } = get();
            const { authUser } = userAuthStore.getState();

            // Ignore messages sent by ourselves
            if (newMessage.senderId === authUser._id) return;

            const isMessageSentFromSelectedUser = selectedUser && newMessage.senderId === selectedUser._id;

            if (isMessageSentFromSelectedUser) {
                set({
                    messages: [...get().messages, newMessage],
                });
                get().markMessagesAsRead(selectedUser._id);
            } else {
                // Play notification chime if enabled
                if (isSoundEnabled) {
                    playNotificationChime();
                }

                // Increment unread count locally for this sender in chats list
                set({
                    chats: chats.map(c =>
                        c._id === newMessage.senderId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
                    )
                });

                // If sender is not in the chats list yet, reload chat partners
                const chatExists = chats.some(c => c._id === newMessage.senderId);
                if (!chatExists) {
                    get().getMyChatPartners();
                }
            }
        });
    },

    unsubscribeFromMessages: () => {
        const socket = userAuthStore.getState().socket;
        socket?.off("newMessage");
    },

    // Typing Indicator Logic
    isTyping: false,

    sendTyping: () => {
        const { selectedUser } = get();
        const socket = userAuthStore.getState().socket;
        if (!selectedUser || !socket) return;

        socket.emit("typing", selectedUser._id);
    },

    sendStopTyping: () => {
        const { selectedUser } = get();
        const socket = userAuthStore.getState().socket;
        if (!selectedUser || !socket) return;

        socket.emit("stopTyping", selectedUser._id);
    },

    subscribeToTypingEvents: () => {
        const socket = userAuthStore.getState().socket;
        if (!socket) return;

        socket.on("typing", (senderId) => {
            const { selectedUser } = get();
            if (selectedUser && selectedUser._id === senderId) {
                set({ isTyping: true });
            }
        });

        socket.on("stopTyping", (senderId) => {
            const { selectedUser } = get();
            if (selectedUser && selectedUser._id === senderId) {
                set({ isTyping: false });
            }
        });
    },

    unsubscribeFromTypingEvents: () => {
        const socket = userAuthStore.getState().socket;
        if (socket) {
            socket.off("typing");
            socket.off("stopTyping");
        }
    },

    deleteMessage: async (messageId) => {
        const { messages } = get();
        try {
            await axiosInstance.delete(`/messages/${messageId}`);
            set({ messages: messages.filter(m => m._id !== messageId) });
            toast.success("Message deleted");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to delete message"));
        }
    },

    subscribeToDeleteEvents: () => {
        const socket = userAuthStore.getState().socket;
        socket?.on("deleteMessage", (messageId) => {
            const { messages } = get();
            set({ messages: messages.filter(m => m._id !== messageId) });
        });
    },

    unsubscribeFromDeleteEvents: () => {
        const socket = userAuthStore.getState().socket;
        socket?.off("deleteMessage");
    },

    // Add reaction to message
    addReaction: async (messageId, emoji) => {
        try {
            const res = await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
            const { messages } = get();
            const updatedMessages = messages.map(msg =>
                msg._id === messageId ? res.data : msg
            );
            set({ messages: updatedMessages });
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to add reaction"));
        }
    },

    subscribeToReactionEvents: () => {
        const socket = userAuthStore.getState().socket;
        socket?.on("messageReaction", ({ messageId, reactions }) => {
            const { messages } = get();
            const updatedMessages = messages.map(msg =>
                msg._id === messageId ? { ...msg, reactions } : msg
            );
            set({ messages: updatedMessages });
        });
    },

    unsubscribeFromReactionEvents: () => {
        const socket = userAuthStore.getState().socket;
        socket?.off("messageReaction");
    },

    // Mark messages as read
    markMessagesAsRead: async (userId) => {
        try {
            await axiosInstance.post(`/messages/read/${userId}`);
        } catch (error) {
            console.error("Failed to mark messages as read:", error);
        }
    },

    subscribeToReadEvents: () => {
        const socket = userAuthStore.getState().socket;
        socket?.on("messageRead", ({ messageId, readBy, readAt }) => {
            const { messages } = get();
            const updatedMessages = messages.map(msg => {
                if (msg._id === messageId) {
                    return {
                        ...msg,
                        readBy: [...(msg.readBy || []), { userId: readBy, readAt }]
                    };
                }
                return msg;
            });
            set({ messages: updatedMessages });
        });
    },

    unsubscribeFromReadEvents: () => {
        const socket = userAuthStore.getState().socket;
        socket?.off("messageRead");
    },

    // Edit message
    editMessage: async (messageId, text) => {
        try {
            const res = await axiosInstance.put(`/messages/${messageId}/edit`, { text });
            const { messages } = get();
            const updatedMessages = messages.map(msg =>
                msg._id === messageId ? res.data : msg
            );
            set({ messages: updatedMessages });
            toast.success("Message edited");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to edit message"));
        }
    },

    subscribeToEditEvents: () => {
        const socket = userAuthStore.getState().socket;
        socket?.on("messageEdited", (editedMessage) => {
            const { messages } = get();
            const updatedMessages = messages.map(msg =>
                msg._id === editedMessage._id ? editedMessage : msg
            );
            set({ messages: updatedMessages });
        });
    },

    unsubscribeFromEditEvents: () => {
        const socket = userAuthStore.getState().socket;
        socket?.off("messageEdited");
    },

    // Upload file
    uploadFile: async (file) => {
        const { selectedUser } = get();
        try {
            const res = await axiosInstance.post(`/messages/upload/${selectedUser._id}`, { file });
            set({ messages: [...get().messages, res.data] });
            get().getMyChatPartners();
            toast.success("File sent");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to upload file"));
        }
    },

    // Send audio message
    sendAudio: async (audioData, duration) => {
        const { selectedUser, messages } = get();
        try {
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, {
                audioUrl: audioData,
                audioDuration: duration
            });
            set({ messages: [...messages, res.data] });
            get().getMyChatPartners();
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to send audio"));
        }
    },

    // Search messages
    searchMessages: async (query, userId) => {
        try {
            const params = { query };
            if (userId) params.userId = userId;
            const res = await axiosInstance.get('/messages/search', { params });
            return res.data;
        } catch (error) {
            toast.error(getErrorMessage(error, "Search failed"));
            return [];
        }
    },
}));

