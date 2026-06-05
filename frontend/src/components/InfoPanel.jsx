import React, { useState, useRef } from 'react';
import { 
    XIcon, UsersIcon, MailIcon, CalendarIcon, InfoIcon, 
    ChevronRightIcon, ChevronLeftIcon, LinkIcon, FileIcon, 
    FileTextIcon, PlayIcon, ExternalLinkIcon, ImageIcon,
    PhoneIcon, MapPinIcon, CakeIcon, EditIcon, UserPlusIcon,
    UserMinusIcon, ShieldIcon
} from 'lucide-react';
import { userChatStore } from '../store/userChatStore';
import { userAuthStore } from '../store/userAuthStore';
import toast from 'react-hot-toast';

function InfoPanel({ onClose }) {
    const { 
        selectedUser, activeGroup, messages, setActivePreviewFile,
        updateGroupDetails, addMembersToGroup, removeMemberFromGroup,
        updateMemberRoleInGroup, leaveGroup, allContacts, getAllContacts
    } = userChatStore();
    const { onlineUsers, authUser } = userAuthStore();
    const [viewMode, setViewMode] = useState("info"); // "info" or "media"
    const [mediaTab, setMediaTab] = useState("media"); // "media", "docs", "links"

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
    const description = activeGroup ? activeGroup.description : (selectedUser?.bio || selectedUser?.customStatus);
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

    // Shared Files / Media view mode
    if (viewMode === "media") {
        return (
            <div className="flex flex-col h-full overflow-hidden animate-fade-in">
                {/* Header */}
                <div
                    className="flex items-center gap-3 h-14 sm:h-16 px-4 border-b flex-shrink-0"
                    style={{
                        borderColor: 'var(--border-subtle)',
                        background: 'var(--bg-glass)',
                    }}
                >
                    <button
                        onClick={() => setViewMode("info")}
                        className="btn-icon p-1.5 rounded-lg text-zinc-400 hover:text-white"
                        title="Back to Info"
                    >
                        <ChevronLeftIcon size={18} />
                    </button>
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        Shared Files
                    </h3>
                </div>

                {/* Tabs Switcher */}
                <div className="px-4 py-2 flex gap-1 border-b flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
                    {['media', 'docs', 'links'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setMediaTab(tab)}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                            style={{
                                background: mediaTab === tab ? 'var(--accent-primary)' : 'transparent',
                                color: mediaTab === tab ? '#fff' : 'var(--text-muted)',
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
                            <div className="grid grid-cols-3 gap-2">
                                {mediaFiles.map((file, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setActivePreviewFile(file)}
                                        className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-80 active:scale-95 transition-all border border-white/5 relative group bg-zinc-900"
                                    >
                                        {file.type === 'image' ? (
                                            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center relative">
                                                <span className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all">
                                                    <PlayIcon size={16} className="text-white" fill="white" />
                                                </span>
                                                <video src={file.url} className="w-full h-full object-cover" muted />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                <ImageIcon size={32} className="text-zinc-500 mb-2" />
                                <p className="text-xs text-zinc-400">No media shared in this chat.</p>
                            </div>
                        )
                    )}

                    {/* Docs list */}
                    {mediaTab === "docs" && (
                        docFiles.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {docFiles.map((file, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setActivePreviewFile(file)}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer border border-white/5 transition-all"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-[var(--accent-primary)] flex-shrink-0">
                                            {file.type === 'pdf' ? <FileTextIcon size={18} /> : <FileIcon size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-zinc-200 truncate">{file.name}</p>
                                            <p className="text-[10px] text-zinc-500 mt-0.5">
                                                {file.fileSize ? `${(file.fileSize / 1024).toFixed(1)} KB` : 'Document'} · {new Date(file.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <a
                                            href={file.url}
                                            onClick={(e) => e.stopPropagation()}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all text-xs"
                                        >
                                            <ExternalLinkIcon size={12} />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                <FileIcon size={32} className="text-zinc-500 mb-2" />
                                <p className="text-xs text-zinc-400">No documents shared in this chat.</p>
                            </div>
                        )
                    )}

                    {/* Links list */}
                    {mediaTab === "links" && (
                        linksList.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {linksList.map((linkItem, idx) => (
                                    <a
                                        key={idx}
                                        href={linkItem.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col gap-1.5 p-3.5 rounded-xl hover:bg-white/5 border border-white/5 transition-all text-left block"
                                    >
                                        <div className="flex items-center gap-2 text-zinc-300 font-semibold text-[11px] uppercase tracking-wider">
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
                            <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                <LinkIcon size={32} className="text-zinc-500 mb-2" />
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
                        background: 'var(--bg-glass)',
                    }}
                >
                    <button
                        onClick={() => setIsEditingGroup(false)}
                        className="btn-icon p-1.5 rounded-lg text-zinc-400 hover:text-white"
                    >
                        <ChevronLeftIcon size={18} />
                    </button>
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        Edit Group details
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-4">
                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-2 pb-2">
                        <div 
                            className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 flex items-center justify-center relative cursor-pointer group bg-zinc-900"
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
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Group Name</label>
                        <input 
                            type="text" 
                            value={editedName} 
                            onChange={(e) => setEditedName(e.target.value)}
                            className="aether-input py-2 px-3 text-xs"
                            placeholder="Group name" 
                        />
                    </div>

                    {/* Description input */}
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Description</label>
                        <textarea 
                            value={editedDesc} 
                            onChange={(e) => setEditedDesc(e.target.value)}
                            rows={3}
                            className="aether-input py-2 px-3 text-xs resize-none"
                            placeholder="Group description..." 
                        />
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => setIsEditingGroup(false)}
                            className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 font-semibold border border-white/5 transition-all"
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
                            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-xs text-white font-bold transition-all shadow-md active:scale-95"
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
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center gap-3 h-14 sm:h-16 px-4 border-b flex-shrink-0"
                style={{
                    borderColor: 'var(--border-subtle)',
                    background: 'var(--bg-glass)',
                }}
            >
                <button
                    onClick={onClose}
                    className="btn-icon p-1.5 rounded-lg"
                    title="Close Panel"
                >
                    <XIcon size={18} />
                </button>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {activeGroup ? 'Group Info' : 'Contact Info'}
                </h3>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 flex flex-col gap-5">
                {/* Hero Section */}
                <div className="flex flex-col items-center text-center gap-3 pb-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div
                        className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center shadow-lg relative group"
                        style={{ border: '3px solid var(--border-medium)', background: 'var(--bg-input)' }}
                    >
                        {activeGroup ? (
                            displayAvatar ? (
                                <img
                                    src={displayAvatar}
                                    alt={displayTitle}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                            ) : (
                                <UsersIcon size={40} style={{ color: 'var(--text-muted)' }} />
                            )
                        ) : (
                            <img
                                src={displayAvatar || "/avatar.png"}
                                alt={displayTitle}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        )}
                    </div>
                    <div className="min-w-0 flex flex-col items-center">
                        <div className="flex items-center justify-center gap-1.5">
                            <h2 className="text-base font-bold truncate px-2" style={{ color: 'var(--text-primary)' }}>
                                {displayTitle}
                            </h2>
                            {activeGroup && isMeAdmin && (
                                <button 
                                    onClick={() => {
                                        setEditedName(activeGroup.name);
                                        setEditedDesc(activeGroup.description || "");
                                        setEditedAvatar(activeGroup.avatar || "");
                                        setIsEditingGroup(true);
                                    }}
                                    className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all active:scale-90"
                                    title="Edit Group Details"
                                >
                                    <EditIcon size={12} />
                                </button>
                            )}
                        </div>
                        {!activeGroup && (
                            <span 
                                className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ 
                                    background: isOnline ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                                    color: isOnline ? 'var(--online-color)' : 'var(--text-muted)' 
                                }}
                            >
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        )}
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

                {/* About / Description Section */}
                <div className="flex flex-col gap-2">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {activeGroup ? 'Group Description' : 'About'}
                    </h4>
                    <div 
                        className="flex gap-2.5 p-3 rounded-xl"
                        style={{ background: 'var(--bg-glass-hover)', border: '1px solid var(--border-subtle)' }}
                    >
                        <InfoIcon size={14} className="text-[var(--accent-primary)] flex-shrink-0 mt-0.5" />
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            {description || (activeGroup ? 'No description provided.' : 'Hey there! I am using Aether Chat.')}
                        </p>
                    </div>
                </div>

                {/* Media, Links & Docs Card */}
                <div 
                    className="flex flex-col gap-2.5 p-3.5 rounded-xl cursor-pointer hover:bg-[var(--bg-glass-hover)] transition-all"
                    style={{ background: 'var(--bg-glass-hover)', border: '1px solid var(--border-subtle)' }}
                    onClick={() => setViewMode("media")}
                >
                    <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            Media, Links & Docs
                        </h4>
                        <span className="text-[11px] font-semibold text-[var(--accent-primary)] flex items-center gap-0.5">
                            {mediaFiles.length + docFiles.length + linksList.length} <ChevronRightIcon size={12} />
                        </span>
                    </div>
                    {mediaFiles.length > 0 ? (
                        <div className="flex gap-2 overflow-x-auto py-1 custom-scrollbar">
                            {mediaFiles.slice(0, 4).map((file, idx) => (
                                <div 
                                    key={idx} 
                                    className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-white/5 bg-zinc-900"
                                >
                                    {file.type === 'image' ? (
                                        <img src={file.url} alt="media preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-zinc-850 relative">
                                            <span className="absolute inset-0 flex items-center justify-center bg-black/30"><PlayIcon size={10} className="text-white" /></span>
                                            <video src={file.url} className="w-full h-full object-cover" muted />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[10px] text-zinc-500">No media, links, or docs shared yet.</p>
                    )}
                </div>

                {/* Details Section */}
                <div className="flex flex-col gap-2">
                    <h4 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Details
                    </h4>
                    <div 
                        className="flex flex-col gap-2.5 p-3.5 rounded-xl text-xs"
                        style={{ background: 'var(--bg-glass-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
                    >
                        {!activeGroup && selectedUser?.email && (
                            <div className="flex items-center gap-2.5">
                                <MailIcon size={13} className="text-[var(--accent-primary)] flex-shrink-0" />
                                <span className="truncate">{selectedUser.email}</span>
                            </div>
                        )}
                        {!activeGroup && selectedUser?.phone && (
                            <div className="flex items-center gap-2.5">
                                <PhoneIcon size={13} className="text-[var(--accent-primary)] flex-shrink-0" />
                                <span className="truncate">{selectedUser.phone}</span>
                            </div>
                        )}
                        {!activeGroup && selectedUser?.location && (
                            <div className="flex items-center gap-2.5">
                                <MapPinIcon size={13} className="text-[var(--accent-primary)] flex-shrink-0" />
                                <span className="truncate">{selectedUser.location}</span>
                            </div>
                        )}
                        {!activeGroup && selectedUser?.dob && (
                            <div className="flex items-center gap-2.5">
                                <CakeIcon size={13} className="text-[var(--accent-primary)] flex-shrink-0" />
                                <span>Born on {new Date(selectedUser.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2.5">
                            <CalendarIcon size={13} className="text-[var(--accent-primary)] flex-shrink-0" />
                            <span>
                                {activeGroup 
                                    ? `Created on ${formatDate(activeGroup.createdAt)}`
                                    : `Joined on ${formatDate(selectedUser?.createdAt)}`
                                }
                            </span>
                        </div>
                    </div>
                </div>

                {/* Group Members Section */}
                {activeGroup && (
                    <div className="flex flex-col gap-2 flex-1 min-h-[180px] relative">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                Group Members
                            </h4>
                            <div className="flex items-center gap-1.5">
                                {isMeAdmin && (
                                    <button 
                                        onClick={openAddMemberModal}
                                        className="text-[9px] text-[var(--accent-primary)] hover:underline font-bold uppercase tracking-wider flex items-center gap-0.5 transition-all active:scale-95"
                                    >
                                        <UserPlusIcon size={10} /> Add
                                    </button>
                                )}
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent-muted)', color: 'var(--text-accent)' }}>
                                    {activeGroup.members?.length || 0}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                            {activeGroup.members?.map((member, idx) => {
                                const memberUser = member.userId;
                                if (!memberUser) return null;

                                const isCreator = activeGroup.creatorId === memberUser._id;
                                const isAdmin = member.role === 'admin' || isCreator;

                                return (
                                    <div 
                                        key={memberUser._id || idx}
                                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 transition-all duration-150 group"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 bg-zinc-800">
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
                                                    className="flex items-center gap-0.5 text-[8px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-md"
                                                    style={{ 
                                                        background: isCreator ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.06)',
                                                        color: isCreator ? '#a78bfa' : 'var(--text-muted)'
                                                    }}
                                                >
                                                    {isCreator ? 'Creator' : 'Admin'}
                                                </span>
                                            )}

                                            {/* Admin Management options */}
                                            {isMeAdmin && !isCreator && memberUser._id !== authUser._id && (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ml-1 bg-zinc-900/60 p-0.5 rounded-md">
                                                    <button
                                                        onClick={() => updateMemberRoleInGroup(activeGroup._id, memberUser._id, member.role === 'admin' ? 'member' : 'admin')}
                                                        className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                                                        title={member.role === 'admin' ? 'Demote to Member' : 'Promote to Admin'}
                                                    >
                                                        <ShieldIcon size={10} className={member.role === 'admin' ? 'text-pink-400' : 'text-zinc-500'} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (window.confirm(`Are you sure you want to remove ${memberUser.fullName} from this group?`)) {
                                                                removeMemberFromGroup(activeGroup._id, memberUser._id);
                                                            }
                                                        }}
                                                        className="p-1 rounded hover:bg-white/10 text-red-400 hover:text-red-350 transition-colors"
                                                        title="Remove Member"
                                                    >
                                                        <UserMinusIcon size={10} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Leave Group Button */}
                        {activeGroup.creatorId !== authUser._id && (
                            <button
                                onClick={() => {
                                    if (window.confirm("Are you sure you want to leave this group?")) {
                                        leaveGroup(activeGroup._id);
                                        onClose();
                                    }
                                }}
                                className="mt-4 w-full py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                            >
                                Leave Group
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Add Member modal view */}
            {isAddMemberOpen && activeGroup && (
                <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-30 flex flex-col animate-fade-in">
                    {/* Header */}
                    <div className="flex items-center justify-between h-14 sm:h-16 px-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
                        <h3 className="font-semibold text-sm text-[var(--text-primary)]">Add Members</h3>
                        <button 
                            onClick={() => setIsAddMemberOpen(false)}
                            className="btn-icon p-1.5 rounded-lg text-zinc-400 hover:text-white"
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
                                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all duration-150
                                            ${isSelected 
                                                ? 'bg-pink-500/10 border-pink-500/40' 
                                                : 'bg-white/5 border-white/5 hover:bg-white/10'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <img 
                                                src={contact.profilePic || "/avatar.png"} 
                                                alt={contact.fullName} 
                                                className="w-8 h-8 rounded-full object-cover border border-white/10"
                                            />
                                            <span className="text-xs font-semibold text-zinc-200 truncate">{contact.fullName}</span>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={() => {}} // click handler handles it
                                            className="checkbox checkbox-xs checkbox-primary"
                                        />
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-xs text-zinc-500 text-center py-8">All your contacts are already members.</p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t flex gap-2 flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
                        <button 
                            onClick={() => setIsAddMemberOpen(false)}
                            className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 font-semibold transition-all border border-white/5"
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
                            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-xs text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                            Add ({selectedUserIds.length})
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default InfoPanel;
