import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { userAuthStore } from "./userAuthStore";
import { playSentSound, playReceivedSound } from "../lib/soundUtils";
import {
    getPrivateKey, deriveSharedKey, encryptMessage, decryptMessage,
    generateGroupKey, encryptGroupKey, decryptGroupKey, importGroupKey,
    storeGroupKey, getGroupKeyFromStore, clearGroupKeys, encryptFile,
    cacheChatsLocal, getCachedChats, cacheMessagesLocal, getCachedMessages,
    enqueueOfflineMessage, getOfflineQueue, updateQueueItem, dequeueOfflineMessage
} from "../lib/cryptoUtils";

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

const decryptSingleGroupMessage = async (msg, groupKey) => {
    let decryptedMsg = { ...msg };

    // Decrypt text
    if (msg.isEncrypted && msg.text && msg.iv) {
        try {
            decryptedMsg.text = await decryptMessage(msg.text, msg.iv, groupKey);
            if (decryptedMsg.contentType === "contact") {
                try {
                    decryptedMsg.sharedContact = JSON.parse(decryptedMsg.text);
                } catch (e) {
                    console.error("Failed to parse group decrypted contact:", e);
                }
            }
        } catch (e) {
            decryptedMsg.text = "[Decryption Failed: Keys rotated or missing]";
            decryptedMsg.isDecryptionFailed = true;
        }
    }

    // Decrypt poll if present
    if (msg.isEncrypted && msg.poll && msg.poll.question && msg.poll.iv) {
        try {
            const decQ = await decryptMessage(msg.poll.question, msg.poll.iv, groupKey);
            const decOpts = await Promise.all(
                msg.poll.options.map(async (opt) => {
                    if (opt.optionText && opt.iv) {
                        const decOptText = await decryptMessage(opt.optionText, opt.iv, groupKey);
                        return { ...opt, optionText: decOptText };
                    }
                    return opt;
                })
            );
            decryptedMsg.poll = {
                ...msg.poll,
                question: decQ,
                options: decOpts
            };
        } catch (e) {
            console.error("Failed to decrypt group message poll:", e);
            decryptedMsg.poll = {
                ...msg.poll,
                question: "[Decryption Failed]",
                options: msg.poll.options.map(o => ({ ...o, optionText: "[Decryption Failed]" }))
            };
        }
    }

    // Decrypt replyTo.text if it's encrypted
    if (msg.replyTo && msg.replyTo.isEncrypted && msg.replyTo.text && msg.replyTo.iv) {
        try {
            decryptedMsg.replyTo = {
                ...msg.replyTo,
                text: await decryptMessage(msg.replyTo.text, msg.replyTo.iv, groupKey)
            };
        } catch (e) {
            decryptedMsg.replyTo = {
                ...msg.replyTo,
                text: msg.replyTo.image ? '' : '[Encrypted message]'
            };
        }
    }

    return decryptedMsg;
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

const checkAppFocus = () => {
    return document.visibilityState === 'visible';
};

export const userChatStore = create((set, get) => ({
    allContacts: [],
    chats: [],
    groups: [],
    handshakeActive: false,
    quantumListeners: [],
    registerQuantumListener: (cb) => set({ quantumListeners: [...get().quantumListeners, cb] }),
    unregisterQuantumListener: (cb) => set({ quantumListeners: get().quantumListeners.filter(l => l !== cb) }),
    notifyQuantumMessage: (msg) => {
        get().quantumListeners.forEach(cb => {
            try { cb(msg); } catch (e) { console.error("Error in quantum listener:", e); }
        });
    },

    sendQuantumMessage: async (text) => {
        const { selectedUser } = get();
        const socket = userAuthStore.getState().socket;
        if (!selectedUser || !socket) {
            toast.error("Handshake not active. Cannot send.");
            return;
        }

        const authUser = userAuthStore.getState().authUser;
        const tempId = "q-" + Date.now() + "-" + Math.random().toString(36).substr(2, 9);

        // Decrypted version to notify local listener
        const decryptedMsg = {
            _id: tempId,
            senderId: authUser._id,
            recieverId: selectedUser._id,
            text: text,
            isQuantum: true,
            createdAt: new Date().toISOString()
        };

        // Encrypted version for transmission
        let payload = {
            _id: tempId,
            senderId: authUser._id,
            recieverId: selectedUser._id,
            text: text,
            isQuantum: true,
            createdAt: new Date().toISOString()
        };

        if (selectedUser.publicKey) {
            try {
                const key = await get().getOrDeriveSharedKey(selectedUser);
                if (key) {
                    const encrypted = await encryptMessage(text, key);
                    payload.text = encrypted.ciphertext;
                    payload.iv = encrypted.iv;
                    payload.isEncrypted = true;
                }
            } catch (err) {
                console.error("E2EE encryption failed for quantum message:", err);
            }
        }

        socket.emit("sendQuantumMessage", payload, (response) => {
            if (response && response.success) {
                get().notifyQuantumMessage(decryptedMsg);
                playSentSound();
            } else {
                toast.error(response?.error || "Quantum handshake failed. Message self-destructed!");
            }
        });
    },

    evaporateQuantumMessages: () => {
        get().notifyQuantumMessage(null); // Clear local component messages
    },
    pendingRequests: [],
    searchResults: [],
    isSearchingUsers: false,
    sentRequests: [],
    blockedUsers: [],
    dmTypingUsers: {},
    typingTimeouts: {},
    groupTypingTimeouts: {},
    lastTypingEmit: null,
    lastGroupTypingEmit: null,
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
    isForwardModalOpen: false,
    forwardItem: null,
    forwardType: 'message', // 'message' | 'contact'
    groupReadTimestamps: JSON.parse(localStorage.getItem("aether-group-read-timestamps")) || {},
    groupTypingUsers: {}, // { [groupId]: [userIds] }
    uploadProgress: null,
    activePreviewFile: null,
    starredMessages: [],
    linkPreviews: {},
    derivedKeys: {}, // { [userId]: CryptoKey }
    groupKeys: {}, // { [groupId]: CryptoKey }
    replyingTo: null, // { _id, text, image, audioUrl, fileUrl, fileName, senderId } — the message being quoted
    hasMoreMessages: false,
    isLoadingOlder: false,
    isSyncing: false,
    callHistory: [],
    isCallHistoryLoading: false,
    mutedChats: JSON.parse(localStorage.getItem("aether-muted-chats")) || [],
    pinnedChats: JSON.parse(localStorage.getItem("aether-pinned-chats")) || [],
    offlineQueue: [],
    markedUnreadChats: JSON.parse(localStorage.getItem("marked_unread_chats") || "[]"),
    searchQuery: "",


    // ─── Theme State ───────────────────────────────────────
    theme: getInitialTheme(),
    themes: THEMES,
    themeNames: THEME_NAMES,
    quantumMode: false,
    setQuantumMode: (quantumMode) => set({ quantumMode }),

    setTheme: (theme) => {
        if (!THEMES.includes(theme)) return;
        localStorage.setItem("aether-theme", theme);
        applyTheme(theme);
        set({ theme });
    },

    fetchLinkPreview: async (url) => {
        const { linkPreviews } = get();
        if (linkPreviews[url]) return;

        set({
            linkPreviews: {
                ...linkPreviews,
                [url]: { loading: true }
            }
        });

        try {
            const res = await axiosInstance.get("/messages/link-preview/parse", {
                params: { url }
            });
            set({
                linkPreviews: {
                    ...get().linkPreviews,
                    [url]: res.data
                }
            });
        } catch (error) {
            console.error("Failed to parse link preview:", error);
            let fallbackHost = "Link Shared";
            try {
                fallbackHost = new URL(url).hostname;
            } catch (e) { }

            set({
                linkPreviews: {
                    ...get().linkPreviews,
                    [url]: {
                        title: fallbackHost,
                        description: "Click to open the link in a new tab.",
                        image: "",
                        url: url
                    }
                }
            });
        }
    },

    getOrDeriveSharedKey: async (partnerUser) => {
        return "dummy-shared-key";
    },

    getOrDecryptGroupKey: async (groupId) => {
        return "dummy-group-key";
    },

    getChatEncryptionKey: async (groupId = null) => {
        if (groupId) {
            return await get().getOrDecryptGroupKey(groupId);
        }
        const { selectedUser } = get();
        if (selectedUser) {
            return await get().getOrDeriveSharedKey(selectedUser);
        }
        return null;
    },

    decryptSingleMessage: async (msg) => {
        if (!msg || !msg.isEncrypted) return msg;

        const { activeGroup, selectedUser, allContacts } = get();
        const authUser = userAuthStore.getState().authUser;
        if (!authUser) return msg;

        if (msg.groupId) {
            const groupKey = await get().getOrDecryptGroupKey(msg.groupId);
            if (groupKey) {
                return await decryptSingleGroupMessage(msg, groupKey);
            }
        } else {
            const sId = (msg.senderId?._id || msg.senderId)?.toString();
            const rId = (msg.recieverId?._id || msg.recieverId || msg.receiverId?._id || msg.receiverId)?.toString();
            const partnerId = sId === authUser._id ? rId : sId;

            let partner = null;
            if (selectedUser && selectedUser._id === partnerId) {
                partner = selectedUser;
            } else if (allContacts) {
                partner = allContacts.find(c => c._id === partnerId);
            }

            if (partner && partner.publicKey) {
                const sharedKey = await get().getOrDeriveSharedKey(partner);
                if (sharedKey && msg.text && msg.iv) {
                    try {
                        const decryptedText = await decryptMessage(msg.text, msg.iv, sharedKey);
                        let extraProps = {};
                        if (msg.contentType === "contact") {
                            try {
                                extraProps.sharedContact = JSON.parse(decryptedText);
                            } catch (e) {
                                console.error("Failed to parse DM decrypted contact in single:", e);
                            }
                        }
                        return { ...msg, text: decryptedText, ...extraProps };
                    } catch (e) {
                        return { ...msg, text: "[Decryption failed: Keys rotated or missing]", isDecryptionFailed: true };
                    }
                }
            }
        }
        return msg;
    },

    decryptMessageList: async (messageList, partnerUser) => {
        if (!partnerUser || !partnerUser.publicKey) return messageList;

        try {
            const sharedKey = await get().getOrDeriveSharedKey(partnerUser);
            if (!sharedKey) return messageList;

            const decrypted = await Promise.all(messageList.map(async (msg) => {
                if (msg.isEncrypted && msg.text && msg.iv) {
                    try {
                        const decryptedText = await decryptMessage(msg.text, msg.iv, sharedKey);
                        let extraProps = {};
                        if (msg.contentType === "contact") {
                            try {
                                extraProps.sharedContact = JSON.parse(decryptedText);
                            } catch (e) {
                                console.error("Failed to parse DM decrypted contact:", e);
                            }
                        }
                        // Decrypt replyTo.text if it's encrypted (uses same shared key for DM-to-DM replies)
                        let decryptedReplyTo = msg.replyTo;
                        if (msg.replyTo && msg.replyTo.isEncrypted && msg.replyTo.text && msg.replyTo.iv) {
                            try {
                                decryptedReplyTo = {
                                    ...msg.replyTo,
                                    text: await decryptMessage(msg.replyTo.text, msg.replyTo.iv, sharedKey)
                                };
                            } catch (e) {
                                decryptedReplyTo = {
                                    ...msg.replyTo,
                                    text: msg.replyTo.image ? '' : '[Encrypted message]'
                                };
                            }
                        }
                        return { ...msg, text: decryptedText, replyTo: decryptedReplyTo, ...extraProps };
                    } catch (e) {
                        // Decryption failed (e.g. key mismatch due to storage/key sync issues)
                        return { ...msg, text: "[Decryption failed: Keys rotated or missing]", isDecryptionFailed: true };
                    }
                }
                return msg;
            }));
            return decrypted;
        } catch (error) {
            console.error("Error decrypting message list:", error);
            return messageList;
        }
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

    loadOfflineQueue: async () => {
        try {
            const queue = await getOfflineQueue();
            set({ offlineQueue: queue });
        } catch (err) {
            console.error("Failed to load offline queue:", err);
        }
    },

    toggleMuteChat: async (chatId) => {
        if (!chatId) return;
        const { mutedChats } = get();
        const isMuted = mutedChats.includes(chatId);
        const updated = isMuted
            ? mutedChats.filter(id => id !== chatId)
            : [...mutedChats, chatId];

        localStorage.setItem("aether-muted-chats", JSON.stringify(updated));
        set({ mutedChats: updated });

        try {
            const { setChatMutedInDB } = await import("../lib/cryptoUtils");
            await setChatMutedInDB(chatId, !isMuted);
        } catch (err) {
            console.error("[IndexedDB] Sync error in toggleMuteChat:", err);
        }
    },

    togglePinChat: (chatId) => {
        if (!chatId) return;
        const { pinnedChats } = get();
        const isPinned = pinnedChats.includes(chatId);
        const updated = isPinned
            ? pinnedChats.filter(id => id !== chatId)
            : [...pinnedChats, chatId];

        localStorage.setItem("aether-pinned-chats", JSON.stringify(updated));
        set({ pinnedChats: updated });
    },

    exportChatLog: (format = 'txt') => {
        const { messages, selectedUser, activeGroup } = get();
        const { authUser } = userAuthStore.getState();
        if (!authUser || (!selectedUser && !activeGroup)) return;

        const chatName = activeGroup ? activeGroup.name : selectedUser.fullName;
        const fileName = `chat_log_${chatName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`;

        let fileContent = "";

        if (format === 'json') {
            const formattedMessages = messages.map(msg => {
                const isMe = (msg.senderId?._id || msg.senderId) === authUser._id;
                let senderName = "System";
                if (msg.senderId) {
                    if (isMe) {
                        senderName = authUser.fullName || "You";
                    } else if (activeGroup) {
                        senderName = msg.senderId.fullName || "Group Member";
                    } else {
                        senderName = selectedUser.fullName;
                    }
                }

                let text = msg.text || "";
                if (msg.image) text = `[Image Attachment]`;
                if (msg.audioUrl) text = `[Voice Message Attachment]`;
                if (msg.fileUrl) text = `[File Attachment: ${msg.fileName || 'file'}]`;
                if (msg.callInfo) {
                    text = msg.callInfo.type === "video" ? "Video call" : "Voice call";
                }

                return {
                    timestamp: msg.createdAt,
                    sender: senderName,
                    message: text
                };
            });
            fileContent = JSON.stringify(formattedMessages, null, 2);
        } else {
            // Text format
            fileContent = messages.map(msg => {
                const isMe = (msg.senderId?._id || msg.senderId) === authUser._id;
                let senderName = "System";
                if (msg.senderId) {
                    if (isMe) {
                        senderName = authUser.fullName || "You";
                    } else if (activeGroup) {
                        senderName = msg.senderId.fullName || "Group Member";
                    } else {
                        senderName = selectedUser.fullName;
                    }
                }

                let text = msg.text || "";
                if (msg.image) text = `[Image Attachment]`;
                if (msg.audioUrl) text = `[Voice Message Attachment]`;
                if (msg.fileUrl) text = `[File Attachment: ${msg.fileName || 'file'}]`;
                if (msg.callInfo) {
                    text = msg.callInfo.type === "video" ? "Video call" : "Voice call";
                }

                const timeStr = new Date(msg.createdAt).toLocaleString();
                return `[${timeStr}] ${senderName}: ${text}`;
            }).join("\n");
        }

        const blob = new Blob([fileContent], { type: format === 'json' ? 'application/json' : 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
    },

    setActiveTab: (tab) => set({ activeTab: tab }),
    setShowSearch: (showSearch) => set({ showSearch, showInfoPanel: showSearch ? false : get().showInfoPanel }),
    setShowInfoPanel: (showInfoPanel) => set({ showInfoPanel, showSearch: showInfoPanel ? false : get().showSearch }),
    setSidebarSearchQuery: (sidebarSearchQuery) => set({ sidebarSearchQuery }),
    setActivePreviewFile: (activePreviewFile) => set({ activePreviewFile }),
    setReplyingTo: (message) => set({ replyingTo: message }),
    clearReplyingTo: () => set({ replyingTo: null }),

    openForwardModal: (item, type = 'message') => set({ isForwardModalOpen: true, forwardItem: item, forwardType: type }),
    closeForwardModal: () => set({ isForwardModalOpen: false, forwardItem: null }),

    sendDirectOrGroupMessage: async (targetId, isGroup, messageData) => {
        let payload = { ...messageData };
        let key = null;
        if (isGroup) {
            key = await get().getOrDecryptGroupKey(targetId);
        } else {
            const targetUser = get().allContacts.find(c => c._id === targetId) ||
                get().chats.find(c => c._id === targetId);
            if (targetUser && targetUser.publicKey) {
                key = await get().getOrDeriveSharedKey(targetUser);
            }
        }

        if (key) {
            try {
                if (payload.contentType === "contact" && payload.sharedContact) {
                    const contactStr = JSON.stringify(payload.sharedContact);
                    const encrypted = await encryptMessage(contactStr, key);
                    payload.text = encrypted.ciphertext;
                    payload.iv = encrypted.iv;
                    payload.isEncrypted = true;
                    payload.sharedContact = undefined;
                } else {
                    if (payload.text) {
                        const encrypted = await encryptMessage(payload.text, key);
                        payload.text = encrypted.ciphertext;
                        payload.iv = encrypted.iv;
                        payload.isEncrypted = true;
                    }
                    if (payload.image) {
                        const encrypted = await encryptMessage(payload.image, key);
                        payload.image = encrypted.ciphertext;
                        payload.mediaIv = encrypted.iv;
                        payload.isEncrypted = true;
                    }
                    if (payload.audioUrl) {
                        const encrypted = await encryptMessage(payload.audioUrl, key);
                        payload.audioUrl = encrypted.ciphertext;
                        payload.mediaIv = encrypted.iv;
                        payload.isEncrypted = true;
                    }
                    if (payload.fileUrl) {
                        const encrypted = await encryptMessage(payload.fileUrl, key);
                        payload.fileUrl = encrypted.ciphertext;
                        payload.mediaIv = encrypted.iv;
                        payload.isEncrypted = true;
                    }
                }
            } catch (err) {
                console.error("Failed to encrypt client-side during forward/share:", err);
            }
        }

        let res;
        if (isGroup) {
            res = await axiosInstance.post(`/groups/${targetId}/messages`, payload);
        } else {
            res = await axiosInstance.post(`/messages/send/${targetId}`, payload);
        }

        const { selectedUser, activeGroup, messages } = get();
        if ((isGroup && activeGroup && activeGroup._id === targetId) ||
            (!isGroup && selectedUser && selectedUser._id === targetId)) {
            let responseMsg = res.data;
            if (isGroup) {
                responseMsg = await decryptSingleGroupMessage(responseMsg, key);
            } else {
                const decryptedList = await get().decryptMessageList([responseMsg], selectedUser);
                responseMsg = decryptedList[0];
            }
            set({ messages: [...messages, responseMsg] });
            playSentSound();
        }

        get().getMyChatPartners();
        if (isGroup) {
            get().getGroups();
        }
        return res.data;
    },

    setSelectedUser: (selectedUser) => {
        const isPeerTyping = selectedUser ? !!get().dmTypingUsers[selectedUser._id] : false;
        set({ selectedUser, activeGroup: null, showSearch: false, showInfoPanel: false, sidebarSearchQuery: "", isTyping: isPeerTyping });
        if (selectedUser) {
            set({
                chats: get().chats.map(c =>
                    c._id === selectedUser._id ? { ...c, unreadCount: 0 } : c
                )
            });
            get().markMessagesAsRead(selectedUser._id);
            get().markChatAsRead(selectedUser._id);
        }

        // Evaporate active quantum messages when switching chats
        get().evaporateQuantumMessages();

        // Emit our co-presence state
        const socket = userAuthStore.getState().socket;
        if (socket) {
            const isFocused = checkAppFocus();
            socket.emit("updateCoPresenceStatus", { selectedUserId: selectedUser ? selectedUser._id : null, isFocused });
        }
    },

    setSelectedGroup: (activeGroup) => {
        set({ activeGroup, selectedUser: null, showSearch: false, showInfoPanel: false, sidebarSearchQuery: "" });
        if (activeGroup) {
            get().getGroupMessages(activeGroup._id);
            get().markGroupAsRead(activeGroup._id);
            get().markChatAsRead(activeGroup._id);
            const socket = userAuthStore.getState().socket;
            if (socket) {
                socket.emit("join_groups", [activeGroup._id]);
            }
        }
    },

    markChatAsUnread: (chatId) => {
        const { markedUnreadChats } = get();
        if (!markedUnreadChats.includes(chatId)) {
            const nextUnread = [...markedUnreadChats, chatId];
            localStorage.setItem("marked_unread_chats", JSON.stringify(nextUnread));
            set({ markedUnreadChats: nextUnread });
        }
    },

    markChatAsRead: (chatId) => {
        const { markedUnreadChats } = get();
        if (markedUnreadChats.includes(chatId)) {
            const nextUnread = markedUnreadChats.filter(id => id !== chatId);
            localStorage.setItem("marked_unread_chats", JSON.stringify(nextUnread));
            set({ markedUnreadChats: nextUnread });
        }
    },

    setSearchQuery: (searchQuery) => {
        set({ searchQuery });
    },

    markGroupAsRead: (groupId) => {
        const timestamps = { ...get().groupReadTimestamps, [groupId]: new Date().toISOString() };
        localStorage.setItem("aether-group-read-timestamps", JSON.stringify(timestamps));
        set({
            groupReadTimestamps: timestamps,
            groups: get().groups.map(g => g._id === groupId ? { ...g, unreadCount: 0 } : g)
        });
        get().markMessagesAsRead(groupId);
    },

    getAllContacts: async () => {
        set({ isUsersLoading: true });
        try {
            const res = await axiosInstance.get("/messages/contacts");
            set({ allContacts: res.data });
            // Cache contacts locally
            const { chats, groups } = get();
            await cacheChatsLocal(chats, groups, res.data);
        } catch (error) {
            const cached = await getCachedChats();
            if (cached && cached.contacts && cached.contacts.length > 0) {
                set({ allContacts: cached.contacts });
                console.log("[PWA Cache] Loaded contacts list offline.");
            } else {
                toast.error(getErrorMessage(error, "Failed to load contacts"));
            }
        } finally {
            set({ isUsersLoading: false });
        }
    },

    getPendingRequests: async () => {
        try {
            const res = await axiosInstance.get("/friends/requests/pending");
            set({ pendingRequests: res.data });
        } catch (error) {
            console.error("Failed to load pending requests:", error);
        }
    },

    getSentRequests: async () => {
        try {
            const res = await axiosInstance.get("/friends/requests/sent");
            set({ sentRequests: res.data });
        } catch (error) {
            console.error("Failed to load sent requests:", error);
        }
    },

    getBlockedUsers: async () => {
        try {
            const res = await axiosInstance.get("/friends/blocked");
            set({ blockedUsers: res.data });
        } catch (error) {
            console.error("Failed to load blocked users:", error);
        }
    },

    blockUser: async (userId) => {
        try {
            await axiosInstance.post("/friends/block", { userId });
            toast.success("User blocked successfully");

            // Refresh contacts and blocked lists
            get().getAllContacts();
            get().getBlockedUsers();

            // Clear selectedUser if we just blocked them
            const { selectedUser } = get();
            if (selectedUser && selectedUser._id === userId) {
                set({ selectedUser: null });
            }
            return true;
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to block user"));
            return false;
        }
    },

    unblockUser: async (userId) => {
        try {
            await axiosInstance.post("/friends/unblock", { userId });
            toast.success("User unblocked successfully");

            // Refresh blocked list
            get().getBlockedUsers();

            // Update searchResults relationship if they were blocked
            const { searchResults } = get();
            set({
                searchResults: searchResults.map(user => {
                    if (user._id === userId) {
                        return { ...user, relationship: "none" };
                    }
                    return user;
                })
            });
            return true;
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to unblock user"));
            return false;
        }
    },

    sendFriendRequest: async (receiverId) => {
        try {
            const res = await axiosInstance.post("/friends/request", { receiverId });
            toast.success(res.data.message || "Friend request sent!");
            return true;
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to send friend request"));
            return false;
        }
    },

    respondToFriendRequest: async (requestId, status) => {
        try {
            const res = await axiosInstance.put("/friends/request/respond", { requestId, status });
            toast.success(res.data.message || `Friend request ${status}`);
            set({
                pendingRequests: get().pendingRequests.filter(r => r._id !== requestId)
            });
            if (status === "accepted") {
                get().getAllContacts();
            }
            return true;
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to respond to request"));
            return false;
        }
    },

    searchUsersGlobally: async (query) => {
        if (!query.trim()) {
            set({ searchResults: [] });
            return;
        }
        set({ isSearchingUsers: true });
        try {
            const res = await axiosInstance.get("/friends/search", { params: { query } });
            set({ searchResults: res.data });
        } catch (error) {
            console.error("Failed to search users globally:", error);
        } finally {
            set({ isSearchingUsers: false });
        }
    },

    getMyChatPartners: async () => {
        set({ isUsersLoading: true });
        try {
            const res = await axiosInstance.get("/messages/chats");
            const chats = res.data;

            const decryptedChats = await Promise.all(chats.map(async (c) => {
                if (c.lastMessage && c.lastMessage.isEncrypted && c.lastMessage.text && c.lastMessage.iv && c.publicKey) {
                    try {
                        const sharedKey = await get().getOrDeriveSharedKey(c);
                        if (sharedKey) {
                            const decryptedText = await decryptMessage(c.lastMessage.text, c.lastMessage.iv, sharedKey);
                            return {
                                ...c,
                                lastMessage: { ...c.lastMessage, text: decryptedText }
                            };
                        }
                    } catch (err) {
                        return {
                            ...c,
                            lastMessage: { ...c.lastMessage, text: "[Encrypted Message]" }
                        };
                    }
                }
                return c;
            }));

            set({ chats: decryptedChats });
            // Cache locally
            await cacheChatsLocal(decryptedChats, get().groups);
        } catch (error) {
            const cached = await getCachedChats();
            if (cached && cached.chats && cached.chats.length > 0) {
                set({ chats: cached.chats });
                console.log("[PWA Cache] Loaded chats list offline.");
            } else {
                toast.error(getErrorMessage(error, "Failed to load chats"));
            }
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

            const updatedGroups = await Promise.all(groups.map(async (g) => {
                const lastRead = groupReadTimestamps[g._id] || 0;
                const hasNew = g.lastMessage &&
                    new Date(g.lastMessage.createdAt) > new Date(lastRead) &&
                    g.lastMessage.senderId?._id !== authUser._id &&
                    g.lastMessage.senderId !== authUser._id;

                let lastMessageDecrypted = g.lastMessage;
                if (g.lastMessage && g.lastMessage.isEncrypted && g.lastMessage.text && g.lastMessage.iv) {
                    try {
                        const groupKey = await get().getOrDecryptGroupKey(g._id);
                        if (groupKey) {
                            const decryptedText = await decryptMessage(g.lastMessage.text, g.lastMessage.iv, groupKey);
                            lastMessageDecrypted = { ...g.lastMessage, text: decryptedText };
                        } else {
                            lastMessageDecrypted = { ...g.lastMessage, text: "[Encrypted Message]" };
                        }
                    } catch (err) {
                        lastMessageDecrypted = { ...g.lastMessage, text: "[Encrypted Message]" };
                    }
                }

                return {
                    ...g,
                    lastMessage: lastMessageDecrypted,
                    unreadCount: hasNew ? 1 : 0
                };
            }));

            set({ groups: updatedGroups });
            // Cache locally
            await cacheChatsLocal(get().chats, updatedGroups);

            const socket = userAuthStore.getState().socket;
            if (socket && groups.length > 0) {
                socket.emit("join_groups", groups.map(g => g._id));
            }
        } catch (error) {
            const cached = await getCachedChats();
            if (cached && cached.groups && cached.groups.length > 0) {
                set({ groups: cached.groups });
                console.log("[PWA Cache] Loaded groups list offline.");
            } else {
                toast.error(getErrorMessage(error, "Failed to load groups"));
            }
        } finally {
            set({ isGroupsLoading: false });
        }
    },

    createGroup: async (groupData) => {
        try {
            const { allContacts } = get();
            const { authUser } = userAuthStore.getState();
            const myPrivateKey = await getPrivateKey();

            let groupKeyJwk = null;
            let finalGroupData = { ...groupData };

            if (myPrivateKey && authUser) {
                try {
                    groupKeyJwk = await generateGroupKey();
                    const groupKeys = [];

                    // 1. Encrypt key for ourselves (creator)
                    const mySharedKey = await deriveSharedKey(myPrivateKey, authUser.publicKey);
                    const encForMe = await encryptGroupKey(groupKeyJwk, mySharedKey);
                    groupKeys.push({
                        userId: authUser._id,
                        encryptedKey: encForMe.encryptedKey,
                        iv: encForMe.iv
                    });

                    // 2. Encrypt key for each member
                    if (Array.isArray(groupData.members)) {
                        for (const memberId of groupData.members) {
                            const memberUser = allContacts.find(c => c._id === memberId);
                            if (memberUser && memberUser.publicKey) {
                                try {
                                    const sharedKey = await deriveSharedKey(myPrivateKey, memberUser.publicKey);
                                    const encForMember = await encryptGroupKey(groupKeyJwk, sharedKey);
                                    groupKeys.push({
                                        userId: memberId,
                                        encryptedKey: encForMember.encryptedKey,
                                        iv: encForMember.iv
                                    });
                                } catch (memberErr) {
                                    console.error(`Failed to encrypt group key for member ${memberId}:`, memberErr);
                                }
                            }
                        }
                    }

                    finalGroupData.groupKeys = groupKeys;
                } catch (cryptoErr) {
                    console.error("Group key generation/encryption failed during creation:", cryptoErr);
                }
            }

            const res = await axiosInstance.post("/groups", finalGroupData);
            const newGroup = res.data;

            // Save the group key locally if generated
            if (groupKeyJwk) {
                try {
                    await storeGroupKey(newGroup._id, groupKeyJwk);
                    const cryptoKey = await importGroupKey(groupKeyJwk);
                    set({
                        groupKeys: {
                            ...get().groupKeys,
                            [newGroup._id]: cryptoKey
                        }
                    });
                } catch (storeErr) {
                    console.error("Failed to store new group key locally:", storeErr);
                }
            }

            set({
                groups: [newGroup, ...get().groups]
            });
            get().setSelectedGroup(newGroup);
            toast.success("Group created successfully");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to create group"));
        }
    },

    getMessagesByUserId: async (userId, before = null, silent = false) => {
        if (before) {
            set({ isLoadingOlder: true });
        } else if (!silent) {
            set({ isMessagesLoading: true, messages: [], hasMoreMessages: false });
        }
        try {
            const url = `/messages/${userId}${before ? `?before=${before}` : ''}`;
            const res = await axiosInstance.get(url);
            const { selectedUser } = get();
            const decryptedMessages = await get().decryptMessageList(res.data, selectedUser);

            let finalMessages = decryptedMessages;
            if (!before) {
                try {
                    const queue = await getOfflineQueue();
                    const chatQueue = queue.filter(item => item.recipientId === userId && !item.isGroup);
                    const queuedMessagesMapped = chatQueue.map(item => ({
                        _id: item.tempId,
                        senderId: userAuthStore.getState().authUser?._id,
                        recieverId: userId,
                        text: item.textPlain || item.messageData.text,
                        image: item.messageData.image,
                        replyTo: item.messageData.replyTo,
                        createdAt: item.createdAt,
                        isPending: !item.isFailed,
                        isFailed: item.isFailed,
                        isOptimistic: true,
                        isGroup: false,
                    }));
                    finalMessages = [...decryptedMessages, ...queuedMessagesMapped];
                } catch (queueErr) {
                    console.error("Failed to load offline queue items:", queueErr);
                }
            }

            if (before) {
                set({
                    messages: [...decryptedMessages, ...get().messages],
                    hasMoreMessages: decryptedMessages.length === 30
                });
            } else {
                set({
                    messages: finalMessages,
                    hasMoreMessages: decryptedMessages.length === 30
                });
                // Cache raw encrypted messages
                await cacheMessagesLocal(userId, res.data);
                // Avoid race conditions: mark manual unread as read after successful fetch
                get().markChatAsRead(userId);
            }
        } catch (error) {
            if (!before) {
                const cachedRaw = await getCachedMessages(userId);
                if (cachedRaw && cachedRaw.length > 0) {
                    const { selectedUser } = get();
                    const decrypted = await get().decryptMessageList(cachedRaw, selectedUser);

                    let finalMessages = decrypted;
                    try {
                        const queue = await getOfflineQueue();
                        const chatQueue = queue.filter(item => item.recipientId === userId && !item.isGroup);
                        const queuedMessagesMapped = chatQueue.map(item => ({
                            _id: item.tempId,
                            senderId: userAuthStore.getState().authUser?._id,
                            recieverId: userId,
                            text: item.textPlain || item.messageData.text,
                            image: item.messageData.image,
                            replyTo: item.messageData.replyTo,
                            createdAt: item.createdAt,
                            isPending: !item.isFailed,
                            isFailed: item.isFailed,
                            isOptimistic: true,
                            isGroup: false,
                        }));
                        finalMessages = [...decrypted, ...queuedMessagesMapped];
                    } catch (queueErr) {
                        console.error("Failed to load offline queue items:", queueErr);
                    }

                    set({ messages: finalMessages, hasMoreMessages: false });
                    console.log("[PWA Cache] Loaded chat messages offline.");
                    return;
                }
            }
            toast.error(getErrorMessage(error, "Failed to load messages"));
        } finally {
            if (before) {
                set({ isLoadingOlder: false });
            } else if (!silent) {
                set({ isMessagesLoading: false });
            }
        }
    },

    getGroupMessages: async (groupId, before = null, silent = false) => {
        if (before) {
            set({ isLoadingOlder: true });
        } else if (!silent) {
            set({ isMessagesLoading: true, messages: [], hasMoreMessages: false });
        }
        try {
            const url = `/groups/${groupId}/messages${before ? `?before=${before}` : ''}`;
            const res = await axiosInstance.get(url);
            const messages = res.data;

            let decryptedMessages = messages;
            try {
                const groupKey = await get().getOrDecryptGroupKey(groupId);
                if (groupKey) {
                    decryptedMessages = await Promise.all(messages.map(async (msg) => {
                        return await decryptSingleGroupMessage(msg, groupKey);
                    }));
                } else {
                    decryptedMessages = messages.map(msg => {
                        if (msg.isEncrypted) {
                            return { ...msg, text: "[Decryption Failed: Group Key missing]", isDecryptionFailed: true };
                        }
                        return msg;
                    });
                }
            } catch (err) {
                console.error("Error decrypting group messages:", err);
            }

            let finalMessages = decryptedMessages;
            if (!before) {
                try {
                    const queue = await getOfflineQueue();
                    const groupQueue = queue.filter(item => item.groupId === groupId && item.isGroup);
                    const queuedMessagesMapped = groupQueue.map(item => ({
                        _id: item.tempId,
                        senderId: {
                            _id: userAuthStore.getState().authUser?._id,
                            fullName: userAuthStore.getState().authUser?.fullName,
                            profilePic: userAuthStore.getState().authUser?.profilePic
                        },
                        groupId: groupId,
                        text: item.textPlain || item.messageData.text,
                        image: item.messageData.image,
                        replyTo: item.messageData.replyTo,
                        createdAt: item.createdAt,
                        isPending: !item.isFailed,
                        isFailed: item.isFailed,
                        isOptimistic: true,
                        isGroup: true,
                    }));
                    finalMessages = [...decryptedMessages, ...queuedMessagesMapped];
                } catch (queueErr) {
                    console.error("Failed to load offline queue items:", queueErr);
                }
            }

            if (before) {
                set({
                    messages: [...decryptedMessages, ...get().messages],
                    hasMoreMessages: decryptedMessages.length === 30
                });
            } else {
                set({
                    messages: finalMessages,
                    hasMoreMessages: decryptedMessages.length === 30
                });
                // Cache raw encrypted messages
                await cacheMessagesLocal(groupId, messages);
                // Avoid race conditions: mark manual unread as read after successful fetch
                get().markChatAsRead(groupId);
            }
        } catch (error) {
            if (!before) {
                const cachedRaw = await getCachedMessages(groupId);
                if (cachedRaw && cachedRaw.length > 0) {
                    let decryptedMessages = cachedRaw;
                    try {
                        const groupKey = await get().getOrDecryptGroupKey(groupId);
                        if (groupKey) {
                            decryptedMessages = await Promise.all(cachedRaw.map(async (msg) => {
                                if (msg.isEncrypted && msg.text && msg.iv) {
                                    try {
                                        const decryptedText = await decryptMessage(msg.text, msg.iv, groupKey);
                                        return { ...msg, text: decryptedText };
                                    } catch (e) {
                                        return { ...msg, text: "[Decryption Failed: Keys rotated or missing]", isDecryptionFailed: true };
                                    }
                                }
                                return msg;
                            }));
                        } else {
                            decryptedMessages = cachedRaw.map(msg => {
                                if (msg.isEncrypted) {
                                    return { ...msg, text: "[Decryption Failed: Group Key missing]", isDecryptionFailed: true };
                                }
                                return msg;
                            });
                        }
                    } catch (err) {
                        console.error("Error decrypting cached group messages:", err);
                    }

                    let finalMessages = decryptedMessages;
                    try {
                        const queue = await getOfflineQueue();
                        const groupQueue = queue.filter(item => item.groupId === groupId && item.isGroup);
                        const queuedMessagesMapped = groupQueue.map(item => ({
                            _id: item.tempId,
                            senderId: {
                                _id: userAuthStore.getState().authUser?._id,
                                fullName: userAuthStore.getState().authUser?.fullName,
                                profilePic: userAuthStore.getState().authUser?.profilePic
                            },
                            groupId: groupId,
                            text: item.textPlain || item.messageData.text,
                            image: item.messageData.image,
                            replyTo: item.messageData.replyTo,
                            createdAt: item.createdAt,
                            isPending: !item.isFailed,
                            isFailed: item.isFailed,
                            isOptimistic: true,
                            isGroup: true,
                        }));
                        finalMessages = [...decryptedMessages, ...queuedMessagesMapped];
                    } catch (queueErr) {
                        console.error("Failed to load offline queue items:", queueErr);
                    }

                    set({ messages: finalMessages, hasMoreMessages: false });
                    console.log("[PWA Cache] Loaded group messages offline.");
                    return;
                }
            }
            toast.error(getErrorMessage(error, "Failed to load group messages"));
        } finally {
            if (before) {
                set({ isLoadingOlder: false });
            } else if (!silent) {
                set({ isMessagesLoading: false });
            }
        }
    },

    loadHistoryUntilMessage: async (chatId, isGroup, targetMsgId, maxPages = 5) => {
        let pagesLoaded = 0;
        let found = get().messages.some(m => m._id === targetMsgId);

        while (!found && pagesLoaded < maxPages && get().hasMoreMessages) {
            const oldestMsg = get().messages[0];
            if (!oldestMsg) break;

            if (isGroup) {
                await get().getGroupMessages(chatId, oldestMsg.createdAt);
            } else {
                await get().getMessagesByUserId(chatId, oldestMsg.createdAt);
            }
            pagesLoaded++;
            found = get().messages.some(m => m._id === targetMsgId);
        }
        return found;
    },

    refreshActiveChat: async (silent = false) => {
        const { selectedUser, activeGroup } = get();
        if (activeGroup) {
            await get().getGroupMessages(activeGroup._id, null, silent);
        } else if (selectedUser) {
            await get().getMessagesByUserId(selectedUser._id, null, silent);
        }
    },

    sendMessage: async (messageData) => {
        const { selectedUser, messages, replyingTo } = get();
        const { authUser } = userAuthStore.getState();

        const tempId = `temp-${Date.now()}`;

        const optimisticMessage = {
            _id: tempId,
            senderId: authUser._id,
            recieverId: selectedUser._id,
            text: messageData.text,
            image: messageData.image,
            replyTo: replyingTo || undefined,
            createdAt: new Date().toISOString(),
            isOptimistic: true,
            isPending: true,
            isFailed: false,
        };
        set({ messages: [...messages, optimisticMessage] });

        let payload = { ...messageData };
        if (replyingTo?._id) payload.replyTo = replyingTo._id;

        const sharedKey = selectedUser?.publicKey ? await get().getOrDeriveSharedKey(selectedUser) : null;
        if (sharedKey) {
            if (payload.text) {
                try {
                    const encrypted = await encryptMessage(payload.text, sharedKey);
                    payload.text = encrypted.ciphertext;
                    payload.iv = encrypted.iv;
                    payload.isEncrypted = true;
                } catch (err) {
                    console.error("Encryption failed for text:", err);
                }
            }
            if (payload.image) {
                try {
                    const encryptedMedia = await encryptFile(payload.image, sharedKey);
                    payload.image = encryptedMedia.encryptedDataUri;
                    payload.mediaIv = encryptedMedia.iv;
                    payload.isEncrypted = true;
                } catch (err) {
                    console.error("Encryption failed for image:", err);
                }
            }
        }

        if (!navigator.onLine) {
            const queuedMsg = {
                queueId: tempId,
                recipientId: selectedUser._id,
                groupId: null,
                isGroup: false,
                messageData: payload,
                retryCount: 0,
                isFailed: false,
                createdAt: optimisticMessage.createdAt,
                tempId,
                textPlain: messageData.text,
            };
            await enqueueOfflineMessage(queuedMsg);
            await get().loadOfflineQueue();
            get().clearReplyingTo();
            return;
        }

        try {
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, payload);
            const savedMessage = { ...res.data, text: messageData.text };
            set({
                messages: get().messages.map(m => m._id === tempId ? savedMessage : m)
            });
            get().clearReplyingTo();
            playSentSound();
            get().getMyChatPartners();
        } catch (error) {
            const isNetworkError = !error.response || error.code === 'ERR_NETWORK';
            if (isNetworkError) {
                const queuedMsg = {
                    queueId: tempId,
                    recipientId: selectedUser._id,
                    groupId: null,
                    isGroup: false,
                    messageData: payload,
                    retryCount: 0,
                    isFailed: false,
                    createdAt: optimisticMessage.createdAt,
                    tempId,
                    textPlain: messageData.text,
                };
                await enqueueOfflineMessage(queuedMsg);
                await get().loadOfflineQueue();
                get().clearReplyingTo();
            } else {
                set({
                    messages: get().messages.filter(m => m._id !== tempId)
                });
                toast.error(getErrorMessage(error, "Failed to send message"));
            }
        }
    },

    sendGroupMessage: async (messageData) => {
        const { activeGroup, messages, replyingTo } = get();
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
            replyTo: replyingTo || undefined,
            createdAt: new Date().toISOString(),
            isOptimistic: true,
            isPending: true,
            isFailed: false,
        };

        set({ messages: [...messages, optimisticMessage] });

        let payload = { ...messageData };
        if (replyingTo?._id) payload.replyTo = replyingTo._id;

        const groupKey = await get().getOrDecryptGroupKey(activeGroup._id);
        if (groupKey) {
            if (payload.text) {
                try {
                    const encrypted = await encryptMessage(payload.text, groupKey);
                    payload.text = encrypted.ciphertext;
                    payload.iv = encrypted.iv;
                    payload.isEncrypted = true;
                } catch (err) {
                    console.error("[E2EE] Group message text encryption failed:", err);
                }
            }
            if (payload.image) {
                try {
                    const encryptedMedia = await encryptFile(payload.image, groupKey);
                    payload.image = encryptedMedia.encryptedDataUri;
                    payload.mediaIv = encryptedMedia.iv;
                    payload.isEncrypted = true;
                } catch (err) {
                    console.error("[E2EE] Group message image encryption failed:", err);
                }
            }
            if (payload.poll) {
                try {
                    const encryptedQuestion = await encryptMessage(payload.poll.question, groupKey);
                    payload.poll.question = encryptedQuestion.ciphertext;
                    payload.poll.iv = encryptedQuestion.iv;
                    payload.poll.options = await Promise.all(
                        payload.poll.options.map(async (opt) => {
                            const encOpt = await encryptMessage(opt.optionText, groupKey);
                            return {
                                optionText: encOpt.ciphertext,
                                iv: encOpt.iv,
                                votes: opt.votes || []
                            };
                        })
                    );
                    payload.isEncrypted = true;
                } catch (err) {
                    console.error("[E2EE] Group message poll encryption failed:", err);
                }
            }
        }

        if (!navigator.onLine) {
            const queuedMsg = {
                queueId: tempId,
                recipientId: null,
                groupId: activeGroup._id,
                isGroup: true,
                messageData: payload,
                retryCount: 0,
                isFailed: false,
                createdAt: optimisticMessage.createdAt,
                tempId,
                textPlain: messageData.text,
            };
            await enqueueOfflineMessage(queuedMsg);
            await get().loadOfflineQueue();
            get().clearReplyingTo();
            return;
        }

        try {
            const res = await axiosInstance.post(`/groups/${activeGroup._id}/messages`, payload);
            const savedMessage = { ...res.data, text: messageData.text };
            set({
                messages: get().messages.map(m => m._id === tempId ? savedMessage : m)
            });
            get().clearReplyingTo();
            playSentSound();
            get().getGroups();
        } catch (error) {
            const isNetworkError = !error.response || error.code === 'ERR_NETWORK';
            if (isNetworkError) {
                const queuedMsg = {
                    queueId: tempId,
                    recipientId: null,
                    groupId: activeGroup._id,
                    isGroup: true,
                    messageData: payload,
                    retryCount: 0,
                    isFailed: false,
                    createdAt: optimisticMessage.createdAt,
                    tempId,
                    textPlain: messageData.text,
                };
                await enqueueOfflineMessage(queuedMsg);
                await get().loadOfflineQueue();
                get().clearReplyingTo();
            } else {
                set({
                    messages: get().messages.filter(m => m._id !== tempId)
                });
                toast.error(getErrorMessage(error, "Failed to send message"));
            }
        }
    },

    subscribeToMessages: () => {
        const socket = userAuthStore.getState().socket;
        if (!socket) return;

        if (get()._cleanupCoPresenceEvents) {
            get()._cleanupCoPresenceEvents();
            set({ _cleanupCoPresenceEvents: null });
        }

        get().subscribeToTypingEvents();

        // ─── Quantum Handshake & Visibility Listeners ───
        let isVaultFocused = document.visibilityState === 'visible';
        let visibilityTimeout = null;
        
        const emitCoPresenceState = (isFocusedOverride) => {
            const currentSelectedUser = get().selectedUser;
            const partnerId = currentSelectedUser ? currentSelectedUser._id : null;
            
            let isFocused = isVaultFocused;
            if (isFocusedOverride !== undefined) {
                isFocused = isFocusedOverride;
            }
            
            socket.emit("updateCoPresenceStatus", { selectedUserId: partnerId, isFocused });
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                if (visibilityTimeout) clearTimeout(visibilityTimeout);
                visibilityTimeout = setTimeout(() => {
                    isVaultFocused = false;
                    emitCoPresenceState(false);
                    get().evaporateQuantumMessages();
                }, 8000); // 8-second grace period for tab switching / window minimize
            } else {
                if (visibilityTimeout) {
                    clearTimeout(visibilityTimeout);
                    visibilityTimeout = null;
                }
                isVaultFocused = true;
                emitCoPresenceState(true);
            }
        };

        const handleConnect = () => {
            emitCoPresenceState();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        socket.on("connect", handleConnect);

        get()._cleanupCoPresenceEvents = () => {
            if (visibilityTimeout) clearTimeout(visibilityTimeout);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            socket.off("connect", handleConnect);
        };

        emitCoPresenceState();

        // Clean up socket event handlers before registering
        socket.off("handshakeState");
        socket.off("handshakePing");
        socket.off("quantumMessageVerify");
        socket.off("newQuantumMessage");
        socket.off("quantumObserverViolated");

        // Bind socket listeners for Quantum Handshake
        socket.on("handshakeState", ({ partnerId, active }) => {
            const currentSelectedUser = get().selectedUser;
            if (currentSelectedUser && currentSelectedUser._id?.toString() === partnerId?.toString()) {
                set({ handshakeActive: active });
                if (!active) {
                    get().evaporateQuantumMessages();
                } else {
                    toast.success("Quantum Handshake Established. Co-Presence Vault active!", {
                        duration: 2500
                    });
                }
            }
        });

        socket.on("handshakePing", ({ partnerId }, ack) => {
            if (ack) ack();
        });

        socket.on("quantumMessageVerify", ({ senderId }, ack) => {
            const currentSelectedUser = get().selectedUser;
            const isCorrectChat = currentSelectedUser && currentSelectedUser._id?.toString() === senderId?.toString();
            if (ack) {
                ack({ isFocused: !!(isVaultFocused && isCorrectChat) });
            }
        });

        socket.on("newQuantumMessage", async (quantumMsg) => {
            const { selectedUser } = get();
            const isCorrectChat = selectedUser && quantumMsg.senderId?.toString() === selectedUser._id?.toString();
            if (isCorrectChat && isVaultFocused) {
                let processedMessage = quantumMsg;
                if (quantumMsg.isEncrypted && quantumMsg.text && quantumMsg.iv) {
                    try {
                        const sharedKey = await get().getOrDeriveSharedKey(selectedUser);
                        if (sharedKey) {
                            const plainText = await decryptMessage(quantumMsg.text, quantumMsg.iv, sharedKey);
                            processedMessage = { ...quantumMsg, text: plainText };
                        }
                    } catch (err) {
                        console.error("E2EE decryption failed for quantum message:", err);
                        processedMessage = { ...quantumMsg, text: "[Decryption Failed: Handshake broken]" };
                    }
                }
                get().notifyQuantumMessage(processedMessage);
                playReceivedSound();
            } else {
                console.warn("Discarding quantum message: Observer condition violated.");
                socket.emit("quantumObserverViolated", { senderId: quantumMsg.senderId });
            }
        });

        socket.off("newMessage");
        socket.off("newGroupMessage");
        socket.off("join_new_group");
        socket.off("messagePinStatus");
        socket.off("groupUpdated");
        socket.off("removedFromGroup");
        socket.off("groupDeleted");
        socket.off("messageUpdated");
        socket.off("newFriendRequest");
        socket.off("friendRequestAccepted");
        socket.off("friendRequestDeclined");
        socket.off("userBlocked");

        socket.on("newFriendRequest", (request) => {
            set({ pendingRequests: [request, ...get().pendingRequests] });
            playNotificationChime();
            toast.success(`${request.sender.fullName} sent you a friend request!`);
        });

        socket.on("friendRequestAccepted", ({ requestId, friend }) => {
            const { pendingRequests, allContacts, sentRequests, searchResults } = get();
            set({
                pendingRequests: pendingRequests.filter(r => r._id !== requestId),
                allContacts: [...allContacts.filter(c => c._id !== friend._id), friend],
                sentRequests: sentRequests.map(r => r._id === requestId ? { ...r, status: "accepted" } : r),
                searchResults: searchResults.map(user => {
                    if (user.requestId === requestId || user._id === friend._id) {
                        return { ...user, relationship: "friends" };
                    }
                    return user;
                })
            });
            playNotificationChime();
            toast.success(`${friend.fullName} accepted your friend request!`);
        });

        socket.on("friendRequestDeclined", ({ requestId }) => {
            const { sentRequests, searchResults } = get();
            set({
                sentRequests: sentRequests.map(r => r._id === requestId ? { ...r, status: "declined" } : r),
                searchResults: searchResults.map(user => {
                    if (user.requestId === requestId) {
                        return { ...user, relationship: "sent-declined" };
                    }
                    return user;
                })
            });
        });

        socket.on("userBlocked", ({ blockedBy }) => {
            const { selectedUser, allContacts } = get();

            // Remove from contacts list
            set({
                allContacts: allContacts.filter(c => c._id !== blockedBy)
            });

            // If active DM chat is with blocker, close it
            if (selectedUser && selectedUser._id === blockedBy) {
                set({ selectedUser: null });
                toast.error("This conversation is no longer available.");
            }
        });

        socket.on("newMessage", async (newMessage) => {
            const { selectedUser, isSoundEnabled, chats, callHistory } = get();
            const { authUser } = userAuthStore.getState();

            // Ignore messages sent by ourselves, EXCEPT for call logs
            if (newMessage.senderId === authUser._id && !newMessage.callInfo) return;

            let processedMessage = newMessage;
            let plainText = "";

            if (newMessage.isEncrypted && newMessage.text && newMessage.iv) {
                const isSelected = selectedUser && newMessage.senderId === selectedUser._id;
                const partner = isSelected ? selectedUser : chats.find(c => c._id === newMessage.senderId);

                if (partner && partner.publicKey) {
                    try {
                        const sharedKey = await get().getOrDeriveSharedKey(partner);
                        if (sharedKey) {
                            plainText = await decryptMessage(newMessage.text, newMessage.iv, sharedKey);
                            processedMessage = { ...newMessage, text: plainText };
                        }
                    } catch (err) {
                        console.error("Failed to decrypt incoming message:", err);
                        plainText = "[Decryption Failed: Private key rotated or missing]";
                        processedMessage = { ...newMessage, text: plainText, isDecryptionFailed: true };
                    }
                } else {
                    plainText = "[Decryption Failed: Private key missing]";
                    processedMessage = { ...newMessage, text: plainText };
                }
            }

            // Prepend call log to history
            if (newMessage.callInfo) {
                set({ callHistory: [processedMessage, ...callHistory] });
            }

            const isMessageSentFromSelectedUser = selectedUser && newMessage.senderId === selectedUser._id;
            const isRelevantCallLog = newMessage.callInfo && selectedUser && (
                (newMessage.senderId === authUser._id && newMessage.recieverId === selectedUser._id) ||
                (newMessage.senderId === selectedUser._id && newMessage.recieverId === authUser._id)
            );

            if (isMessageSentFromSelectedUser || isRelevantCallLog) {
                set({
                    messages: [...get().messages, processedMessage],
                });
                get().markMessagesAsRead(selectedUser._id);
            } else {
                const isOurCallLog = newMessage.callInfo && newMessage.senderId === authUser._id;
                const partnerId = newMessage.senderId === authUser._id ? newMessage.recieverId : newMessage.senderId;
                const isMuted = get().mutedChats.includes(partnerId);

                if (!isOurCallLog && !isMuted) {
                    playReceivedSound();
                }

                const previewText = newMessage.callInfo
                    ? (newMessage.callInfo.type === "video" ? "Video call" : "Voice call")
                    : (newMessage.isEncrypted ? plainText : newMessage.text);

                set({
                    chats: chats.map(c =>
                        c._id === partnerId
                            ? {
                                ...c,
                                unreadCount: isOurCallLog ? (c.unreadCount || 0) : ((c.unreadCount || 0) + 1),
                                lastMessage: { ...newMessage, text: previewText }
                            }
                            : c
                    )
                });

                const chatExists = chats.some(c => c._id === partnerId);
                if (!chatExists) {
                    get().getMyChatPartners();
                }
            }
        });

        socket.on("newGroupMessage", async (newMessage) => {
            const { activeGroup, isSoundEnabled, groups } = get();
            const { authUser } = userAuthStore.getState();

            // Ignore messages sent by ourselves
            const senderId = newMessage.senderId?._id || newMessage.senderId;
            if (senderId === authUser._id) return;

            let processedMessage = newMessage;
            let plainText = "";

            if (newMessage.isEncrypted) {
                try {
                    const groupKey = await get().getOrDecryptGroupKey(newMessage.groupId);
                    if (groupKey) {
                        processedMessage = await decryptSingleGroupMessage(newMessage, groupKey);
                        plainText = processedMessage.text || "";
                    } else {
                        plainText = "[Decryption Failed: Group Key missing]";
                        processedMessage = { ...newMessage, text: plainText, isDecryptionFailed: true };
                    }
                } catch (err) {
                    console.error("Failed to decrypt incoming group message:", err);
                    plainText = "[Decryption Failed: Keys rotated or missing]";
                    processedMessage = { ...newMessage, text: plainText, isDecryptionFailed: true };
                }
            }

            const isGroupActive = activeGroup && newMessage.groupId === activeGroup._id;

            if (isGroupActive) {
                set({
                    messages: [...get().messages, processedMessage],
                });
                get().markGroupAsRead(activeGroup._id);
                if (newMessage.isAnnouncement) {
                    const isMuted = get().mutedChats.includes(newMessage.groupId);
                    if (!isMuted) {
                        playReceivedSound(true);
                    }
                }
            } else {
                const isMuted = get().mutedChats.includes(newMessage.groupId);
                if (!isMuted) {
                    playReceivedSound(newMessage.isAnnouncement);
                }

                const previewText = newMessage.isEncrypted ? plainText : newMessage.text;
                set({
                    groups: groups.map(g => {
                        if (g._id === newMessage.groupId) {
                            return {
                                ...g,
                                lastMessage: { ...newMessage, text: previewText },
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

        socket.on("messagePinStatus", async (updatedMessage) => {
            const decryptedMsg = await get().decryptSingleMessage(updatedMessage);
            const { messages } = get();
            const updatedMessages = messages.map(msg =>
                msg._id === updatedMessage._id ? decryptedMsg : msg
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

        socket.on("groupDeleted", ({ groupId }) => {
            const { groups, activeGroup } = get();

            // Delete local Group Key from IndexedDB and memory
            storeGroupKey(groupId, null).catch(err => console.error("Failed to delete group key locally:", err));
            const newGroupKeys = { ...get().groupKeys };
            delete newGroupKeys[groupId];

            set({
                groups: groups.filter(g => g._id !== groupId),
                activeGroup: activeGroup && activeGroup._id === groupId ? null : activeGroup,
                groupKeys: newGroupKeys
            });
            if (activeGroup && activeGroup._id === groupId) {
                toast.error("This group has been deleted by the owner.");
            }
        });

        socket.on("messageUpdated", async (updatedMessage) => {
            const decryptedMsg = await get().decryptSingleMessage(updatedMessage);
            const { messages } = get();
            const updatedMessages = messages.map(msg =>
                msg._id === updatedMessage._id ? decryptedMsg : msg
            );
            set({ messages: updatedMessages });
        });

        // Also emit join_groups for all loaded groups
        const { groups } = get();
        if (groups.length > 0) {
            socket.emit("join_groups", groups.map(g => g._id));
        }
    },

    unsubscribeFromMessages: () => {
        const socket = userAuthStore.getState().socket;

        get().unsubscribeFromTypingEvents();

        if (get()._cleanupCoPresenceEvents) {
            get()._cleanupCoPresenceEvents();
            get()._cleanupCoPresenceEvents = null;
        }

        if (socket) {
            socket.emit("updateCoPresenceStatus", { selectedUserId: null, isFocused: false });
            socket.off("handshakeState");
            socket.off("handshakePing");
            socket.off("quantumMessageVerify");
            socket.off("newQuantumMessage");
            socket.off("quantumObserverViolated");
        }

        set({ handshakeActive: false });
        get().evaporateQuantumMessages();

        socket?.off("newMessage");
        socket?.off("newGroupMessage");
        socket?.off("join_new_group");
        socket?.off("messagePinStatus");
        socket?.off("groupUpdated");
        socket?.off("removedFromGroup");
        socket?.off("groupDeleted");
        socket?.off("messageUpdated");
        socket?.off("newFriendRequest");
        socket?.off("friendRequestAccepted");
        socket?.off("friendRequestDeclined");
        socket?.off("userBlocked");
    },

    // Typing Indicator Logic
    isTyping: false,

    sendTyping: () => {
        const { selectedUser } = get();
        const socket = userAuthStore.getState().socket;
        if (!selectedUser || !socket) return;

        // Throttle emits to once every 3 seconds
        const now = Date.now();
        if (get().lastTypingEmit && now - get().lastTypingEmit < 3000) return;
        set({ lastTypingEmit: now });

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

        // Throttle emits to once every 3 seconds
        const now = Date.now();
        if (get().lastGroupTypingEmit && now - get().lastGroupTypingEmit < 3000) return;
        set({ lastGroupTypingEmit: now });

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
            const { dmTypingUsers, typingTimeouts } = get();

            if (typingTimeouts[senderId]) {
                clearTimeout(typingTimeouts[senderId]);
            }

            const timeoutId = setTimeout(() => {
                const { dmTypingUsers: currentDmTyping, typingTimeouts: currentTimeouts } = get();
                const newTimeouts = { ...currentTimeouts };
                delete newTimeouts[senderId];

                set({
                    dmTypingUsers: { ...currentDmTyping, [senderId]: false },
                    typingTimeouts: newTimeouts
                });

                const { selectedUser } = get();
                if (selectedUser && selectedUser._id === senderId) {
                    set({ isTyping: false });
                }
            }, 4000);

            set({
                dmTypingUsers: { ...dmTypingUsers, [senderId]: true },
                typingTimeouts: { ...typingTimeouts, [senderId]: timeoutId }
            });

            const { selectedUser } = get();
            if (selectedUser && selectedUser._id === senderId) {
                set({ isTyping: true });
            }
        });

        socket.on("stopTyping", (senderId) => {
            const { dmTypingUsers, typingTimeouts } = get();

            if (typingTimeouts[senderId]) {
                clearTimeout(typingTimeouts[senderId]);
            }

            const newTimeouts = { ...typingTimeouts };
            delete newTimeouts[senderId];

            set({
                dmTypingUsers: { ...dmTypingUsers, [senderId]: false },
                typingTimeouts: newTimeouts
            });

            const { selectedUser } = get();
            if (selectedUser && selectedUser._id === senderId) {
                set({ isTyping: false });
            }
        });

        socket.on("groupTyping", ({ groupId, userId }) => {
            const { groupTypingUsers, groupTypingTimeouts } = get();
            const { authUser } = userAuthStore.getState();
            if (userId === authUser._id) return;

            const groupTimeouts = groupTypingTimeouts[groupId] || {};
            if (groupTimeouts[userId]) {
                clearTimeout(groupTimeouts[userId]);
            }

            const timeoutId = setTimeout(() => {
                const { groupTypingUsers: currentGroupTyping, groupTypingTimeouts: currentGroupTimeouts } = get();
                const currentTyping = currentGroupTyping[groupId] || [];
                const updatedTyping = currentTyping.filter(id => id !== userId);

                const nextGroupTimeouts = { ...currentGroupTimeouts[groupId] };
                delete nextGroupTimeouts[userId];

                set({
                    groupTypingUsers: {
                        ...currentGroupTyping,
                        [groupId]: updatedTyping
                    },
                    groupTypingTimeouts: {
                        ...currentGroupTimeouts,
                        [groupId]: nextGroupTimeouts
                    }
                });
            }, 4000);

            const currentTyping = groupTypingUsers[groupId] || [];
            const updatedTyping = currentTyping.includes(userId) ? currentTyping : [...currentTyping, userId];

            set({
                groupTypingUsers: {
                    ...groupTypingUsers,
                    [groupId]: updatedTyping
                },
                groupTypingTimeouts: {
                    ...groupTypingTimeouts,
                    [groupId]: {
                        ...groupTimeouts,
                        [userId]: timeoutId
                    }
                }
            });
        });

        socket.on("groupStopTyping", ({ groupId, userId }) => {
            const { groupTypingUsers, groupTypingTimeouts } = get();
            const groupTimeouts = groupTypingTimeouts[groupId] || {};
            if (groupTimeouts[userId]) {
                clearTimeout(groupTimeouts[userId]);
            }

            const nextGroupTimeouts = { ...groupTimeouts };
            delete nextGroupTimeouts[userId];

            const currentTyping = groupTypingUsers[groupId] || [];
            set({
                groupTypingUsers: {
                    ...groupTypingUsers,
                    [groupId]: currentTyping.filter(id => id !== userId)
                },
                groupTypingTimeouts: {
                    ...groupTypingTimeouts,
                    [groupId]: nextGroupTimeouts
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

        const { typingTimeouts, groupTypingTimeouts } = get();
        Object.values(typingTimeouts).forEach(clearTimeout);
        Object.values(groupTypingTimeouts).forEach(groupObj => {
            Object.values(groupObj).forEach(clearTimeout);
        });

        set({ typingTimeouts: {}, groupTypingTimeouts: {}, dmTypingUsers: {} });
    },

    deleteMessage: async (messageId) => {
        const { messages, callHistory, activeGroup } = get();
        // Mark message as isDeleting to trigger exit animation in components
        set({
            messages: messages.map(m => m._id === messageId ? { ...m, isDeleting: true } : m),
            callHistory: (callHistory || []).map(m => m._id === messageId ? { ...m, isDeleting: true } : m)
        });

        try {
            await axiosInstance.delete(`/messages/${messageId}`);
            setTimeout(() => {
                const currentMessages = get().messages;
                const currentCallHistory = get().callHistory || [];
                set({
                    messages: currentMessages.filter(m => m._id !== messageId),
                    callHistory: currentCallHistory.filter(m => m._id !== messageId)
                });
            }, 350);
            toast.success("Message deleted");
            if (activeGroup) {
                get().getGroups();
            } else {
                get().getMyChatPartners();
            }
        } catch (error) {
            // Revert deletion flag on failure
            set({
                messages: get().messages.map(m => m._id === messageId ? { ...m, isDeleting: false } : m),
                callHistory: (get().callHistory || []).map(m => m._id === messageId ? { ...m, isDeleting: false } : m)
            });
            toast.error(getErrorMessage(error, "Failed to delete message"));
        }
    },

    subscribeToDeleteEvents: () => {
        const socket = userAuthStore.getState().socket;
        socket?.on("deleteMessage", (messageId) => {
            const { messages, callHistory } = get();
            set({
                messages: messages.map(m => m._id === messageId ? { ...m, isDeleting: true } : m),
                callHistory: (callHistory || []).map(m => m._id === messageId ? { ...m, isDeleting: true } : m)
            });
            setTimeout(() => {
                const currentMessages = get().messages;
                const currentCallHistory = get().callHistory || [];
                set({
                    messages: currentMessages.filter(m => m._id !== messageId),
                    callHistory: currentCallHistory.filter(m => m._id !== messageId)
                });
            }, 350);
        });
    },

    unsubscribeFromDeleteEvents: () => {
        const socket = userAuthStore.getState().socket;
        socket?.off("deleteMessage");
    },

    addReaction: async (messageId, emoji) => {
        try {
            const res = await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
            const decrypted = await get().decryptSingleMessage(res.data);
            const { messages } = get();
            const updatedMessages = messages.map(msg =>
                msg._id === messageId ? decrypted : msg
            );
            set({ messages: updatedMessages });
            // Dispatch visual event for local reaction
            window.dispatchEvent(new CustomEvent('message-reaction-added', { detail: { messageId, emoji } }));
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to add reaction"));
        }
    },

    subscribeToReactionEvents: () => {
        const socket = userAuthStore.getState().socket;
        socket?.on("messageReaction", ({ messageId, reactions }) => {
            const { messages } = get();
            const oldMsg = messages.find(m => m._id === messageId);
            const oldLen = oldMsg?.reactions?.length || 0;
            const newLen = reactions?.length || 0;

            const updatedMessages = messages.map(msg =>
                msg._id === messageId ? { ...msg, reactions } : msg
            );
            set({ messages: updatedMessages });

            // Dispatch visual event for remote reactions
            if (newLen > oldLen && reactions && reactions.length > 0) {
                const newest = reactions[reactions.length - 1];
                window.dispatchEvent(new CustomEvent('message-reaction-added', { detail: { messageId, emoji: newest.emoji } }));
            }
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
            // Silence network error logs as they are expected during connectivity changes
            if (error.response || error.code !== 'ERR_NETWORK') {
                console.error("Failed to mark messages as read:", error);
            }
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
                        readBy: [
                            ...(msg.readBy || []).filter(r => (r.userId?._id || r.userId)?.toString() !== readBy.toString()),
                            { userId: readBy, readAt }
                        ]
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
            const decrypted = await get().decryptSingleMessage(res.data);
            const { messages } = get();
            const updatedMessages = messages.map(msg =>
                msg._id === messageId ? decrypted : msg
            );
            set({ messages: updatedMessages });
            toast.success("Message edited");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to edit message"));
        }
    },

    subscribeToEditEvents: () => {
        const socket = userAuthStore.getState().socket;
        socket?.on("messageEdited", async (editedMessage) => {
            const decryptedMsg = await get().decryptSingleMessage(editedMessage);
            const { messages } = get();
            const updatedMessages = messages.map(msg =>
                msg._id === editedMessage._id ? decryptedMsg : msg
            );
            set({ messages: updatedMessages });
        });
    },

    unsubscribeFromEditEvents: () => {
        const socket = userAuthStore.getState().socket;
        socket?.off("messageEdited");
    },

    clearChat: async (chatId) => {
        try {
            await axiosInstance.delete(`/messages/clear/${chatId}`);
            set({ messages: [] });
            toast.success("Chat cleared");
            get().getMyChatPartners();
            get().getGroups();
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to clear chat"));
        }
    },

    subscribeToClearEvents: () => {
        const socket = userAuthStore.getState().socket;
        socket?.on("chatCleared", ({ senderId }) => {
            const { selectedUser } = get();
            if (selectedUser && selectedUser._id === senderId) {
                set({ messages: [] });
            }
            get().getMyChatPartners();
        });
        socket?.on("groupChatCleared", ({ groupId }) => {
            const { activeGroup } = get();
            if (activeGroup && activeGroup._id === groupId) {
                set({ messages: [] });
            }
            get().getGroups();
        });
    },

    unsubscribeFromClearEvents: () => {
        const socket = userAuthStore.getState().socket;
        socket?.off("chatCleared");
        socket?.off("groupChatCleared");
    },

    uploadFile: async (fileObj) => {
        const { selectedUser, activeGroup, replyingTo } = get();
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
            if (replyingTo?._id) payload.replyTo = replyingTo._id;

            const encryptionKey = activeGroup
                ? await get().getOrDecryptGroupKey(activeGroup._id)
                : (selectedUser?.publicKey ? await get().getOrDeriveSharedKey(selectedUser) : null);

            if (encryptionKey) {
                try {
                    const encryptedMedia = await encryptFile(fileObj.fileData, encryptionKey);
                    payload.file = encryptedMedia.encryptedDataUri;
                    payload.mediaIv = encryptedMedia.iv;
                    payload.isEncrypted = true;
                } catch (encryptErr) {
                    console.error("Failed to encrypt uploaded file client-side:", encryptErr);
                }
            }

            if (activeGroup) {
                res = await axiosInstance.post(`/groups/${activeGroup._id}/messages`, payload, config);
                set({ messages: [...get().messages, res.data] });
                get().getGroups();
            } else {
                res = await axiosInstance.post(`/messages/upload/${selectedUser._id}`, payload, config);
                set({ messages: [...get().messages, res.data] });
                get().getMyChatPartners();
            }
            get().clearReplyingTo();
            toast.success("File sent");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to upload file"));
        } finally {
            set({ uploadProgress: null });
        }
    },

    sendAudio: async (audioData, duration) => {
        const { selectedUser, activeGroup, messages, replyingTo } = get();
        try {
            let res;
            const payload = {
                audioUrl: audioData,
                audioDuration: duration
            };
            if (replyingTo?._id) payload.replyTo = replyingTo._id;

            const encryptionKey = activeGroup
                ? await get().getOrDecryptGroupKey(activeGroup._id)
                : (selectedUser?.publicKey ? await get().getOrDeriveSharedKey(selectedUser) : null);

            if (encryptionKey) {
                try {
                    const encryptedMedia = await encryptFile(audioData, encryptionKey);
                    payload.audioUrl = encryptedMedia.encryptedDataUri;
                    payload.mediaIv = encryptedMedia.iv;
                    payload.isEncrypted = true;
                } catch (encryptErr) {
                    console.error("Failed to encrypt audio client-side:", encryptErr);
                }
            }

            if (activeGroup) {
                res = await axiosInstance.post(`/groups/${activeGroup._id}/messages`, payload);
                set({ messages: [...messages, res.data] });
                get().getGroups();
            } else {
                res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, payload);
                set({ messages: [...messages, res.data] });
                get().getMyChatPartners();
            }
            get().clearReplyingTo();
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to send audio"));
        }
    },

    searchMessages: async (query, type) => {
        try {
            const { selectedUser, activeGroup } = get();
            const params = {};
            if (query) params.query = query;
            if (activeGroup) {
                params.groupId = activeGroup._id;
            } else if (selectedUser) {
                params.userId = selectedUser._id;
            }
            if (type && type !== 'all') params.type = type;
            const res = await axiosInstance.get('/messages/search', { params });
            
            // Decrypt each message returned from the search backend
            const decryptedMessages = await Promise.all(
                res.data.map(async (msg) => {
                    try {
                        return await get().decryptSingleMessage(msg);
                    } catch (e) {
                        console.error("Error decrypting search result message:", e);
                        return msg;
                    }
                })
            );
            return decryptedMessages;
        } catch (error) {
            toast.error(getErrorMessage(error, "Search failed"));
            return [];
        }
    },

    togglePinMessage: async (messageId) => {
        try {
            const res = await axiosInstance.post(`/messages/${messageId}/pin`);
            const decrypted = await get().decryptSingleMessage(res.data);
            const { messages } = get();
            const updatedMessages = messages.map(msg =>
                msg._id === messageId ? decrypted : msg
            );
            set({ messages: updatedMessages });
            if (decrypted.isPinned) {
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
            const decrypted = await get().decryptSingleMessage(res.data);
            const { messages, starredMessages } = get();

            // Update in active conversation messages
            const updatedMessages = messages.map(msg =>
                msg._id === messageId ? decrypted : msg
            );
            set({ messages: updatedMessages });

            // Update in starredMessages array
            const authUser = userAuthStore.getState().authUser;
            const isStarred = decrypted.starredBy?.includes(authUser?._id);

            let newStarred = [...(starredMessages || [])];
            if (isStarred) {
                if (!newStarred.some(m => m._id === messageId)) {
                    newStarred.push(decrypted);
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
            const decrypted = await Promise.all(
                (res.data || []).map(async (msg) => {
                    return await get().decryptSingleMessage(msg);
                })
            );
            set({ starredMessages: decrypted });
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to fetch starred messages"));
        }
    },

    getPinnedMessages: async (chatId, isGroup) => {
        try {
            const res = await axiosInstance.get(`/messages/${chatId}/pinned`, { params: { isGroup } });
            
            // Decrypt each message returned from the backend
            const decryptedMessages = await Promise.all(
                res.data.map(async (msg) => {
                    try {
                        return await get().decryptSingleMessage(msg);
                    } catch (e) {
                        console.error("Error decrypting pinned message:", e);
                        return msg;
                    }
                })
            );
            return decryptedMessages;
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to load pinned messages"));
            return [];
        }
    },

    getCallHistory: async () => {
        set({ isCallHistoryLoading: true });
        try {
            const res = await axiosInstance.get('/messages/calls/history');
            set({ callHistory: res.data });
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to fetch call history"));
        } finally {
            set({ isCallHistoryLoading: false });
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
            const { allContacts } = get();
            const myPrivateKey = await getPrivateKey();
            const groupKeyJwk = await getGroupKeyFromStore(groupId);
            const newKeys = [];

            if (groupKeyJwk && myPrivateKey) {
                for (const memberId of userIds) {
                    const memberUser = allContacts.find(c => c._id === memberId);
                    if (memberUser && memberUser.publicKey) {
                        try {
                            const sharedKey = await deriveSharedKey(myPrivateKey, memberUser.publicKey);
                            const encForMember = await encryptGroupKey(groupKeyJwk, sharedKey);
                            newKeys.push({
                                userId: memberId,
                                encryptedKey: encForMember.encryptedKey,
                                iv: encForMember.iv
                            });
                        } catch (err) {
                            console.error(`Failed to encrypt group key for new member ${memberId}:`, err);
                        }
                    }
                }
            }

            const res = await axiosInstance.post(`/groups/${groupId}/members/add`, { userIds, newKeys });
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
            const group = get().groups.find(g => g._id === groupId) || get().activeGroup;
            const myPrivateKey = await getPrivateKey();
            const { allContacts } = get();
            const { authUser } = userAuthStore.getState();

            let rotatedKeys = null;
            let newGroupKeyJwk = null;

            if (group && myPrivateKey && authUser) {
                try {
                    newGroupKeyJwk = await generateGroupKey();
                    rotatedKeys = [];

                    // Filter out the removed member from the group member list
                    const remainingMembers = group.members.filter(m => {
                        const id = m.userId?._id || m.userId;
                        return id.toString() !== userIdToRemove.toString();
                    });

                    for (const member of remainingMembers) {
                        const memberId = member.userId?._id || member.userId;
                        let memberUser = null;

                        if (memberId.toString() === authUser._id.toString()) {
                            memberUser = authUser;
                        } else {
                            memberUser = allContacts.find(c => c._id === memberId.toString());
                        }

                        if (memberUser && memberUser.publicKey) {
                            try {
                                const sharedKey = await deriveSharedKey(myPrivateKey, memberUser.publicKey);
                                const encForMember = await encryptGroupKey(newGroupKeyJwk, sharedKey);
                                rotatedKeys.push({
                                    userId: memberId,
                                    encryptedKey: encForMember.encryptedKey,
                                    iv: encForMember.iv
                                });
                            } catch (err) {
                                console.error(`Failed to encrypt rotated group key for ${memberId}:`, err);
                            }
                        }
                    }
                } catch (cryptoErr) {
                    console.error("Failed to generate/encrypt rotated group key during member removal:", cryptoErr);
                }
            }

            const payload = { userIdToRemove };
            if (rotatedKeys) {
                payload.rotatedKeys = rotatedKeys;
            }

            const res = await axiosInstance.post(`/groups/${groupId}/members/remove`, payload);
            const updatedGroup = res.data;

            // Save the new rotated group key locally
            if (newGroupKeyJwk) {
                try {
                    await storeGroupKey(groupId, newGroupKeyJwk);
                    const cryptoKey = await importGroupKey(newGroupKeyJwk);
                    set({
                        groupKeys: {
                            ...get().groupKeys,
                            [groupId]: cryptoKey
                        }
                    });
                } catch (storeErr) {
                    console.error("Failed to store rotated group key locally:", storeErr);
                }
            }

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

            // Delete local Group Key from IndexedDB and memory
            await storeGroupKey(groupId, null);
            const newGroupKeys = { ...get().groupKeys };
            delete newGroupKeys[groupId];

            set({
                groups: groups.filter(g => g._id !== groupId),
                activeGroup: activeGroup && activeGroup._id === groupId ? null : activeGroup,
                groupKeys: newGroupKeys
            });
            toast.success("Successfully left group");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to leave group"));
        }
    },

    deleteGroup: async (groupId) => {
        try {
            await axiosInstance.delete(`/groups/${groupId}`);
            const { groups, activeGroup } = get();

            // Delete local Group Key from IndexedDB and memory
            await storeGroupKey(groupId, null);
            const newGroupKeys = { ...get().groupKeys };
            delete newGroupKeys[groupId];

            set({
                groups: groups.filter(g => g._id !== groupId),
                activeGroup: activeGroup && activeGroup._id === groupId ? null : activeGroup,
                groupKeys: newGroupKeys
            });
            toast.success("Group deleted successfully");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to delete group"));
        }
    },

    castPollVote: async (messageId, optionIndex) => {
        try {
            const res = await axiosInstance.post(`/messages/${messageId}/poll/vote`, { optionIndex });
            const updatedMessage = res.data;
            const { activeGroup } = get();

            let decryptedMsg = updatedMessage;
            if (updatedMessage.isEncrypted && activeGroup) {
                const groupKey = await get().getOrDecryptGroupKey(activeGroup._id);
                if (groupKey) {
                    decryptedMsg = await decryptSingleGroupMessage(updatedMessage, groupKey);
                }
            }

            const { messages } = get();
            const updatedMessages = messages.map(msg =>
                msg._id === messageId ? decryptedMsg : msg
            );
            set({ messages: updatedMessages });
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to vote"));
        }
    },

    closePoll: async (messageId) => {
        try {
            const res = await axiosInstance.post(`/messages/${messageId}/poll/close`);
            const updatedMessage = res.data;
            const { activeGroup } = get();

            let decryptedMsg = updatedMessage;
            if (updatedMessage.isEncrypted && activeGroup) {
                const groupKey = await get().getOrDecryptGroupKey(activeGroup._id);
                if (groupKey) {
                    decryptedMsg = await decryptSingleGroupMessage(updatedMessage, groupKey);
                }
            }

            const { messages } = get();
            const updatedMessages = messages.map(msg =>
                msg._id === messageId ? decryptedMsg : msg
            );
            set({ messages: updatedMessages });
            toast.success("Poll closed");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to close poll"));
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

    syncOfflineMessages: async () => {
        if (!navigator.onLine) return;
        if (get().isSyncing) return;
        set({ isSyncing: true });

        try {
            const { checkAuth } = userAuthStore.getState();
            await checkAuth();
            const authUser = userAuthStore.getState().authUser;
            if (!authUser) {
                toast.error("Session Expired - Please Log In to Sync");
                set({ isSyncing: false });
                return;
            }

            const queue = await getOfflineQueue();
            if (queue.length === 0) {
                set({ isSyncing: false });
                return;
            }

            for (const item of queue) {
                if (item.isFailed) continue;
                if (!navigator.onLine) break;

                try {
                    let res;
                    if (item.isGroup) {
                        res = await axiosInstance.post(`/groups/${item.groupId}/messages`, item.messageData);
                    } else {
                        res = await axiosInstance.post(`/messages/send/${item.recipientId}`, item.messageData);
                    }

                    await dequeueOfflineMessage(item.queueId);
                    await get().loadOfflineQueue();

                    const savedMsg = res.data;
                    let decryptedMsgText = item.textPlain || savedMsg.text;
                    if (savedMsg.isEncrypted && savedMsg.text && savedMsg.iv) {
                        try {
                            const key = item.isGroup
                                ? await get().getOrDecryptGroupKey(item.groupId)
                                : (await get().getOrDeriveSharedKey({ _id: item.recipientId, publicKey: get().selectedUser?.publicKey }));
                            if (key) {
                                decryptedMsgText = await decryptMessage(savedMsg.text, savedMsg.iv, key);
                            }
                        } catch (e) {
                            console.error("Failed to decrypt synced message:", e);
                        }
                    }
                    const finalSavedMsg = { ...savedMsg, text: decryptedMsgText };

                    const activeUserId = get().selectedUser?._id;
                    const activeGroupId = get().activeGroup?._id;

                    if ((!item.isGroup && activeUserId === item.recipientId) || (item.isGroup && activeGroupId === item.groupId)) {
                        set({
                            messages: get().messages.map(m => m._id === item.tempId ? finalSavedMsg : m)
                        });
                    }

                    if (item.isGroup) {
                        get().getGroups();
                    } else {
                        get().getMyChatPartners();
                    }
                } catch (error) {
                    console.error("Failed to sync offline message:", error);
                    const isNetworkError = !error.response || error.code === 'ERR_NETWORK';
                    if (isNetworkError) {
                        const nextRetryCount = (item.retryCount || 0) + 1;
                        if (nextRetryCount >= 5) {
                            await updateQueueItem(item.queueId, { retryCount: nextRetryCount, isFailed: true });
                            await get().loadOfflineQueue();
                            const activeUserId = get().selectedUser?._id;
                            const activeGroupId = get().activeGroup?._id;
                            if ((!item.isGroup && activeUserId === item.recipientId) || (item.isGroup && activeGroupId === item.groupId)) {
                                set({
                                    messages: get().messages.map(m => m._id === item.tempId ? { ...m, isPending: false, isFailed: true } : m)
                                });
                            }
                        } else {
                            await updateQueueItem(item.queueId, { retryCount: nextRetryCount });
                            await get().loadOfflineQueue();
                        }
                        break;
                    } else {
                        await updateQueueItem(item.queueId, { isFailed: true });
                        await get().loadOfflineQueue();
                        const serverMsg = error.response?.data?.message || error.response?.data?.error || "Message rejected by server";
                        toast.error(`Offline message sync failed: ${serverMsg}`, { id: `sync-fail-${item.queueId}`, duration: 6000 });
                        const activeUserId = get().selectedUser?._id;
                        const activeGroupId = get().activeGroup?._id;
                        if ((!item.isGroup && activeUserId === item.recipientId) || (item.isGroup && activeGroupId === item.groupId)) {
                            set({
                                messages: get().messages.map(m => m._id === item.tempId ? { ...m, isPending: false, isFailed: true } : m)
                            });
                        }
                    }
                }
            }
        } catch (outerErr) {
            console.error("Error running offline sync:", outerErr);
        } finally {
            set({ isSyncing: false });
        }
    },

    retryQueuedMessage: async (queueId) => {
        await updateQueueItem(queueId, { isFailed: false, retryCount: 0 });
        await get().loadOfflineQueue();
        set({
            messages: get().messages.map(m => m._id === queueId ? { ...m, isPending: true, isFailed: false } : m)
        });
        get().syncOfflineMessages();
    },
}));

