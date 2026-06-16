import React, { useState, useRef, useEffect } from 'react';
import { 
    XIcon, UsersIcon, MailIcon, CalendarIcon, InfoIcon, 
    ChevronRightIcon, ChevronLeftIcon, LinkIcon, FileIcon, 
    FileTextIcon, PlayIcon, ExternalLinkIcon, ImageIcon,
    PhoneIcon, MapPinIcon, CakeIcon, EditIcon, UserPlusIcon,
    UserMinusIcon, ShieldIcon, CheckIcon, Crown, Megaphone, Pin as PinIcon, Ban
} from 'lucide-react';
import { userChatStore } from '../store/userChatStore';
import { userAuthStore } from '../store/userAuthStore';
import toast from 'react-hot-toast';
import CallLogCard from './CallLogCard';


function InfoPanel({ onClose }) {
    const { 
        selectedUser, activeGroup, messages, setActivePreviewFile,
        updateGroupDetails, addMembersToGroup, removeMemberFromGroup,
        updateMemberRoleInGroup, leaveGroup, deleteGroup, allContacts, getAllContacts,
        starredMessages, getStarredMessages, toggleStarMessage,
        transferGroupOwnership, theme,
        blockedUsers, getBlockedUsers, blockUser, unblockUser,
        mutedChats, toggleMuteChat
    } = userChatStore();
    const { onlineUsers, authUser } = userAuthStore();
    const [viewMode, setViewMode] = useState("info"); // "info" or "media"
    const [mediaTab, setMediaTab] = useState("media"); // "media", "docs", "links"
    const [showLightbox, setShowLightbox] = useState(false);

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

    const openAddMemberModal = () => {
        getAllContacts();
        setSelectedUserIds([]);
        setIsAddMemberOpen(true);
    };

    const nonGroupContacts = allContacts.filter(contact => {
        return !activeGroup?.members?.some(member => member.userId?._id === contact._id);
    });

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
        const announcementsAndPins = messages.filter(msg => msg.isAnnouncement || msg.isPinned);

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
                        className="btn-icon p-1.5 rounded-lg text-zinc-400 hover:text-white"
                        title="Back to group info"
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
                    {announcementsAndPins.length > 0 ? (
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
                                                className="w-5.5 h-5.5 rounded-full object-cover border border-white/10"
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
                                        <div className="rounded-xl overflow-hidden max-w-[160px] bg-zinc-950 border border-white/5">
                                            <img src={msg.image} alt="Attachment" className="w-full max-h-[100px] object-cover" />
                                        </div>
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
                                                <div
                                                    onClick={() => setActivePreviewFile({ url: msg.image, name: 'Photo', type: 'image' })}
                                                    className="rounded-xl overflow-hidden max-w-[160px] bg-zinc-950 border border-white/5 hover:opacity-90 transition-opacity cursor-pointer"
                                                    style={{ border: '1.5px solid var(--border-subtle)' }}
                                                >
                                                    <img src={msg.image} alt="Attachment" className="w-full max-h-[100px] object-cover transition-transform duration-500 group-hover:scale-105" />
                                                </div>
                                            )}

                                            {/* File Attachment */}
                                            {msg.fileUrl && (
                                                <div
                                                    onClick={() => {
                                                        const isPdf = msg.fileType?.toLowerCase().includes('pdf') || msg.fileName?.toLowerCase().endsWith('.pdf');
                                                        const isVideo = msg.fileType?.startsWith("video/") || ['mp4', 'webm', 'mov', 'ogg'].some(ext => msg.fileName?.toLowerCase().endsWith(`.${ext}`));
                                                        setActivePreviewFile({
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
                                <svg className="w-6 h-6 text-amber-500 fill-amber-500" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
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
                    {/* Media grid */}
                    {mediaTab === "media" && (
                        mediaFiles.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2 animate-fade-in">
                                {mediaFiles.map((file, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setActivePreviewFile(file)}
                                        className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 active:scale-95 transition-all border border-white/5 relative group bg-zinc-950"
                                    >
                                        {file.type === 'image' ? (
                                            <img src={file.url} alt={file.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center relative bg-zinc-900">
                                                <span className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/25 transition-all duration-300 z-10">
                                                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white transition-all duration-350 group-hover:scale-110">
                                                        <PlayIcon size={12} className="text-white" fill="white" />
                                                    </div>
                                                </span>
                                                <video src={file.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" muted />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                                <ImageIcon size={32} className="text-zinc-505 mb-2" />
                                <p className="text-xs text-zinc-400">No media shared in this chat.</p>
                            </div>
                        )
                    )}

                    {/* Docs list */}
                    {mediaTab === "docs" && (
                        docFiles.length > 0 ? (
                            <div className="flex flex-col gap-2 animate-fade-in">
                                {docFiles.map((file, idx) => (
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
                                            <p className="text-[10px] text-zinc-500 mt-0.5">
                                                {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : 'Document'} · {new Date(file.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <a
                                            href={file.url}
                                            onClick={(e) => e.stopPropagation()}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-glass-hover)] text-[var(--text-primary)] transition-all text-xs"
                                        >
                                            <ExternalLinkIcon size={12} />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                                <FileIcon size={32} className="text-zinc-505 mb-2" />
                                <p className="text-xs text-zinc-400">No documents shared in this chat.</p>
                            </div>
                        )
                    )}

                    {/* Links list */}
                    {mediaTab === "links" && (
                        linksList.length > 0 ? (
                            <div className="flex flex-col gap-2 animate-fade-in">
                                {linksList.map((linkItem, idx) => (
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
                                        <div className="flex items-center justify-between mt-1 text-[9px] text-zinc-500">
                                            <span>Shared {new Date(linkItem.createdAt).toLocaleDateString()}</span>
                                            <span><ExternalLinkIcon size={10} /></span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-fade-in">
                                <LinkIcon size={32} className="text-zinc-505 mb-2" />
                                <p className="text-xs text-zinc-400">No links shared in this chat.</p>
                            </div>
                        )
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
                        className="btn-icon text-zinc-400 hover:text-white"
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
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Group Name</label>
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
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Description</label>
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
                        className="btn-icon p-1.5 rounded-lg text-zinc-400 hover:text-white"
                        title="Edit Group details"
                    >
                        <EditIcon size={18} />
                    </button>
                ) : (
                    <div className="w-9 h-9" />
                )}
                <button
                    onClick={onClose}
                    className="btn-icon p-1.5 rounded-lg text-zinc-400 hover:text-white"
                    title="Close Panel"
                >
                    <XIcon size={18} />
                </button>
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
                        <p className="text-[10px] text-zinc-400 mt-1">
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

                {/* Settings Card */}
                <div className="glass-card p-4 flex flex-col gap-2 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider mb-2" style={{ color: 'var(--accent-hover)', letterSpacing: '0.05em' }}>
                        Settings
                    </h4>
                    <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent-primary)]">
                                <svg size={14} className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9m7 13a3 3 0 0 1-6 0"/></svg>
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
                                <svg size={14} className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                            </div>
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Starred Messages</span>
                        </div>
                        <ChevronRightIcon size={16} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    {activeGroup && (
                        <div 
                            className="flex items-center justify-between py-2 border-t cursor-pointer hover:bg-[var(--bg-glass-hover)] rounded-lg px-1 transition-colors" 
                            style={{ borderColor: 'var(--border-subtle)' }}
                            onClick={() => setViewMode("announcements")}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                    <Megaphone size={14} className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Announcements & Pins</span>
                            </div>
                            <ChevronRightIcon size={16} style={{ color: 'var(--text-muted)' }} />
                        </div>
                    )}
                    {!activeGroup && selectedUser && (
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
                                        {file.type === 'image' ? (
                                            <img src={file.url} alt="media preview" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-zinc-900 relative">
                                                <span className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/25 transition-all duration-300 z-10">
                                                    <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white transition-all duration-300 group-hover:scale-110">
                                                        <PlayIcon size={10} className="text-white" fill="white" />
                                                    </div>
                                                </span>
                                                <video src={file.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" muted />
                                            </div>
                                        )}
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
                            {activeGroup.members?.map((member, idx) => {
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
                                        <div className="flex items-center gap-2.5 min-w-0">
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

                                            {/* Admin / Creator Management options */}
                                            {((isMeAdmin && !isCreator) || (isMeCreator && !isCreator)) && memberUser._id !== authUser._id && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-200 ml-1 bg-black/50 p-0.5 rounded-lg border border-white/5">
                                                    {isMeAdmin && !isCreator && (
                                                        <button
                                                            onClick={() => updateMemberRoleInGroup(activeGroup._id, memberUser._id, member.role === 'admin' ? 'member' : 'admin')}
                                                            className="p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                                            title={member.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                                                        >
                                                            <ShieldIcon size={11} className={member.role === 'admin' ? 'text-pink-400' : 'text-zinc-400'} />
                                                        </button>
                                                    )}
                                                    {isMeCreator && (
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm(`Are you sure you want to transfer ownership to ${memberUser.fullName}? You will become a regular admin.`)) {
                                                                    transferGroupOwnership(activeGroup._id, memberUser._id);
                                                                }
                                                            }}
                                                            className="p-1 rounded-md hover:bg-amber-500/20 text-amber-400 transition-colors"
                                                            title="Transfer Group Ownership"
                                                        >
                                                            <Crown size={11} />
                                                        </button>
                                                    )}
                                                    {isMeAdmin && !isCreator && (
                                                        <button
                                                            onClick={() => {
                                                                if (window.confirm(`Are you sure you want to remove ${memberUser.fullName} from this group?`)) {
                                                                     removeMemberFromGroup(activeGroup._id, memberUser._id);
                                                                }
                                                            }}
                                                            className="p-1 rounded-md hover:bg-red-500/20 text-red-400 hover:text-red-355 transition-colors"
                                                            title="Remove Member"
                                                        >
                                                            <UserMinusIcon size={11} />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

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
                        <div className="text-center text-xs font-semibold py-2 text-zinc-300 font-sans tracking-wide">
                            {displayTitle}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InfoPanel;
