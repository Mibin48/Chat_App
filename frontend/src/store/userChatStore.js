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

// ─── Theme helpers ────────────────────────────────────────
const THEMES = ["dark", "midnight", "amethyst"];
const THEME_NAMES = { dark: "Aether Dark", midnight: "Midnight", amethyst: "Amethyst" };

const getInitialTheme = () => {
    const saved = localStorage.getItem("aether-theme");
    if (saved && THEMES.includes(saved)) return saved;
    // Fallback: check system light preference
    if (window.matchMedia?.("(prefers-color-scheme: light)").matches) return "amethyst";
    return "dark";
};

const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        const colors = { dark: "#07071a", midnight: "#000000", amethyst: "#f4f4fa" };
        meta.setAttribute("content", colors[theme] || "#07071a");
    }
};

export const userChatStore = create((set, get) => ({
    allContacts: [],
    chats: [],
    groups: [],
    messages: [],
    activeTab: "chats",
    selectedUser: null,
    activeGroup: null,
    isUsersLoading: false,
    isGroupsLoading: false,
    isMessagesLoading: false,
    isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) === true,
    showSearch: false,
    showInfoPanel: false,
    sidebarSearchQuery: "",
    groupReadTimestamps: JSON.parse(localStorage.getItem("aether-group-read-timestamps")) || {},
    groupTypingUsers: {}, // { [groupId]: [userIds] }
    uploadProgress: null,
    activePreviewFile: null,
    starredMessages: [],

    // ─── Theme State ───────────────────────────────────────
    theme: getInitialTheme(),
    themes: THEMES,
    themeNames: THEME_NAMES,

    setTheme: (theme) => {
        if (!THEMES.includes(theme)) return;
        localStorage.setItem("aether-theme", theme);
        applyTheme(theme);
        set({ theme });
    },

    cycleTheme: () => {
        const { theme } = get();
        const idx = THEMES.indexOf(theme);
        const next = THEMES[(idx + 1) % THEMES.length];
        get().setTheme(next);
    },
    // ──────────────────────────────────────────────────────

    toggleSound: () => {
        localStorage.setItem("isSoundEnabled", !get().isSoundEnabled)
        set({ isSoundEnabled: !get().isSoundEnabled })
    },

    setActiveTab: (tab) => set({ activeTab: tab }),
    setShowSearch: (showSearch) => set({ showSearch, showInfoPanel: showSearch ? false : get().showInfoPanel }),
    setShowInfoPanel: (showInfoPanel) => set({ showInfoPanel, showSearch: showInfoPanel ? false : get().showSearch }),
    setSidebarSearchQuery: (sidebarSearchQuery) => set({ sidebarSearchQuery }),
    setActivePreviewFile: (activePreviewFile) => set({ activePreviewFile }),
    
    setSelectedUser: (selectedUser) => {
        set({ selectedUser, activeGroup: null, showSearch: false, showInfoPanel: false, sidebarSearchQuery: "", isTyping: false });
        if (selectedUser) {
            set({
                chats: get().chats.map(c =>
                    c._id === selectedUser._id ? { ...c, unreadCount: 0 } : c
                )
            });
            get().markMessagesAsRead(selectedUser._id);
        }
    },

    setSelectedGroup: (activeGroup) => {
        set({ activeGroup, selectedUser: null, showSearch: false, showInfoPanel: false, sidebarSearchQuery: "" });
        if (activeGroup) {
            get().getGroupMessages(activeGroup._id);
            get().markGroupAsRead(activeGroup._id);
            const socket = userAuthStore.getState().socket;
            if (socket) {
                socket.emit("join_groups", [activeGroup._id]);
            }
        }
    },

    markGroupAsRead: (groupId) => {
        const timestamps = { ...get().groupReadTimestamps, [groupId]: new Date().toISOString() };
        localStorage.setItem("aether-group-read-timestamps", JSON.stringify(timestamps));
        set({
            groupReadTimestamps: timestamps,
            groups: get().groups.map(g => g._id === groupId ? { ...g, unreadCount: 0 } : g)
        });
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

    getGroups: async () => {
        set({ isGroupsLoading: true });
        try {
            const res = await axiosInstance.get("/groups");
            const groups = res.data;
            const { groupReadTimestamps } = get();
            const { authUser } = userAuthStore.getState();

            const updatedGroups = groups.map(g => {
                const lastRead = groupReadTimestamps[g._id] || 0;
                const hasNew = g.lastMessage && 
                                new Date(g.lastMessage.createdAt) > new Date(lastRead) && 
                                g.lastMessage.senderId?._id !== authUser._id &&
                                g.lastMessage.senderId !== authUser._id;
                return {
                    ...g,
                    unreadCount: hasNew ? 1 : 0
                };
            });

            set({ groups: updatedGroups });

            const socket = userAuthStore.getState().socket;
            if (socket && groups.length > 0) {
                socket.emit("join_groups", groups.map(g => g._id));
            }
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to load groups"));
        } finally {
            set({ isGroupsLoading: false });
        }
    },

    createGroup: async (groupData) => {
        try {
            const res = await axiosInstance.post("/groups", groupData);
            const newGroup = res.data;
            set({
                groups: [newGroup, ...get().groups]
            });
            get().setSelectedGroup(newGroup);
            toast.success("Group created successfully");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to create group"));
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

    getGroupMessages: async (groupId) => {
        set({ isMessagesLoading: true });
        try {
            const res = await axiosInstance.get(`/groups/${groupId}/messages`);
            set({ messages: res.data });
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to load group messages"));
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
            isOptimistic: true,
        };
        set({ messages: [...messages, optimisticMessage] });

        try {
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
            set({ messages: messages.concat(res.data) });
            get().getMyChatPartners();
        } catch (error) {
            set({ messages: messages });
            toast.error(getErrorMessage(error, "Failed to send message"));
        }
    },

    sendGroupMessage: async (messageData) => {
        const { activeGroup, messages } = get();
        const { authUser } = userAuthStore.getState();
        if (!activeGroup) return;

        const tempId = `temp-${Date.now()}`;
        const optimisticMessage = {
            _id: tempId,
            senderId: {
                _id: authUser._id,
                fullName: authUser.fullName,
                profilePic: authUser.profilePic
            },
            groupId: activeGroup._id,
            text: messageData.text,
            image: messageData.image,
            createdAt: new Date().toISOString(),
            isOptimistic: true,
        };

        set({ messages: [...messages, optimisticMessage] });

        try {
            const res = await axiosInstance.post(`/groups/${activeGroup._id}/messages`, messageData);
            set({ messages: messages.concat(res.data) });
            get().getGroups();
        } catch (error) {
            set({ messages: messages });
            toast.error(getErrorMessage(error, "Failed to send message"));
        }
    },

    subscribeToMessages: () => {
        const socket = userAuthStore.getState().socket;
        if (!socket) return;

        socket.off("newMessage");
        socket.off("newGroupMessage");
        socket.off("join_new_group");
        socket.off("messagePinStatus");
        socket.off("groupUpdated");
        socket.off("removedFromGroup");

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
                if (isSoundEnabled) {
                    playNotificationChime();
                }

                set({
                    chats: chats.map(c =>
                        c._id === newMessage.senderId ? { ...c, unreadCount: (c.unreadCount || 0) + 1 } : c
                    )
                });

                const chatExists = chats.some(c => c._id === newMessage.senderId);
                if (!chatExists) {
                    get().getMyChatPartners();
                }
            }
        });

        socket.on("newGroupMessage", (newMessage) => {
            const { activeGroup, isSoundEnabled, groups } = get();
            const { authUser } = userAuthStore.getState();

            // Ignore messages sent by ourselves
            const senderId = newMessage.senderId?._id || newMessage.senderId;
            if (senderId === authUser._id) return;

            const isGroupActive = activeGroup && newMessage.groupId === activeGroup._id;

            if (isGroupActive) {
                set({
                    messages: [...get().messages, newMessage],
                });
                get().markGroupAsRead(activeGroup._id);
            } else {
                if (isSoundEnabled) {
                    playNotificationChime();
                }

                set({
                    groups: groups.map(g => {
                        if (g._id === newMessage.groupId) {
                            return {
                                ...g,
                                lastMessage: newMessage,
                                unreadCount: (g.unreadCount || 0) + 1
                            };
                        }
                        return g;
                    })
                });

                const groupExists = groups.some(g => g._id === newMessage.groupId);
                if (!groupExists) {
                    get().getGroups();
                }
            }
        });

        socket.on("join_new_group", ({ groupId, group }) => {
            const { groups } = get();
            if (!groups.some(g => g._id === groupId)) {
                set({ groups: [...groups, group] });
            }
            socket.emit("join_groups", [groupId]);
        });

        socket.on("messagePinStatus", (updatedMessage) => {
            const { messages } = get();
            const updatedMessages = messages.map(msg => 
                msg._id === updatedMessage._id ? updatedMessage : msg
            );
            set({ messages: updatedMessages });
        });

        socket.on("groupUpdated", (updatedGroup) => {
            const { groups, activeGroup } = get();
            set({
                groups: groups.map(g => g._id === updatedGroup._id ? { ...g, ...updatedGroup } : g)
            });
            if (activeGroup && activeGroup._id === updatedGroup._id) {
                set({ activeGroup: updatedGroup });
            }
        });

        socket.on("removedFromGroup", ({ groupId }) => {
            const { groups, activeGroup } = get();
            set({
                groups: groups.filter(g => g._id !== groupId)
            });
            if (activeGroup && activeGroup._id === groupId) {
                set({ activeGroup: null });
                toast.error("You have been removed from this group.");
            }
        });

        // Also emit join_groups for all loaded groups
        const { groups } = get();
        if (groups.length > 0) {
            socket.emit("join_groups", groups.map(g => g._id));
        }
    },

    unsubscribeFromMessages: () => {
        const socket = userAuthStore.getState().socket;
        socket?.off("newMessage");
        socket?.off("newGroupMessage");
        socket?.off("join_new_group");
        socket?.off("messagePinStatus");
        socket?.off("groupUpdated");
        socket?.off("removedFromGroup");
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

    sendGroupTyping: () => {
        const { activeGroup } = get();
        const socket = userAuthStore.getState().socket;
        if (!activeGroup || !socket) return;
        socket.emit("groupTyping", { groupId: activeGroup._id });
    },

    sendGroupStopTyping: () => {
        const { activeGroup } = get();
        const socket = userAuthStore.getState().socket;
        if (!activeGroup || !socket) return;
        socket.emit("groupStopTyping", { groupId: activeGroup._id });
    },

    subscribeToTypingEvents: () => {
        const socket = userAuthStore.getState().socket;
        if (!socket) return;

        socket.off("typing");
        socket.off("stopTyping");
        socket.off("groupTyping");
        socket.off("groupStopTyping");

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

        socket.on("groupTyping", ({ groupId, userId }) => {
            const { activeGroup, groupTypingUsers } = get();
            const { authUser } = userAuthStore.getState();
            if (userId === authUser._id) return;

            const currentTyping = groupTypingUsers[groupId] || [];
            if (!currentTyping.includes(userId)) {
                set({
                    groupTypingUsers: {
                        ...groupTypingUsers,
                        [groupId]: [...currentTyping, userId]
                    }
                });
            }
        });

        socket.on("groupStopTyping", ({ groupId, userId }) => {
            const { groupTypingUsers } = get();
            const currentTyping = groupTypingUsers[groupId] || [];
            set({
                groupTypingUsers: {
                    ...groupTypingUsers,
                    [groupId]: currentTyping.filter(id => id !== userId)
                }
            });
        });
    },

    unsubscribeFromTypingEvents: () => {
        const socket = userAuthStore.getState().socket;
        if (socket) {
            socket.off("typing");
            socket.off("stopTyping");
            socket.off("groupTyping");
            socket.off("groupStopTyping");
        }
    },

    deleteMessage: async (messageId) => {
        const { messages, activeGroup } = get();
        try {
            await axiosInstance.delete(`/messages/${messageId}`);
            set({ messages: messages.filter(m => m._id !== messageId) });
            toast.success("Message deleted");
            if (activeGroup) {
                get().getGroups();
            } else {
                get().getMyChatPartners();
            }
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

    uploadFile: async (fileObj) => {
        const { selectedUser, activeGroup } = get();
        set({ uploadProgress: 0 });
        try {
            let res;
            const config = {
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    set({ uploadProgress: percentCompleted });
                }
            };
            const payload = {
                file: fileObj.fileData,
                fileName: fileObj.fileName,
                fileType: fileObj.fileType,
                fileSize: fileObj.fileSize
            };
            if (activeGroup) {
                res = await axiosInstance.post(`/groups/${activeGroup._id}/messages`, payload, config);
                set({ messages: [...get().messages, res.data] });
                get().getGroups();
            } else {
                res = await axiosInstance.post(`/messages/upload/${selectedUser._id}`, payload, config);
                set({ messages: [...get().messages, res.data] });
                get().getMyChatPartners();
            }
            toast.success("File sent");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to upload file"));
        } finally {
            set({ uploadProgress: null });
        }
    },

    sendAudio: async (audioData, duration) => {
        const { selectedUser, activeGroup, messages } = get();
        try {
            let res;
            if (activeGroup) {
                res = await axiosInstance.post(`/groups/${activeGroup._id}/messages`, {
                    audioUrl: audioData,
                    audioDuration: duration
                });
                set({ messages: [...messages, res.data] });
                get().getGroups();
            } else {
                res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, {
                    audioUrl: audioData,
                    audioDuration: duration
                });
                set({ messages: [...messages, res.data] });
                get().getMyChatPartners();
            }
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to send audio"));
        }
    },

    searchMessages: async (query, userId, type) => {
        try {
            const params = {};
            if (query) params.query = query;
            if (userId) params.userId = userId;
            if (type && type !== 'all') params.type = type;
            const res = await axiosInstance.get('/messages/search', { params });
            return res.data;
        } catch (error) {
            toast.error(getErrorMessage(error, "Search failed"));
            return [];
        }
    },

    togglePinMessage: async (messageId) => {
        try {
            const res = await axiosInstance.post(`/messages/${messageId}/pin`);
            const updatedMessage = res.data;
            const { messages } = get();
            const updatedMessages = messages.map(msg => 
                msg._id === messageId ? updatedMessage : msg
            );
            set({ messages: updatedMessages });
            if (updatedMessage.isPinned) {
                toast.success("Message pinned");
            } else {
                toast.success("Message unpinned");
            }
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to toggle pin"));
        }
    },

    toggleStarMessage: async (messageId) => {
        try {
            const res = await axiosInstance.post(`/messages/${messageId}/star`);
            const updatedMessage = res.data;
            const { messages, starredMessages } = get();
            
            // Update in active conversation messages
            const updatedMessages = messages.map(msg => 
                msg._id === messageId ? updatedMessage : msg
            );
            set({ messages: updatedMessages });

            // Update in starredMessages array
            const authUser = userAuthStore.getState().authUser;
            const isStarred = updatedMessage.starredBy?.includes(authUser?._id);
            
            let newStarred = [...(starredMessages || [])];
            if (isStarred) {
                if (!newStarred.some(m => m._id === messageId)) {
                    newStarred.push(updatedMessage);
                }
                toast.success("Message starred");
            } else {
                newStarred = newStarred.filter(m => m._id !== messageId);
                toast.success("Message unstarred");
            }
            set({ starredMessages: newStarred });
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to toggle star"));
        }
    },

    getStarredMessages: async () => {
        try {
            const res = await axiosInstance.get('/messages/starred/all');
            set({ starredMessages: res.data });
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to fetch starred messages"));
        }
    },

    updateGroupDetails: async (groupId, groupData) => {
        try {
            const res = await axiosInstance.put(`/groups/${groupId}`, groupData);
            const updatedGroup = res.data;
            const { groups, activeGroup } = get();
            set({
                groups: groups.map(g => g._id === groupId ? updatedGroup : g)
            });
            if (activeGroup && activeGroup._id === groupId) {
                set({ activeGroup: updatedGroup });
            }
            toast.success("Group details updated");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to update group details"));
        }
    },

    addMembersToGroup: async (groupId, userIds) => {
        try {
            const res = await axiosInstance.post(`/groups/${groupId}/members/add`, { userIds });
            const updatedGroup = res.data;
            const { groups, activeGroup } = get();
            set({
                groups: groups.map(g => g._id === groupId ? updatedGroup : g)
            });
            if (activeGroup && activeGroup._id === groupId) {
                set({ activeGroup: updatedGroup });
            }
            toast.success("Members added successfully");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to add members"));
        }
    },

    removeMemberFromGroup: async (groupId, userIdToRemove) => {
        try {
            const res = await axiosInstance.post(`/groups/${groupId}/members/remove`, { userIdToRemove });
            const updatedGroup = res.data;
            const { groups, activeGroup } = get();
            set({
                groups: groups.map(g => g._id === groupId ? updatedGroup : g)
            });
            if (activeGroup && activeGroup._id === groupId) {
                set({ activeGroup: updatedGroup });
            }
            toast.success("Member removed");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to remove member"));
        }
    },

    updateMemberRoleInGroup: async (groupId, targetUserId, role) => {
        try {
            const res = await axiosInstance.put(`/groups/${groupId}/members/role`, { targetUserId, role });
            const updatedGroup = res.data;
            const { groups, activeGroup } = get();
            set({
                groups: groups.map(g => g._id === groupId ? updatedGroup : g)
            });
            if (activeGroup && activeGroup._id === groupId) {
                set({ activeGroup: updatedGroup });
            }
            toast.success(`Member role updated to ${role}`);
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to update member role"));
        }
    },

    leaveGroup: async (groupId) => {
        try {
            await axiosInstance.post(`/groups/${groupId}/leave`);
            const { groups, activeGroup } = get();
            set({
                groups: groups.filter(g => g._id !== groupId),
                activeGroup: activeGroup && activeGroup._id === groupId ? null : activeGroup
            });
            toast.success("Successfully left group");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to leave group"));
        }
    },

    transferGroupOwnership: async (groupId, newCreatorId) => {
        try {
            const res = await axiosInstance.put(`/groups/${groupId}/transfer`, { newCreatorId });
            const updatedGroup = res.data;
            const { groups, activeGroup } = get();
            set({
                groups: groups.map(g => g._id === groupId ? updatedGroup : g)
            });
            if (activeGroup && activeGroup._id === groupId) {
                set({ activeGroup: updatedGroup });
            }
            toast.success("Group ownership transferred successfully");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to transfer ownership"));
        }
    },
}));

