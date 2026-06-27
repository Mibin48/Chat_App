import React, { useState, useRef, useEffect } from 'react';
import {
    XIcon, UsersIcon, MailIcon, CalendarIcon, InfoIcon,
    ChevronRightIcon, ChevronLeftIcon, LinkIcon, FileIcon,
    FileTextIcon, PlayIcon, ExternalLinkIcon, ImageIcon,
    PhoneIcon, MapPinIcon, CakeIcon, EditIcon, UserPlusIcon,
    UserMinusIcon, ShieldIcon, CheckIcon, Crown, Megaphone, Pin as PinIcon, Ban, Lock,
    VideoIcon, SearchIcon, MoreHorizontal
} from 'lucide-react';
import { userChatStore } from '../store/userChatStore';
import { userAuthStore } from '../store/userAuthStore';
import { useCallStore } from '../store/useCallStore';
import toast from 'react-hot-toast';
import CallLogCard from './CallLogCard';
import DecryptedMedia from './DecryptedMedia';


function InfoPanel({ onClose }) {
    const {
        selectedUser, setSelectedUser, activeGroup, messages, setActivePreviewFile,
        updateGroupDetails, addMembersToGroup, removeMemberFromGroup,
        updateMemberRoleInGroup, leaveGroup, deleteGroup, allContacts, getAllContacts,
        starredMessages, getStarredMessages, toggleStarMessage,
        transferGroupOwnership, theme,
        blockedUsers, getBlockedUsers, blockUser, unblockUser,
        mutedChats, toggleMuteChat, openForwardModal,
        groups, getGroups, setSelectedGroup,
        showSearch, setShowSearch, searchMessages, getPinnedMessages, sendFriendRequest
    } = userChatStore();
    const { onlineUsers, authUser } = userAuthStore();
    const { initiateCall, isInitiating, callState } = useCallStore();
    const [viewMode, setViewMode] = useState("info"); // "info", "media", "announcements", "starred"
    const [mediaTab, setMediaTab] = useState("media"); // "media", "docs", "links"
    const [showLightbox, setShowLightbox] = useState(false);

    // Dynamic database-backed Shared Media Gallery states
    const [fullMediaFiles, setFullMediaFiles] = useState([]);
    const [fullDocFiles, setFullDocFiles] = useState([]);
    const [fullLinksList, setFullLinksList] = useState([]);
    const [isLoadingGallery, setIsLoadingGallery] = useState(false);

    // Dynamic database-backed Pinned Messages states
    const [announcementsAndPins, setAnnouncementsAndPins] = useState([]);
    const [isLoadingPins, setIsLoadingPins] = useState(false);

    // State to prompt sending friend request without browser alerts
    const [friendPromptUser, setFriendPromptUser] = useState(null);

    // State to filter group members in full list view
    const [memberSearchQuery, setMemberSearchQuery] = useState("");

    // State to track which group member's context menu is open
    const [activeMemberMenuId, setActiveMemberMenuId] = useState(null);

    // Close member context menu on click outside
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (activeMemberMenuId && !e.target.closest('.member-menu-container')) {
                setActiveMemberMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [activeMemberMenuId]);

    // Fetch chronological media gallery from search API
    useEffect(() => {
        if (viewMode === "media") {
            const loadGallery = async () => {
                setIsLoadingGallery(true);
                try {
                    // Fetch images & videos
                    const imgs = await searchMessages("", "image");
                    const mappedImgs = imgs.map(msg => {
                        const isVideo = msg.fileUrl && (msg.fileType?.startsWith("video/") || ['mp4', 'webm', 'mov', 'ogg'].some(ext => msg.fileName?.toLowerCase().endsWith(`.${ext}`)));
                        return {
                            ...msg,
                            url: msg.image || msg.fileUrl,
                            name: msg.fileName || (msg.image ? 'Photo' : 'Video'),
                            type: msg.image ? 'image' : 'video',
                        };
                    });
                    setFullMediaFiles(mappedImgs);

                    // Fetch documents
                    const docs = await searchMessages("", "file");
                    const mappedDocs = docs.map(msg => {
                        const isPdf = msg.fileType?.toLowerCase().includes('pdf') || msg.fileName?.toLowerCase().endsWith('.pdf');
                        return {
                            ...msg,
                            url: msg.fileUrl,
                            name: msg.fileName || 'Document',
                            type: isPdf ? 'pdf' : 'other',
                        };
                    });
                    setFullDocFiles(mappedDocs);

                    // Fetch links
                    const links = await searchMessages("", "link");
                    const mappedLinks = [];
                    const urlRegex = /(https?:\/\/[^\s]+)/g;
                    links.forEach(msg => {
                        if (msg.text) {
                            const matches = msg.text.match(urlRegex);
                            if (matches) {
                                matches.forEach(url => {
                                    mappedLinks.push({
                                        url,
                                        createdAt: msg.createdAt
                                    });
                                });
                            }
                        }
                    });
                    setFullLinksList(mappedLinks);
                } catch (err) {
                    console.error("Failed to load media gallery:", err);
                } finally {
                    setIsLoadingGallery(false);
                }
            };
            loadGallery();
        }
    }, [viewMode, searchMessages]);

    // Fetch pinned messages and announcements from database
    useEffect(() => {
        if (viewMode === "announcements") {
            const loadPins = async () => {
                setIsLoadingPins(true);
                try {
                    const chatId = activeGroup ? activeGroup._id : selectedUser?._id;
                    if (chatId) {
                        const list = await getPinnedMessages(chatId, !!activeGroup);
                        
                        // Also include any local announcements from memory if in a group
                        if (activeGroup) {
                            const memoryAnnouncements = messages.filter(m => m.isAnnouncement && !m.isPinned);
                            // Combine them avoiding duplicates
                            const combined = [...list];
                            memoryAnnouncements.forEach(ann => {
                                if (!combined.some(c => c._id === ann._id)) {
                                    combined.push(ann);
                                }
                            });
                            combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                            setAnnouncementsAndPins(combined);
                        } else {
                            setAnnouncementsAndPins(list);
                        }
                    }
                } catch (err) {
                    console.error("Failed to load pinned messages:", err);
                } finally {
                    setIsLoadingPins(false);
                }
            };
            loadPins();
        }
    }, [viewMode, activeGroup, selectedUser, getPinnedMessages, messages]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && showLightbox) {
                setShowLightbox(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showLightbox]);

    const currentTargetId = activeGroup ? activeGroup._id : selectedUser?._id;
    const notificationsEnabled = currentTargetId ? !mutedChats.includes(currentTargetId) : true;

    // Group editing states
    const [isEditingGroup, setIsEditingGroup] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [editedDesc, setEditedDesc] = useState("");
    const [editedAvatar, setEditedAvatar] = useState("");
    const groupAvatarInputRef = useRef(null);

    // Add members states
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState([]);

    const isMeAdmin = activeGroup?.members?.some(m => m.userId?._id === authUser?._id && m.role === 'admin');

    useEffect(() => {
        if (viewMode === "starred") {
            getStarredMessages();
        }
    }, [viewMode, getStarredMessages]);

    useEffect(() => {
        if (selectedUser && getBlockedUsers) {
            getBlockedUsers();
        }
    }, [selectedUser, getBlockedUsers]);

    // Fetch contacts on mount to make sure friend check runs against latest state
    useEffect(() => {
        if (getAllContacts) {
            getAllContacts();
        }
    }, [getAllContacts]);

    useEffect(() => {
        if (selectedUser && getGroups) {
            getGroups();
        }
    }, [selectedUser, getGroups]);

    const isBlocked = blockedUsers?.some(u => (u._id || u) === selectedUser?._id);

    const handleBlockToggle = async () => {
        if (!selectedUser) return;
        if (isBlocked) {
            if (window.confirm(`Are you sure you want to unblock ${selectedUser.fullName}?`)) {
                const success = await unblockUser(selectedUser._id);
                if (success) {
                    onClose();
                }
            }
        } else {
            if (window.confirm(`Are you sure you want to block ${selectedUser.fullName}? You will not be able to message each other or send friend requests.`)) {
                const success = await blockUser(selectedUser._id);
                if (success) {
                    onClose();
                }
            }
        }
    };

    const handleMemberClick = async (memberUser) => {
        if (!memberUser || memberUser._id === authUser?._id) return;
        
        // Find fully populated contact details from friends list to load keys/chat correctly
        const contactUser = allContacts?.find(c => (c._id || c).toString() === memberUser._id?.toString());
        if (contactUser) {
            // NOTE: setSelectedUser already sets activeGroup: null internally,
            // so do NOT also call setSelectedGroup(null) — that would overwrite selectedUser back to null.
            setSelectedUser(contactUser);
            onClose();
        } else {
            setFriendPromptUser(memberUser);
        }
    };

    const renderMemberMenu = (member, memberUser) => {
        if (!memberUser || memberUser._id === authUser?._id) return null;

        const isCreator = activeGroup?.creatorId?.toString() === memberUser._id?.toString();
        const isMeCreator = activeGroup?.creatorId?.toString() === authUser?._id?.toString();
        const isFriend = allContacts?.some(c => (c._id || c).toString() === memberUser._id?.toString());
        const hasManagePermission = (isMeAdmin && !isCreator) || (isMeCreator && !isCreator);
        const isOpen = activeMemberMenuId === memberUser._id;

        return (
            <div className="relative member-menu-container flex-shrink-0 z-20">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setActiveMemberMenuId(isOpen ? null : memberUser._id);
                    }}
                    className="group-addons-btn p-1.5 rounded-lg hover:bg-[var(--bg-glass-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-90 border border-transparent hover:border-[var(--border-subtle)] bg-[var(--bg-input)]"
                    title="Member Options"
                >
                    <MoreHorizontal size={14} className="stroke-[2.5]" />
                </button>

                {isOpen && (
                    <div
                        className="absolute right-full top-0 mr-1.5 w-40 rounded-2xl p-1.5 border z-[99] animate-fade-in shadow-xl flex flex-col gap-0.5"
                        style={{
                            background: theme === 'amethyst' ? '#ffffff' : 'rgba(18, 18, 38, 0.98)',
                            borderColor: 'var(--border-medium)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)'
                        }}
                    >
                        {/* Open Chat / Add Friend */}
                        {isFriend ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMemberMenuId(null);
                                    handleMemberClick(memberUser);
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left transition-colors
                                  ${theme === 'amethyst' ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-white/5'}
                                `}
                            >
                                <MailIcon size={13} className="text-indigo-400" />
                                <span>Open Chat</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    setActiveMemberMenuId(null);
                                    try {
                                        await sendFriendRequest(memberUser._id);
                                        toast.success("Friend request sent!");
                                    } catch (err) {
                                        toast.error("Failed to send request.");
                                    }
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left transition-colors
                                  ${theme === 'amethyst' ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-white/5'}
                                `}
                            >
                                <UserPlusIcon size={13} className="text-emerald-400" />
                                <span>Add Friend</span>
                            </button>
                        )}

                        {/* Promote / Demote */}
                        {isMeAdmin && !isCreator && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMemberMenuId(null);
                                    updateMemberRoleInGroup(activeGroup._id, memberUser._id, member.role === 'admin' ? 'member' : 'admin');
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left transition-colors
                                  ${theme === 'amethyst' ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-white/5'}
                                `}
                            >
                                <ShieldIcon size={13} className="text-blue-400" />
                                <span>{member.role === 'admin' ? 'Demote' : 'Promote to Admin'}</span>
                            </button>
                        )}

                        {/* Transfer Ownership */}
                        {isMeCreator && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMemberMenuId(null);
                                    if (window.confirm(`Are you sure you want to transfer ownership to ${memberUser.fullName}? You will become a regular admin.`)) {
                                        transferGroupOwnership(activeGroup._id, memberUser._id);
                                    }
                                }}
                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left transition-colors
                                  ${theme === 'amethyst' ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-white/5'}
                                `}
                            >
                                <Crown size={13} className="text-amber-400" />
                                <span>Transfer Owner</span>
                            </button>
                        )}

                        {/* Kick Member */}
                        {hasManagePermission && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMemberMenuId(null);
                                    if (window.confirm(`Are you sure you want to remove ${memberUser.fullName}?`)) {
                                        removeMemberFromGroup(activeGroup._id, memberUser._id);
                                    }
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left hover:bg-red-500/10 text-red-400 transition-colors"
                            >
                                <UserMinusIcon size={13} className="text-red-400" />
                                <span>Kick Member</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const openAddMemberModal = () => {
        getAllContacts();
        setSelectedUserIds([]);
        setIsAddMemberOpen(true);
    };

    const nonGroupContacts = allContacts.filter(contact => {
        return !activeGroup?.members?.some(member => member.userId?._id === contact._id);
    });

    const groupsInCommon = React.useMemo(() => {
        if (!selectedUser || activeGroup) return [];
        return groups.filter(g => {
            return g.members?.some(m => {
                const memberId = m.userId?._id || m.userId;
                return memberId === selectedUser._id;
            });
        });
    }, [groups, selectedUser, activeGroup]);

    if (!selectedUser && !activeGroup) return null;

    const displayTitle = activeGroup ? activeGroup.name : selectedUser?.fullName;
    const displayAvatar = activeGroup ? activeGroup.avatar : selectedUser?.profilePic;
    const description = activeGroup ? activeGroup.description : selectedUser?.bio;
    const isOnline = selectedUser ? onlineUsers.includes(selectedUser._id) : false;

    const isBirthdayToday = (() => {
        if (activeGroup || !selectedUser?.dob) return false;
        const dob = new Date(selectedUser.dob);
        const today = new Date();
        return dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
    })();

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    };

    // Filter shared media, docs, and links from current conversation messages
    const mediaFiles = messages.filter(msg => {
        const isVideo = msg.fileUrl && (msg.fileType?.startsWith("video/") || ['mp4', 'webm', 'mov', 'ogg'].some(ext => msg.fileName?.toLowerCase().endsWith(`.${ext}`)));
        return msg.image || isVideo;
    }).map(msg => {
        const isVideo = msg.fileUrl && (msg.fileType?.startsWith("video/") || ['mp4', 'webm', 'mov', 'ogg'].some(ext => msg.fileName?.toLowerCase().endsWith(`.${ext}`)));
        return {
            ...msg,
            url: msg.image || msg.fileUrl,
            name: msg.fileName || (msg.image ? 'Photo' : 'Video'),
            type: msg.image ? 'image' : 'video',
            createdAt: msg.createdAt
        };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const docFiles = messages.filter(msg => {
        const isPdf = msg.fileType?.toLowerCase().includes('pdf') || msg.fileName?.toLowerCase().endsWith('.pdf');
        const isOtherDoc = msg.fileUrl && !msg.fileType?.startsWith("video/");
        return isPdf || isOtherDoc;
    }).map(msg => {
        const isPdf = msg.fileType?.toLowerCase().includes('pdf') || msg.fileName?.toLowerCase().endsWith('.pdf');
        return {
            ...msg,
            url: msg.fileUrl,
            name: msg.fileName || 'Document',
            type: isPdf ? 'pdf' : 'other',
            fileSize: msg.fileSize,
            fileType: msg.fileType,
            createdAt: msg.createdAt
        };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const linksList = [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    messages.forEach(msg => {
        if (msg.text) {
            const matches = msg.text.match(urlRegex);
            if (matches) {
                matches.forEach(url => {
                    linksList.push({
                        _id: msg._id,
                        url,
                        createdAt: msg.createdAt
                    });
                });
            }
        }
    });
    linksList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Announcements & Pinboard view mode
    if (viewMode === "announcements") {
        return (
            <div className="flex flex-col h-full overflow-hidden animate-fade-in">
                {/* Header */}
                <div
                    className="flex items-center gap-3 h-14 sm:h-16 px-4 border-b flex-shrink-0"
                    style={{
                        borderColor: 'var(--border-subtle)',
                        background: 'transparent',
                    }}
                >
                    <button
                        onClick={() => setViewMode("info")}
                        className="btn-icon p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)]"
                        title="Back to info"
                    >
                        <ChevronLeftIcon size={18} />
                    </button>
                    <div className="min-w-0">
                        <h3 className="font-extrabold text-sm tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                            Announcements & Pinboard
                        </h3>
                        <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                            Pinned updates and core group rules
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
                    {isLoadingPins ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 text-xs text-[var(--text-secondary)] gap-2">
                            <div className="w-6 h-6 border-2 border-indigo-500/25 border-t-indigo-500 rounded-full animate-spin" />
                            <span>Loading pinned updates...</span>
                        </div>
                    ) : announcementsAndPins.length > 0 ? (
                        [...announcementsAndPins].reverse().map((msg) => {
                            const senderName = msg.senderId?._id === authUser._id
                                ? "You"
                                : (msg.senderId?.fullName || "Member");

                            return (
                                <div
                                    key={msg._id}
                                    onClick={() => window.jumpToMessage?.(msg._id)}
                                    className="p-3.5 rounded-2xl border transition-all duration-300 group cursor-pointer hover:-translate-y-0.5 hover:shadow-lg flex flex-col gap-2 relative overflow-hidden"
                                    style={{
                                        background: theme === 'amethyst'
                                            ? 'rgba(255, 255, 255, 0.78)'
                                            : 'var(--bg-glass-panel)',
                                        borderColor: 'var(--border-subtle)',
                                        backdropFilter: 'blur(12px)',
                                        WebkitBackdropFilter: 'blur(12px)'
                                    }}
                                >
                                    {/* Sender Details & Badge */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <img
                                                src={msg.senderId?.profilePic || "/avatar.png"}
                                                alt="sender avatar"
                                                className="w-7 h-7 rounded-full object-cover border border-white/10"
                                            />
                                            <span
                                                className="text-xs font-bold truncate"
                                                style={{ color: 'var(--text-secondary)' }}
                                            >
                                                {senderName}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {msg.isAnnouncement && (
                                                <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 flex items-center gap-0.5">
                                                    <Megaphone size={8} /> Announcement
                                                </span>
                                            )}
                                            {msg.isPinned && (
                                                <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 flex items-center gap-0.5">
                                                    <PinIcon size={8} className="rotate-45" /> Pinned
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content preview */}
                                    {msg.text && (
                                        <p className="text-xs leading-relaxed font-medium line-clamp-3" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                                            {msg.text}
                                        </p>
                                    )}

                                    {/* Media preview */}
                                    {msg.image && (
                                        <DecryptedMedia msg={msg} type="image" fallbackUrl={msg.image}>
                                            {(url, isLoading, isError) => {
                                                if (isLoading) {
                                                    return (
                                                        <div className="w-[100px] h-[100px] bg-[var(--bg-input-search)] border border-[var(--border-subtle)] animate-pulse rounded-xl flex items-center justify-center">
                                                            <span className="text-[8px] text-[var(--text-muted)]">Decrypting...</span>
                                                        </div>
                                                    );
                                                }
                                                if (isError) {
                                                    return (
                                                        <div className="w-[100px] h-[100px] bg-red-950/20 border border-red-500/20 rounded-xl flex flex-col items-center justify-center text-red-400 text-[9px] font-bold gap-1">
                                                            <Lock size={12} className="text-red-500" />
                                                            <span>Locked</span>
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <div className="rounded-xl overflow-hidden max-w-[160px] bg-zinc-950 border border-white/5">
                                                        <img src={url} alt="Attachment" className="w-full max-h-[100px] object-cover" />
                                                    </div>
                                                );
                                            }}
                                        </DecryptedMedia>
                                    )}

                                    {/* File preview */}
                                    {msg.fileUrl && (
                                        <div
                                            className="flex items-center gap-2.5 p-2 rounded-xl max-w-full"
                                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent-primary)] flex-shrink-0">
                                                <FileIcon size={10} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[10px] font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>{msg.fileName || 'File'}</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mt-1 text-[9px]" style={{ color: 'var(--text-muted)' }}>
                                        <span>{new Date(msg.createdAt).toLocaleDateString()} at {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--accent-primary)] font-bold uppercase tracking-wider">
                                            Jump to Message &rarr;
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 py-20">
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 hover:scale-[1.03]"
                                style={{
                                    border: '3.5px solid var(--border-medium)',
                                    background: 'var(--bg-input-search)',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                                    padding: '3px'
                                }}
                            >
                                <Megaphone className="w-6 h-6 text-indigo-400" />
                            </div>
                            <h4 className="text-sm font-extrabold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                                Pinboard is Empty
                            </h4>
                            <p className="text-xs text-zinc-400 max-w-[200px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                                Group rules, announcements, and pinned updates will appear here.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Starred Messages view mode
    if (viewMode === "starred") {
        const chatStarredMessages = starredMessages.filter(msg => {
            if (activeGroup) {
                const gId = msg.groupId?._id || msg.groupId;
                return gId === activeGroup._id;
            } else if (selectedUser) {
                if (msg.groupId) return false;
                const senderId = msg.senderId?._id || msg.senderId;
                const receiverId = msg.recieverId?._id || msg.recieverId;
                return (
                    (senderId === selectedUser._id && receiverId === authUser._id) ||
                    (senderId === authUser._id && receiverId === selectedUser._id)
                );
            }
            return false;
        });

        return (
            <div className="flex flex-col h-full overflow-hidden animate-fade-in">
                {/* Header */}
                <div
                    className="flex items-center gap-3 h-14 sm:h-16 px-4 border-b flex-shrink-0"
                    style={{
                        borderColor: 'var(--border-subtle)',
                        background: 'transparent',
                    }}
                >
                    <button
                        onClick={() => setViewMode("info")}
                        className="btn-icon text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title="Back to Info"
                    >
                        <ChevronLeftIcon size={18} />
                    </button>
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                        Starred Messages
                    </h3>
                </div>

                {/* Starred Messages List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                    {chatStarredMessages.length > 0 ? (
                        chatStarredMessages.map((msg) => {
                            const isOwn = (msg.senderId?._id || msg.senderId) === authUser._id;
                            const senderName = isOwn ? 'Me' : (activeGroup ? msg.senderId?.fullName : (selectedUser?.fullName || 'Friend'));
                            return (
                                <div
                                    key={msg._id}
                                    className="glass-card p-4 flex flex-col gap-2 relative overflow-hidden group hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                                >
                                    {/* Sender + Date */}
                                    <div className="flex items-center justify-between">
                                        <span
                                            className="text-[10px] uppercase font-extrabold tracking-wider"
                                            style={{ color: isOwn ? 'var(--text-accent)' : 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}
                                        >
                                            {senderName}
                                        </span>
                                        <div className="flex items-center gap-1 opacity-70" style={{ color: 'var(--text-muted)', fontSize: '9px', fontFamily: 'var(--font-body)' }}>
                                            <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    {msg.callInfo ? (
                                        <div className="mt-1">
                                            <CallLogCard msg={msg} isOwn={isOwn} />
                                        </div>
                                    ) : (
                                        <>
                                            {/* Text content */}
                                            {msg.text && (
                                                <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
                                                    {msg.text}
                                                </p>
                                            )}

                                            {/* Image Attachment */}
                                            {msg.image && (
                                                <DecryptedMedia msg={msg} type="image" fallbackUrl={msg.image}>
                                                    {(url, isLoading, isError) => {
                                                        if (isLoading) {
                                                            return (
                                                                <div className="w-[100px] h-[100px] bg-[var(--bg-input-search)] border border-[var(--border-subtle)] animate-pulse rounded-xl flex items-center justify-center">
                                                                    <span className="text-[8px] text-[var(--text-muted)]">Decrypting...</span>
                                                                </div>
                                                            );
                                                        }
                                                        if (isError) {
                                                            return (
                                                                <div className="w-[100px] h-[100px] bg-red-950/20 border border-red-500/20 rounded-xl flex flex-col items-center justify-center text-red-400 text-[9px] font-bold gap-1">
                                                                    <Lock size={12} className="text-red-500" />
                                                                    <span>Locked</span>
                                                                </div>
                                                            );
                                                        }
                                                        return (
                                                            <div
                                                                onClick={() => setActivePreviewFile({ ...msg, url, name: 'Photo', type: 'image' })}
                                                                className="rounded-xl overflow-hidden max-w-[160px] bg-zinc-950 border border-white/5 hover:opacity-90 transition-opacity cursor-pointer"
                                                                style={{ border: '1.5px solid var(--border-subtle)' }}
                                                            >
                                                                <img src={url} alt="Attachment" className="w-full max-h-[100px] object-cover transition-transform duration-500 group-hover:scale-105" />
                                                            </div>
                                                        );
                                                    }}
                                                </DecryptedMedia>
                                            )}

                                            {/* File Attachment */}
                                            {msg.fileUrl && (
                                                <div
                                                    onClick={() => {
                                                        const isPdf = msg.fileType?.toLowerCase().includes('pdf') || msg.fileName?.toLowerCase().endsWith('.pdf');
                                                        const isVideo = msg.fileType?.startsWith("video/") || ['mp4', 'webm', 'mov', 'ogg'].some(ext => msg.fileName?.toLowerCase().endsWith(`.${ext}`));
                                                        setActivePreviewFile({
                                                            ...msg,
                                                            url: msg.fileUrl,
                                                            name: msg.fileName || 'Document',
                                                            type: isPdf ? 'pdf' : isVideo ? 'video' : 'other',
                                                            fileSize: msg.fileSize,
                                                            fileType: msg.fileType
                                                        });
                                                    }}
                                                    className="flex items-center gap-3 p-2.5 rounded-xl max-w-full hover:bg-[var(--bg-glass-hover)] transition-colors cursor-pointer"
                                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
                                                >
                                                    <div className="w-7 h-7 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent-primary)] flex-shrink-0 border border-[var(--border-subtle)]">
                                                        <FileIcon size={12} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>{msg.fileName || 'File'}</p>
                                                        <p className="text-[9px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{msg.fileSize ? `${(msg.fileSize / 1024).toFixed(1)} KB` : 'N/A'}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Action row (Unstar) */}
                                    <div className="flex justify-end mt-1">
                                        <button
                                            onClick={() => toggleStarMessage(msg._id)}
                                            className="text-[9px] font-bold uppercase tracking-wider text-amber-500 hover:text-amber-400 hover:underline transition-all flex items-center gap-1"
                                        >
                                            Unstar
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 py-20">
                            <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 hover:scale-[1.03]"
                                style={{
                                    border: '3.5px solid var(--border-medium)',
                                    background: 'var(--bg-input-search)',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                                    padding: '3px'
                                }}
                            >
                                <svg className="w-6 h-6 text-amber-500 fill-amber-500" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                            </div>
                            <h4 className="text-sm font-extrabold mb-1" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                                No Starred Messages
                            </h4>
                            <p className="text-xs text-zinc-400 max-w-[200px]" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                                Star important messages to keep track of them here.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Full Group Members List view mode
    if (viewMode === "members" && activeGroup) {
        const membersList = activeGroup.members || [];
        
        return (
            <div className="flex flex-col h-full overflow-hidden animate-fade-in">
                {/* Header */}
                <div
                    className="flex items-center justify-between h-14 sm:h-16 px-4 border-b flex-shrink-0"
                    style={{
                        borderColor: 'var(--border-subtle)',
                        background: 'transparent',
                    }}
                >
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                setMemberSearchQuery("");
                                setViewMode("info");
                            }}
                            className="btn-icon p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)]"
                            title="Back to info"
                        >
                            <ChevronLeftIcon size={18} />
                        </button>
                        <h3 className="font-extrabold text-sm tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                            Group Members
                        </h3>
                    </div>
                    
                    {isMeAdmin && (
                        <button
                            onClick={openAddMemberModal}
                            className="text-[9px] text-[var(--accent-primary)] hover:underline font-bold uppercase tracking-wider flex items-center gap-0.5 transition-all active:scale-95 border border-[var(--border-subtle)] rounded-full px-2.5 py-1 bg-[var(--bg-input)]"
                        >
                            <UserPlusIcon size={10} /> Add
                        </button>
                    )}
                </div>

                {/* Search / Filter Input */}
                <div className="p-3 border-b flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="relative">
                        <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Filter members by name..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs outline-none transition-all"
                            style={{
                                background: 'var(--bg-input-search)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-2">
                    {membersList
                        .filter(m => !memberSearchQuery || m.userId?.fullName?.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                        .map((member, idx) => {
                            const memberUser = member.userId;
                            if (!memberUser) return null;

                            const isCreator = activeGroup.creatorId?.toString() === memberUser._id?.toString();
                            const isMeCreator = activeGroup.creatorId?.toString() === authUser?._id?.toString();
                            const isAdmin = member.role === 'admin' || isCreator;

                            return (
                                <div
                                    key={memberUser._id || idx}
                                    className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-input)] border border-transparent hover:bg-[var(--bg-glass-hover)] hover:border-[var(--border-subtle)] transition-all duration-200 group"
                                >
                                    <div 
                                        onClick={() => handleMemberClick(memberUser)}
                                        className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-80 active:scale-98 select-none transition-all"
                                        title={memberUser._id === authUser?._id ? "You" : "Click to view chat or add friend"}
                                    >
                                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-zinc-800 border border-white/10 shadow-sm">
                                            <img
                                                src={memberUser.profilePic || "/avatar.png"}
                                                alt={memberUser.fullName}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                            {memberUser.fullName}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {isAdmin && (
                                            <span
                                                className="text-[8px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full text-white shadow-sm"
                                                style={{
                                                    background: isCreator
                                                        ? 'linear-gradient(135deg, #a78bfa, #7c3aed)'
                                                        : 'linear-gradient(135deg, #3b82f6, #4f46e5)'
                                                }}
                                            >
                                                {isCreator ? 'Creator' : 'Admin'}
                                            </span>
                                        )}

                                        {renderMemberMenu(member, memberUser)}
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>
        );
    }

    // Shared Files / Media view mode
    if (viewMode === "media") {
        return (
            <div className="flex flex-col h-full overflow-hidden animate-fade-in">
                {/* Header */}
                <div
                    className="flex items-center gap-3 h-14 sm:h-16 px-4 border-b flex-shrink-0"
                    style={{
                        borderColor: 'var(--border-subtle)',
                        background: 'transparent',
                    }}
                >
                    <button
                        onClick={() => setViewMode("info")}
                        className="btn-icon text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title="Back to Info"
                    >
                        <ChevronLeftIcon size={18} />
                    </button>
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                        Shared Files
                    </h3>
                </div>

                {/* Tabs Switcher */}
                <div className="px-4 py-2.5 flex gap-1 border-b flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
                    {['media', 'docs', 'links'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setMediaTab(tab)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                            style={{
                                background: mediaTab === tab ? 'var(--accent-primary)' : 'transparent',
                                color: mediaTab === tab ? '#fff' : 'var(--text-secondary)',
                                boxShadow: mediaTab === tab ? '0 2px 8px var(--accent-glow)' : 'none',
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                    {isLoadingGallery ? (
                        <div className="h-full flex flex-col items-center justify-center py-20 text-xs text-[var(--text-secondary)] gap-2">
                            <div className="w-6 h-6 border-2 border-indigo-500/25 border-t-indigo-500 rounded-full animate-spin" />
                            <span>Loading shared files...</span>
                        </div>
                    ) : (
                        <>
                            {/* Media grid */}
                            {mediaTab === "media" && (
                                fullMediaFiles.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2 animate-fade-in">
                                        {fullMediaFiles.map((file, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => setActivePreviewFile(file)}
                                                className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 active:scale-95 transition-all border border-white/5 relative group bg-zinc-950"
                                            >
                                                <DecryptedMedia msg={file} type={file.type} fallbackUrl={file.url}>
                                                    {(url, isLoading, isError) => {
                                                        if (isLoading) {
                                                            return <div className="w-full h-full bg-zinc-900 animate-pulse" />;
                                                        }
                                                        if (isError) {
                                                            return (
                                                                <div className="w-full h-full bg-red-950/20 flex items-center justify-center text-red-400">
                                                                    <Lock size={14} className="text-red-500" />
                                                                </div>
                                                            );
                                                        }
                                                        if (file.type === 'image') {
                                                            return (
                                                                <img src={url} alt={file.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                            );
                                                        } else {
                                                            return (
                                                                <div className="w-full h-full flex items-center justify-center relative bg-zinc-900">
                                                                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/25 transition-all duration-300 z-10">
                                                                        <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white transition-all duration-350 group-hover:scale-110">
                                                                            <PlayIcon size={12} className="text-white" fill="white" />
                                                                        </div>
                                                                    </span>
                                                                    <video src={url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" muted />
                                                                </div>
                                                            );
                                                        }
                                                    }}
                                                </DecryptedMedia>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                                        <ImageIcon size={32} className="text-[var(--text-muted)] mb-2" />
                                        <p className="text-xs text-[var(--text-secondary)]">No media shared in this chat.</p>
                                    </div>
                                )
                            )}

                            {/* Docs list */}
                            {mediaTab === "docs" && (
                                fullDocFiles.length > 0 ? (
                                    <div className="flex flex-col gap-2 animate-fade-in">
                                        {fullDocFiles.map((file, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => setActivePreviewFile(file)}
                                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-glass-hover)] hover:shadow-sm cursor-pointer border border-transparent hover:border-[var(--border-subtle)] transition-all duration-200"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent-primary)] flex-shrink-0 shadow-sm border border-[var(--border-subtle)]">
                                                    {file.type === 'pdf' ? <FileTextIcon size={18} /> : <FileIcon size={18} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{file.name}</p>
                                                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                                        {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : 'Document'} · {new Date(file.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                {!file.isEncrypted && (
                                                    <a
                                                        href={file.url}
                                                        onClick={(e) => e.stopPropagation()}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-glass-hover)] text-[var(--text-primary)] transition-all text-xs"
                                                    >
                                                        <ExternalLinkIcon size={12} />
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                                        <FileIcon size={32} className="text-[var(--text-muted)] mb-2" />
                                        <p className="text-xs text-[var(--text-secondary)]">No documents shared in this chat.</p>
                                    </div>
                                )
                            )}

                            {/* Links list */}
                            {mediaTab === "links" && (
                                fullLinksList.length > 0 ? (
                                    <div className="flex flex-col gap-2 animate-fade-in">
                                        {fullLinksList.map((linkItem, idx) => (
                                            <a
                                                key={idx}
                                                href={linkItem.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] border border-[var(--border-subtle)] hover:border-[var(--border-medium)] transition-all text-left block"
                                            >
                                                <div className="flex items-center gap-2 text-[var(--text-muted)] font-semibold text-[10px] uppercase tracking-wider">
                                                    <LinkIcon size={11} className="text-[var(--accent-primary)]" />
                                                    <span>Link</span>
                                                </div>
                                                <p className="text-xs font-medium text-[var(--accent-primary)] break-all underline line-clamp-2">
                                                    {linkItem.url}
                                                </p>
                                                <div className="flex items-center justify-between mt-1 text-[9px] text-[var(--text-muted)]">
                                                    <span>Shared {new Date(linkItem.createdAt).toLocaleDateString()}</span>
                                                    <span><ExternalLinkIcon size={10} /></span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                                        <LinkIcon size={32} className="text-[var(--text-muted)] mb-2" />
                                        <p className="text-xs text-[var(--text-secondary)]">No links shared in this chat.</p>
                                    </div>
                                )
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }

    if (isEditingGroup && activeGroup) {
        return (
            <div className="flex flex-col h-full overflow-hidden animate-fade-in animate-duration-200">
                {/* Header */}
                <div
                    className="flex items-center gap-3 h-14 sm:h-16 px-4 border-b flex-shrink-0"
                    style={{
                        borderColor: 'var(--border-subtle)',
                        background: 'transparent',
                    }}
                >
                    <button
                        onClick={() => setIsEditingGroup(false)}
                        className="btn-icon text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)]"
                    >
                        <ChevronLeftIcon size={18} />
                    </button>
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                        Edit Group details
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-4">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-2 pb-2">
                        <div
                            className="w-20 h-20 overflow-hidden flex items-center justify-center relative cursor-pointer group bg-zinc-900 transition-transform duration-200 active:scale-95"
                            style={{
                                borderRadius: "var(--radius-squircle, 14px)",
                                border: "2px dashed var(--border-medium)"
                            }}
                            onClick={() => groupAvatarInputRef.current?.click()}
                        >
                            <img
                                src={editedAvatar || "/avatar.png"}
                                alt="Group avatar"
                                className="w-full h-full object-cover group-hover:opacity-60 transition-opacity"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-white font-bold bg-black/40">
                                Change
                            </div>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            ref={groupAvatarInputRef}
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.readAsDataURL(file);
                                reader.onloadend = () => {
                                    setEditedAvatar(reader.result);
                                };
                            }}
                            className="hidden"
                        />
                    </div>

                    {/* Group Name input */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Group Name</label>
                        <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-glow)]"
                            style={{
                                background: "var(--bg-input-search)",
                                border: "1.5px solid var(--border-subtle)",
                                color: "var(--text-primary)",
                                fontFamily: "var(--font-body)",
                            }}
                            placeholder="Group name"
                        />
                    </div>

                    {/* Description input */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Description</label>
                        <textarea
                            value={editedDesc}
                            onChange={(e) => setEditedDesc(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 resize-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-glow)]"
                            style={{
                                background: "var(--bg-input-search)",
                                border: "1.5px solid var(--border-subtle)",
                                color: "var(--text-primary)",
                                fontFamily: "var(--font-body)",
                            }}
                            placeholder="Group description..."
                        />
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => setIsEditingGroup(false)}
                            className="btn-ghost flex-1 text-center"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                if (!editedName.trim()) {
                                    toast.error("Group name cannot be empty");
                                    return;
                                }
                                await updateGroupDetails(activeGroup._id, {
                                    name: editedName,
                                    description: editedDesc,
                                    avatar: editedAvatar
                                });
                                setIsEditingGroup(false);
                            }}
                            className="btn-primary flex-1 text-center"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Default InfoPanel view
    return (
        <div className="flex flex-col h-full overflow-hidden animate-fade-in">
            {/* Header */}
            <div
                className="flex items-center justify-between h-14 sm:h-16 px-5 flex-shrink-0"
                style={{
                    background: 'transparent',
                }}
            >
                {activeGroup && isMeAdmin ? (
                    <button
                        onClick={() => {
                            setEditedName(activeGroup.name);
                            setEditedDesc(activeGroup.description || "");
                            setEditedAvatar(activeGroup.avatar || "");
                            setIsEditingGroup(true);
                        }}
                        className="btn-icon p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)]"
                        title="Edit Group details"
                    >
                        <EditIcon size={18} />
                    </button>
                ) : (
                    <div className="w-9 h-9" />
                )}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className="btn-icon p-1.5 rounded-lg transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)]"
                        title="Search Messages"
                    >
                        <SearchIcon size={18} />
                    </button>
                    <button
                        onClick={onClose}
                        className="btn-icon p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)]"
                        title="Close Panel"
                    >
                        <XIcon size={18} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-4">
                {/* Hero Section */}
                <div className="flex flex-col items-center text-center gap-3 pb-4">
                    <div
                        onClick={() => {
                            if (displayAvatar) setShowLightbox(true);
                        }}
                        className={`w-28 h-28 rounded-full overflow-hidden flex items-center justify-center relative group transition-all duration-300 hover:scale-[1.03] ${displayAvatar ? 'cursor-pointer' : ''}`}
                        style={{
                            border: isOnline ? '3.5px solid var(--online-color)' : '3.5px solid var(--border-medium)',
                            background: 'var(--bg-input-search)',
                            boxShadow: isOnline
                                ? '0 0 0 4px rgba(16,185,129,0.12), 0 8px 32px rgba(16,185,129,0.22)'
                                : '0 8px 24px rgba(0,0,0,0.18)',
                            padding: '3px'
                        }}
                    >
                        {activeGroup ? (
                            displayAvatar ? (
                                <img
                                    src={displayAvatar}
                                    alt={displayTitle}
                                    className="w-full h-full object-cover rounded-full"
                                />
                            ) : (
                                <UsersIcon size={44} style={{ color: 'var(--text-muted)' }} />
                            )
                        ) : (
                            <img
                                src={displayAvatar || "/avatar.png"}
                                alt={displayTitle}
                                className="w-full h-full object-cover rounded-full"
                            />
                        )}
                    </div>
                    <div className="min-w-0 flex flex-col items-center gap-1">
                        <h2 className="text-lg font-bold px-2 tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                            {displayTitle}
                        </h2>
                        {selectedUser?.customStatus && (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-center" style={{ background: 'var(--accent-muted)', color: 'var(--text-accent)' }}>
                                {selectedUser.customStatus}
                            </span>
                        )}
                        <span
                            className="mt-0.5 text-xs font-semibold"
                            style={{
                                color: activeGroup ? 'var(--text-secondary)' : isOnline ? 'var(--online-color)' : 'var(--text-muted)'
                            }}
                        >
                            {activeGroup ? `${activeGroup.members?.length || 0} Members` : isOnline ? 'Online' : 'Offline'}
                        </span>
                    </div>

                    {/* Call Buttons */}
                    {!activeGroup && selectedUser && (
                        <div className="flex items-center justify-center gap-3 mt-2 animate-fade-in w-full px-4">
                            <button
                                onClick={() => initiateCall(selectedUser, "voice")}
                                disabled={!isOnline || isBlocked || isInitiating || callState !== "idle"}
                                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 border flex-1"
                                style={{
                                    background: (!isOnline || isBlocked || isInitiating || callState !== "idle")
                                        ? 'rgba(0, 0, 0, 0.03)'
                                        : 'var(--accent-muted)',
                                    color: (!isOnline || isBlocked || isInitiating || callState !== "idle")
                                        ? 'var(--text-muted)'
                                        : 'var(--text-secondary)',
                                    borderColor: 'var(--border-subtle)',
                                    opacity: (!isOnline || isBlocked || isInitiating || callState !== "idle") ? 0.5 : 1,
                                    cursor: (!isOnline || isBlocked || isInitiating || callState !== "idle") ? "not-allowed" : "pointer"
                                }}
                                title={isBlocked ? "Unblock user to call" : !isOnline ? "User is offline" : "Voice Call"}
                            >
                                <PhoneIcon size={13} className="stroke-[2.5]" />
                                <span>Voice</span>
                            </button>
                            <button
                                onClick={() => initiateCall(selectedUser, "video")}
                                disabled={!isOnline || isBlocked || isInitiating || callState !== "idle"}
                                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 border flex-1"
                                style={{
                                    background: (!isOnline || isBlocked || isInitiating || callState !== "idle")
                                        ? 'rgba(0, 0, 0, 0.03)'
                                        : 'var(--accent-muted)',
                                    color: (!isOnline || isBlocked || isInitiating || callState !== "idle")
                                        ? 'var(--text-muted)'
                                        : 'var(--text-secondary)',
                                    borderColor: 'var(--border-subtle)',
                                    opacity: (!isOnline || isBlocked || isInitiating || callState !== "idle") ? 0.5 : 1,
                                    cursor: (!isOnline || isBlocked || isInitiating || callState !== "idle") ? "not-allowed" : "pointer"
                                }}
                                title={isBlocked ? "Unblock user to call" : !isOnline ? "User is offline" : "Video Call"}
                            >
                                <VideoIcon size={13} className="stroke-[2.5]" />
                                <span>Video</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Birthday Alert */}
                {isBirthdayToday && (
                    <div
                        className="relative overflow-hidden p-3.5 rounded-xl border border-pink-500/30 bg-gradient-to-r from-pink-500/10 to-purple-500/10 text-xs flex-shrink-0 animate-pulse"
                        style={{ backdropFilter: 'blur(10px)', boxShadow: '0 4px 20px rgba(236,72,153,0.15)' }}
                    >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/15 rounded-full blur-xl -mr-4 -mt-4"></div>
                        <div className="flex items-center gap-2 text-pink-400 font-bold text-xs">
                            <CakeIcon size={14} className="animate-bounce" />
                            <span>Today is {selectedUser.fullName}'s Birthday! 🎂</span>
                        </div>
                        <p className="text-[10px] mt-1" style={{ color: theme === 'amethyst' ? 'rgba(67, 56, 202, 0.9)' : 'var(--text-secondary)' }}>
                            Wish them a happy birthday and celebrate their special day! 🎉✨
                        </p>
                    </div>
                )}

                {/* About Card */}
                <div className="glass-card p-4 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                    <div className="flex flex-col gap-1.5">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--accent-hover)', letterSpacing: '0.05em' }}>
                            {activeGroup ? 'Group Description' : 'About'}
                        </h4>
                        <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {description || (activeGroup ? 'No description provided.' : 'Hey there! I am using Aether Chat.')}
                        </p>
                    </div>

                    {!activeGroup && (selectedUser?.phone || selectedUser?.email || selectedUser?.location) && (
                        <div className="flex flex-col gap-2 pt-3 border-t text-xs" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                            {selectedUser?.phone && (
                                <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-glass-hover)] transition-colors">
                                    <PhoneIcon size={14} className="text-[var(--accent-primary)] flex-shrink-0" />
                                    <span className="font-semibold truncate">{selectedUser.phone}</span>
                                </div>
                            )}
                            {selectedUser?.email && (
                                <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-glass-hover)] transition-colors">
                                    <MailIcon size={14} className="text-[var(--accent-primary)] flex-shrink-0" />
                                    <span className="font-semibold truncate">{selectedUser.email}</span>
                                </div>
                            )}
                            {selectedUser?.location && (
                                <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-glass-hover)] transition-colors">
                                    <MapPinIcon size={14} className="text-[var(--accent-primary)] flex-shrink-0" />
                                    <span className="font-semibold truncate">{selectedUser.location}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Groups in Common Card (DMs only) */}
                {!activeGroup && selectedUser && (
                    <div className="glass-card p-4 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--accent-hover)', letterSpacing: '0.05em' }}>
                                Groups in Common
                            </h4>
                            <span className="text-xs font-semibold text-[var(--accent-primary)]">
                                {groupsInCommon.length}
                            </span>
                        </div>
                        {groupsInCommon.length > 0 ? (
                            <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                                {groupsInCommon.map((group) => (
                                    <div
                                        key={group._id}
                                        onClick={() => {
                                            setSelectedGroup(group);
                                        }}
                                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg-glass-hover)] transition-all duration-200 cursor-pointer border border-transparent hover:border-[var(--border-subtle)]"
                                    >
                                        <div
                                            className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-[var(--bg-input-search)] border border-[var(--border-subtle)] flex-shrink-0"
                                        >
                                            {group.avatar ? (
                                                <img
                                                    src={group.avatar}
                                                    alt={group.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <UsersIcon size={14} className="text-[var(--text-secondary)]" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold truncate text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
                                                {group.name}
                                            </p>
                                            <p className="text-[10px] text-[var(--text-muted)] truncate" style={{ fontFamily: 'var(--font-body)' }}>
                                                {group.members?.length || 0} members
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <UsersIcon size={24} className="text-[var(--text-muted)] mx-auto opacity-40 mb-1.5" />
                                <p className="text-[11px] text-[var(--text-muted)] font-medium">No groups in common</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Settings Card */}
                <div className="glass-card p-4 flex flex-col gap-2 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider mb-2" style={{ color: 'var(--accent-hover)', letterSpacing: '0.05em' }}>
                        Settings
                    </h4>
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent-primary)]">
                                <svg size={14} className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9m7 13a3 3 0 0 1-6 0" /></svg>
                            </div>
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Notification</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => toggleMuteChat(currentTargetId)}
                            className={`w-9 h-5 rounded-full p-0.5 transition-all duration-200 focus:outline-none flex items-center ${notificationsEnabled ? 'bg-[var(--accent-primary)] justify-end' : 'bg-zinc-650 justify-start'}`}
                            style={{
                                background: notificationsEnabled ? 'var(--accent-primary)' : (theme === 'amethyst' ? 'rgba(0, 0, 0, 0.18)' : 'rgba(255, 255, 255, 0.15)'),
                                boxShadow: notificationsEnabled ? '0 0 8px var(--accent-glow)' : 'none'
                            }}
                        >
                            <div className="bg-white w-4 h-4 rounded-full shadow-md transform active:scale-90 transition-transform duration-200" />
                        </button>
                    </div>
                    <div
                        className="flex items-center justify-between py-2 border-t cursor-pointer hover:bg-[var(--bg-glass-hover)] rounded-lg px-1 transition-colors"
                        style={{ borderColor: 'var(--border-subtle)' }}
                        onClick={() => setViewMode("starred")}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                                <svg size={14} className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                            </div>
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Starred Messages</span>
                        </div>
                        <ChevronRightIcon size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div
                        className="flex items-center justify-between py-2 border-t cursor-pointer hover:bg-[var(--bg-glass-hover)] rounded-lg px-1 transition-colors"
                        style={{ borderColor: 'var(--border-subtle)' }}
                        onClick={() => setViewMode("announcements")}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                {activeGroup ? (
                                    <Megaphone size={14} className="w-3.5 h-3.5" />
                                ) : (
                                    <PinIcon size={14} className="w-3.5 h-3.5 rotate-45" />
                                )}
                            </div>
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {activeGroup ? "Announcements & Pins" : "Pinned Messages"}
                            </span>
                        </div>
                        <ChevronRightIcon size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    {!activeGroup && selectedUser && (
                        <>
                            <div
                                className="flex items-center justify-between py-2 border-t cursor-pointer hover:bg-[var(--bg-glass-hover)] rounded-lg px-1 transition-colors"
                                style={{ borderColor: 'var(--border-subtle)' }}
                                onClick={() => {
                                    openForwardModal({
                                        userId: selectedUser._id,
                                        fullName: selectedUser.fullName,
                                        email: selectedUser.email,
                                        profilePic: selectedUser.profilePic
                                    }, "contact");
                                }}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                        <svg size={14} className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                                    </div>
                                    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Share Contact</span>
                                </div>
                                <ChevronRightIcon size={16} style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <div
                                className="flex items-center justify-between py-2 border-t cursor-pointer hover:bg-red-500/10 rounded-lg px-1 transition-colors"
                                style={{ borderColor: 'var(--border-subtle)' }}
                                onClick={handleBlockToggle}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                                        <Ban size={14} className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-xs font-semibold text-red-500">
                                        {isBlocked ? 'Unblock User' : 'Block User'}
                                    </span>
                                </div>
                                <ChevronRightIcon size={16} className="text-red-500/70" />
                            </div>
                        </>
                    )}
                </div>

                {/* Recent Media and Files Card */}
                <div
                    className="glass-card p-4 flex flex-col gap-3 cursor-pointer hover:bg-[var(--bg-glass-hover)] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300"
                    onClick={() => setViewMode("media")}
                >
                    <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--accent-hover)', letterSpacing: '0.05em' }}>
                            Recent Media and Files
                        </h4>
                        <span className="text-xs font-semibold text-[var(--accent-primary)] flex items-center gap-0.5">
                            {mediaFiles.length + docFiles.length + linksList.length} <ChevronRightIcon size={12} />
                        </span>
                    </div>

                    {mediaFiles.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                            {mediaFiles.slice(0, 6).map((file, idx) => {
                                const isLast = idx === 5 && mediaFiles.length > 6;
                                return (
                                    <div
                                        key={idx}
                                        className="aspect-square rounded-xl overflow-hidden border border-white/5 bg-zinc-950 relative group cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActivePreviewFile(file);
                                        }}
                                    >
                                        <DecryptedMedia msg={file} type={file.type} fallbackUrl={file.url}>
                                            {(url, isLoading, isError) => {
                                                if (isLoading) {
                                                    return <div className="w-full h-full bg-zinc-900 animate-pulse" />;
                                                }
                                                if (isError) {
                                                    return (
                                                        <div className="w-full h-full bg-red-950/20 flex items-center justify-center text-red-400">
                                                            <Lock size={14} className="text-red-500" />
                                                        </div>
                                                    );
                                                }
                                                if (file.type === 'image') {
                                                    return (
                                                        <img src={url} alt="media preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                    );
                                                } else {
                                                    return (
                                                        <div className="w-full h-full flex items-center justify-center bg-zinc-900 relative">
                                                            <span className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/25 transition-all duration-300 z-10">
                                                                <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white transition-all duration-300 group-hover:scale-110">
                                                                    <PlayIcon size={10} className="text-white" fill="white" />
                                                                </div>
                                                            </span>
                                                            <video src={url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" muted />
                                                        </div>
                                                    );
                                                }
                                            }}
                                        </DecryptedMedia>
                                        {isLast && (
                                            <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex flex-col items-center justify-center text-white text-[10px] font-bold uppercase tracking-widest transition-all duration-300 group-hover:bg-black/55 z-20">
                                                <span>+{mediaFiles.length - 5}</span>
                                                <span className="text-[8px] mt-0.5">More</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-[10px] text-zinc-500">No media, links, or docs shared yet.</p>
                    )}
                </div>

                {/* Group Members Section */}
                {activeGroup && (
                    <div className="glass-card p-4 flex flex-col gap-3 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
                            <h4 className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--accent-hover)', letterSpacing: '0.05em' }}>
                                Group Members
                            </h4>
                            <div className="flex items-center gap-2">
                                {isMeAdmin && (
                                    <button
                                        onClick={openAddMemberModal}
                                        className="text-[9px] text-[var(--accent-primary)] hover:underline font-bold uppercase tracking-wider flex items-center gap-0.5 transition-all active:scale-95"
                                    >
                                        <UserPlusIcon size={10} /> Add
                                    </button>
                                )}
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-muted)', color: 'var(--text-accent)' }}>
                                    {activeGroup.members?.length || 0}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: "180px", overflowY: "auto", flexShrink: 0 }}>
                            {(activeGroup.members?.length > 7
                                ? activeGroup.members.slice(0, 6)
                                : activeGroup.members
                            )?.map((member, idx) => {
                                const memberUser = member.userId;
                                if (!memberUser) return null;

                                const isCreator = activeGroup.creatorId?.toString() === memberUser._id?.toString();
                                const isMeCreator = activeGroup.creatorId?.toString() === authUser?._id?.toString();
                                const isAdmin = member.role === 'admin' || isCreator;

                                return (
                                    <div
                                        key={memberUser._id || idx}
                                        className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-input)] border border-transparent hover:bg-[var(--bg-glass-hover)] hover:border-[var(--border-subtle)] transition-all duration-200 group"
                                    >
                                        <div 
                                            onClick={() => handleMemberClick(memberUser)}
                                            className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-80 active:scale-98 select-none transition-all"
                                            title={memberUser._id === authUser?._id ? "You" : "Click to view chat or add friend"}
                                        >
                                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-zinc-800 border border-white/10 shadow-sm">
                                                <img
                                                    src={memberUser.profilePic || "/avatar.png"}
                                                    alt={memberUser.fullName}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                                {memberUser.fullName}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {isAdmin && (
                                                <span
                                                    className="text-[8px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full text-white shadow-sm"
                                                    style={{
                                                        background: isCreator
                                                            ? 'linear-gradient(135deg, #a78bfa, #7c3aed)'
                                                            : 'linear-gradient(135deg, #3b82f6, #4f46e5)'
                                                    }}
                                                >
                                                    {isCreator ? 'Creator' : 'Admin'}
                                                </span>
                                            )}

                                            {renderMemberMenu(member, memberUser)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {activeGroup.members?.length > 7 && (
                            <button
                                onClick={() => setViewMode("members")}
                                className="w-full py-2 rounded-xl text-center text-xs font-bold text-[var(--accent-primary)] hover:bg-[var(--bg-glass-hover)] transition-all mt-1 active:scale-[0.98] border border-dashed border-[var(--border-subtle)] flex items-center justify-center gap-1"
                            >
                                View All {activeGroup.members.length} Members &rarr;
                            </button>
                        )}

                        {/* Leave Group / Delete Group Option */}
                        {activeGroup.creatorId?.toString() !== authUser?._id?.toString() ? (
                            <button
                                onClick={() => {
                                    if (window.confirm("Are you sure you want to leave this group?")) {
                                        leaveGroup(activeGroup._id);
                                        onClose();
                                    }
                                }}
                                className="mt-2 w-full py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                Leave Group
                            </button>
                        ) : (
                            <div className="flex flex-col gap-2 mt-2">
                                <button
                                    onClick={() => {
                                        if (window.confirm("🔴 WARNING: Are you sure you want to delete this group? All messages and decrypted group keys will be permanently deleted for all members. This action cannot be undone.")) {
                                            deleteGroup(activeGroup._id);
                                            onClose();
                                        }
                                    }}
                                    className="w-full py-2.5 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    Delete Group
                                </button>
                                <p className="text-[9px] text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                    You are the **Group Owner**. Deleting this group removes it for all members. You can also transfer ownership via the crown icon next to members.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Member modal view */}
            {isAddMemberOpen && activeGroup && (
                <div
                    className="absolute inset-0 backdrop-blur-md z-30 flex flex-col animate-fade-in"
                    style={{ background: 'var(--bg-surface)' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between h-14 sm:h-16 px-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
                        <h3 className="font-bold text-sm text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>Add Members</h3>
                        <button
                            onClick={() => setIsAddMemberOpen(false)}
                            className="btn-icon text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                            <XIcon size={18} />
                        </button>
                    </div>

                    {/* Contacts List */}
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-2">
                        {nonGroupContacts.length > 0 ? (
                            nonGroupContacts.map(contact => {
                                const isSelected = selectedUserIds.includes(contact._id);
                                return (
                                    <div
                                        key={contact._id}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedUserIds(selectedUserIds.filter(id => id !== contact._id));
                                            } else {
                                                setSelectedUserIds([...selectedUserIds, contact._id]);
                                            }
                                        }}
                                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all duration-150`}
                                        style={{
                                            background: isSelected ? 'var(--accent-muted)' : 'var(--bg-glass)',
                                            borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'
                                        }}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <img
                                                src={contact.profilePic || "/avatar.png"}
                                                alt={contact.fullName}
                                                className="w-8 h-8 rounded-full object-cover border"
                                                style={{ borderColor: 'var(--border-subtle)' }}
                                            />
                                            <span className="text-xs font-semibold truncate text-[var(--text-primary)]">{contact.fullName}</span>
                                        </div>
                                        <div
                                            className="w-4.5 h-4.5 flex items-center justify-center border transition-all duration-200"
                                            style={{
                                                background: isSelected ? "var(--accent-primary)" : "transparent",
                                                borderColor: isSelected ? "transparent" : "var(--border-medium)",
                                                borderRadius: "4px",
                                                boxShadow: isSelected ? "0 2px 8px var(--accent-glow)" : "none",
                                            }}
                                        >
                                            {isSelected && <CheckIcon size={10} className="text-white font-bold" />}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>All your contacts are already members.</p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t flex gap-2 flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
                        <button
                            onClick={() => setIsAddMemberOpen(false)}
                            className="btn-ghost flex-1 text-center"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={async () => {
                                if (selectedUserIds.length === 0) return;
                                await addMembersToGroup(activeGroup._id, selectedUserIds);
                                setIsAddMemberOpen(false);
                            }}
                            disabled={selectedUserIds.length === 0}
                            className="btn-primary flex-1 text-center"
                        >
                            Add ({selectedUserIds.length})
                        </button>
                    </div>
                </div>
            )}

            {/* Profile Photo Lightbox Modal */}
            {showLightbox && displayAvatar && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in"
                    onClick={() => setShowLightbox(false)}
                >
                    <button
                        onClick={() => setShowLightbox(false)}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white z-50 focus:outline-none"
                    >
                        <XIcon size={24} />
                    </button>

                    <div
                        className="relative max-w-[90vw] max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 shadow-2xl p-1 bg-zinc-950 animate-scale-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={displayAvatar}
                            alt={displayTitle}
                            className="max-w-full max-h-[80vh] object-contain rounded-xl"
                        />
                        <div className="text-center text-xs font-semibold py-2 text-[var(--text-primary)] font-sans tracking-wide">
                            {displayTitle}
                        </div>
                    </div>
                </div>
            )}
            {/* Friend Request Confirmation Dialog Modal */}
            {friendPromptUser && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
                    onClick={() => setFriendPromptUser(null)}
                >
                    <div
                        className="w-[90%] max-w-sm p-6 rounded-3xl border shadow-2xl flex flex-col items-center text-center animate-scale-in relative"
                        style={{
                            background: 'var(--bg-glass-panel)',
                            borderColor: 'var(--border-subtle)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close icon */}
                        <button
                            onClick={() => setFriendPromptUser(null)}
                            className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] p-1.5 rounded-lg transition-colors"
                        >
                            <XIcon size={14} />
                        </button>

                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-500/30 mb-4 bg-zinc-800 shadow-md">
                            <img
                                src={friendPromptUser.profilePic || "/avatar.png"}
                                alt={friendPromptUser.fullName}
                                className="w-full h-full object-cover"
                            />
                        </div>

                        <h4 className="text-sm font-extrabold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                            Add Friend?
                        </h4>

                        <p className="text-xs text-zinc-400 mt-2 leading-relaxed px-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                            Would you like to send a friend request to <strong className="text-[var(--text-primary)] font-bold">{friendPromptUser.fullName}</strong>?
                        </p>

                        <div className="flex gap-2.5 w-full mt-6">
                            <button
                                onClick={() => setFriendPromptUser(null)}
                                className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold border transition-all active:scale-95"
                                style={{
                                    borderColor: 'var(--border-subtle)',
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg-glass)'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    const targetUserId = friendPromptUser._id;
                                    setFriendPromptUser(null);
                                    await sendFriendRequest(targetUserId);
                                }}
                                className="flex-1 py-2 px-4 rounded-xl text-xs font-extrabold text-white transition-all active:scale-95 shadow-md"
                                style={{
                                    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                                    boxShadow: '0 4px 12px var(--accent-glow)'
                                }}
                            >
                                Send Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InfoPanel;
