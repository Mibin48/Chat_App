import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { userAuthStore } from "./userAuthStore";
import { playSentSound, playReceivedSound } from "../lib/soundUtils";
import { 
    getPrivateKey, deriveSharedKey, encryptMessage, decryptMessage,
    generateGroupKey, encryptGroupKey, decryptGroupKey, importGroupKey,
    storeGroupKey, getGroupKeyFromStore, clearGroupKeys, encryptFile
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
    linkPreviews: {},
    derivedKeys: {}, // { [userId]: CryptoKey }
    groupKeys: {}, // { [groupId]: CryptoKey }
    replyingTo: null, // { _id, text, image, audioUrl, fileUrl, fileName, senderId } — the message being quoted
    hasMoreMessages: false,
    isLoadingOlder: false,


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
            } catch (e) {}
            
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
        const { derivedKeys } = get();
        if (derivedKeys[partnerUser._id]) {
            return derivedKeys[partnerUser._id];
        }

        try {
            const myPrivateKey = await getPrivateKey();
            if (!myPrivateKey || !partnerUser.publicKey) {
                return null;
            }

            const sharedKey = await deriveSharedKey(myPrivateKey, partnerUser.publicKey);
            set({
                derivedKeys: {
                    ...derivedKeys,
                    [partnerUser._id]: sharedKey
                }
            });
            return sharedKey;
        } catch (error) {
            console.error("Error in getOrDeriveSharedKey:", error);
            return null;
        }
    },

    getOrDecryptGroupKey: async (groupId) => {
        const { groupKeys } = get();
        if (groupKeys[groupId]) {
            return groupKeys[groupId];
        }

        try {
            // 1. Try local IndexedDB
            const keyJwk = await getGroupKeyFromStore(groupId);
            if (keyJwk) {
                const cryptoKey = await importGroupKey(keyJwk);
                set({
                    groupKeys: {
                        ...get().groupKeys,
                        [groupId]: cryptoKey
                    }
                });
                return cryptoKey;
            }

            // 2. Fetch from server
            let keyDoc = null;
            try {
                const res = await axiosInstance.get(`/groups/${groupId}/key`);
                keyDoc = res.data;
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    console.warn(`[E2EE] Group key not found for group ${groupId}. Attempting auto-initialization...`);
                    const group = get().groups.find(g => g._id === groupId) || get().activeGroup;
                    const myPrivateKey = await getPrivateKey();
                    const { authUser } = userAuthStore.getState();
                    const { allContacts } = get();

                    if (group && myPrivateKey && authUser) {
                        try {
                            const newGroupKeyJwk = await generateGroupKey();
                            const groupKeysPayload = [];

                            for (const member of group.members) {
                                const memberId = member.userId?._id || member.userId;
                                if (!memberId) continue;

                                let memberUser = null;
                                if (memberId.toString() === authUser._id.toString()) {
                                    memberUser = authUser;
                                } else if (member.userId && member.userId.publicKey) {
                                    memberUser = member.userId;
                                } else {
                                    memberUser = allContacts.find(c => c._id === memberId.toString());
                                }

                                if (memberUser && memberUser.publicKey) {
                                    try {
                                        const sharedKey = await deriveSharedKey(myPrivateKey, memberUser.publicKey);
                                        const encForMember = await encryptGroupKey(newGroupKeyJwk, sharedKey);
                                        groupKeysPayload.push({
                                            userId: memberId,
                                            encryptedKey: encForMember.encryptedKey,
                                            iv: encForMember.iv
                                        });
                                    } catch (encErr) {
                                        console.error(`[E2EE] Auto-init: Failed to encrypt key for member ${memberId}:`, encErr);
                                    }
                                }
                            }

                            if (groupKeysPayload.length > 0) {
                                await axiosInstance.post(`/groups/${groupId}/keys/initialize`, { groupKeys: groupKeysPayload });
                                console.log(`[E2EE] Group keys auto-initialized successfully for group ${groupId}`);

                                // Store locally & return
                                await storeGroupKey(groupId, newGroupKeyJwk);
                                const cryptoKey = await importGroupKey(newGroupKeyJwk);
                                set({
                                    groupKeys: {
                                        ...get().groupKeys,
                                        [groupId]: cryptoKey
                                    }
                                });
                                return cryptoKey;
                            }
                        } catch (initErr) {
                            console.error(`[E2EE] Failed to auto-initialize group keys for group ${groupId}:`, initErr);
                        }
                    }
                }
                throw err;
            }

            if (!keyDoc || !keyDoc.encryptedBy || !keyDoc.encryptedBy.publicKey) {
                return null;
            }

            // 3. Derive shared key with the encrypting user
            const sharedKey = await get().getOrDeriveSharedKey(keyDoc.encryptedBy);
            if (!sharedKey) return null;

            // 4. Decrypt the symmetric key
            const decryptedJwk = await decryptGroupKey(keyDoc.encryptedKey, keyDoc.iv, sharedKey);

            // 5. Store in IndexedDB & Memory
            await storeGroupKey(groupId, decryptedJwk);
            const cryptoKey = await importGroupKey(decryptedJwk);

            set({
                groupKeys: {
                    ...get().groupKeys,
                    [groupId]: cryptoKey
                }
            });
            return cryptoKey;
        } catch (error) {
            console.error(`[E2EE] Failed to resolve group key for group ${groupId}:`, error);
            return null;
        }
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

    decryptMessageList: async (messageList, partnerUser) => {
        if (!partnerUser || !partnerUser.publicKey) return messageList;

        try {
            const sharedKey = await get().getOrDeriveSharedKey(partnerUser);
            if (!sharedKey) return messageList;

            const decrypted = await Promise.all(messageList.map(async (msg) => {
                if (msg.isEncrypted && msg.text && msg.iv) {
                    try {
                        const decryptedText = await decryptMessage(msg.text, msg.iv, sharedKey);
                        return { ...msg, text: decryptedText };
                    } catch (e) {
                        console.error("Failed to decrypt message:", msg._id, e);
                        return { ...msg, text: "Decryption failed", isDecryptionFailed: true };
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

    setActiveTab: (tab) => set({ activeTab: tab }),
    setShowSearch: (showSearch) => set({ showSearch, showInfoPanel: showSearch ? false : get().showInfoPanel }),
    setShowInfoPanel: (showInfoPanel) => set({ showInfoPanel, showSearch: showInfoPanel ? false : get().showSearch }),
    setSidebarSearchQuery: (sidebarSearchQuery) => set({ sidebarSearchQuery }),
    setActivePreviewFile: (activePreviewFile) => set({ activePreviewFile }),
    setReplyingTo: (message) => set({ replyingTo: message }),
    clearReplyingTo: () => set({ replyingTo: null }),
    
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
                        console.error("Failed to decrypt lastMessage preview for:", c._id, err);
                        return {
                            ...c,
                            lastMessage: { ...c.lastMessage, text: "Message" }
                        };
                    }
                }
                return c;
            }));

            set({ chats: decryptedChats });
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
                            lastMessageDecrypted = { ...g.lastMessage, text: "Message" };
                        }
                    } catch (err) {
                        console.error("Failed to decrypt group lastMessage preview for:", g._id, err);
                        lastMessageDecrypted = { ...g.lastMessage, text: "Message" };
                    }
                }

                return {
                    ...g,
                    lastMessage: lastMessageDecrypted,
                    unreadCount: hasNew ? 1 : 0
                };
            }));

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

    getMessagesByUserId: async (userId, before = null) => {
        if (before) {
            set({ isLoadingOlder: true });
        } else {
            set({ isMessagesLoading: true, messages: [], hasMoreMessages: false });
        }
        try {
            const url = `/messages/${userId}${before ? `?before=${before}` : ''}`;
            const res = await axiosInstance.get(url);
            const { selectedUser } = get();
            const decryptedMessages = await get().decryptMessageList(res.data, selectedUser);
            
            if (before) {
                set({ 
                    messages: [...decryptedMessages, ...get().messages],
                    hasMoreMessages: decryptedMessages.length === 30
                });
            } else {
                set({ 
                    messages: decryptedMessages,
                    hasMoreMessages: decryptedMessages.length === 30
                });
            }
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to load messages"));
        } finally {
            if (before) {
                set({ isLoadingOlder: false });
            } else {
                set({ isMessagesLoading: false });
            }
        }
    },

    getGroupMessages: async (groupId, before = null) => {
        if (before) {
            set({ isLoadingOlder: true });
        } else {
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
                        if (msg.isEncrypted && msg.text && msg.iv) {
                            try {
                                const decryptedText = await decryptMessage(msg.text, msg.iv, groupKey);
                                return { ...msg, text: decryptedText };
                            } catch (e) {
                                console.error("Failed to decrypt group message:", msg._id, e);
                                return { ...msg, text: "🔒 [Decryption Failed: Keys rotated or missing]", isDecryptionFailed: true };
                            }
                        }
                        return msg;
                    }));
                } else {
                    decryptedMessages = messages.map(msg => {
                        if (msg.isEncrypted) {
                            return { ...msg, text: "🔒 [Decryption Failed: Group Key missing]", isDecryptionFailed: true };
                        }
                        return msg;
                    });
                }
            } catch (err) {
                console.error("Error decrypting group messages:", err);
            }

            if (before) {
                set({ 
                    messages: [...decryptedMessages, ...get().messages],
                    hasMoreMessages: decryptedMessages.length === 30
                });
            } else {
                set({ 
                    messages: decryptedMessages,
                    hasMoreMessages: decryptedMessages.length === 30
                });
            }
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to load group messages"));
        } finally {
            if (before) {
                set({ isLoadingOlder: false });
            } else {
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
        };
        set({ messages: [...messages, optimisticMessage] });

        try {
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

            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, payload);
            const savedMessage = { ...res.data, text: messageData.text };
            set({ messages: messages.concat(savedMessage) });
            get().clearReplyingTo();
            playSentSound();
            get().getMyChatPartners();
        } catch (error) {
            set({ messages: messages });
            toast.error(getErrorMessage(error, "Failed to send message"));
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
        };

        set({ messages: [...messages, optimisticMessage] });

        try {
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
            }

            const res = await axiosInstance.post(`/groups/${activeGroup._id}/messages`, payload);
            const savedMessage = { ...res.data, text: messageData.text };
            set({ messages: messages.concat(savedMessage) });
            get().clearReplyingTo();
            playSentSound();
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

        socket.on("newMessage", async (newMessage) => {
            const { selectedUser, isSoundEnabled, chats } = get();
            const { authUser } = userAuthStore.getState();

            // Ignore messages sent by ourselves
            if (newMessage.senderId === authUser._id) return;

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
                        plainText = "🔒 [Decryption Failed: Private key rotated or missing]";
                        processedMessage = { ...newMessage, text: plainText, isDecryptionFailed: true };
                    }
                } else {
                    plainText = "🔒 [Decryption Failed: Private key missing]";
                    processedMessage = { ...newMessage, text: plainText };
                }
            }

            const isMessageSentFromSelectedUser = selectedUser && newMessage.senderId === selectedUser._id;

            if (isMessageSentFromSelectedUser) {
                set({
                    messages: [...get().messages, processedMessage],
                });
                get().markMessagesAsRead(selectedUser._id);
            } else {
                playReceivedSound();

                const previewText = newMessage.isEncrypted ? plainText : newMessage.text;
                set({
                    chats: chats.map(c =>
                        c._id === newMessage.senderId 
                            ? { 
                                ...c, 
                                unreadCount: (c.unreadCount || 0) + 1,
                                lastMessage: { ...newMessage, text: previewText }
                              } 
                            : c
                    )
                });

                const chatExists = chats.some(c => c._id === newMessage.senderId);
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

            if (newMessage.isEncrypted && newMessage.text && newMessage.iv) {
                try {
                    const groupKey = await get().getOrDecryptGroupKey(newMessage.groupId);
                    if (groupKey) {
                        plainText = await decryptMessage(newMessage.text, newMessage.iv, groupKey);
                        processedMessage = { ...newMessage, text: plainText };
                    } else {
                        plainText = "🔒 [Decryption Failed: Group Key missing]";
                        processedMessage = { ...newMessage, text: plainText };
                    }
                } catch (err) {
                    console.error("Failed to decrypt incoming group message:", err);
                    plainText = "🔒 [Decryption Failed: Keys rotated or missing]";
                    processedMessage = { ...newMessage, text: plainText, isDecryptionFailed: true };
                }
            }

            const isGroupActive = activeGroup && newMessage.groupId === activeGroup._id;

            if (isGroupActive) {
                set({
                    messages: [...get().messages, processedMessage],
                });
                get().markGroupAsRead(activeGroup._id);
            } else {
                playReceivedSound();

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

