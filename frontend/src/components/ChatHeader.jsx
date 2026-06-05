import React, { useEffect } from 'react';
import { userChatStore } from '../store/userChatStore';
import { XIcon, SearchIcon, ArrowLeftIcon, PhoneIcon, VideoIcon, UsersIcon } from 'lucide-react';
import { userAuthStore } from '../store/userAuthStore';

function ChatHeader({ onOpenSidebar }) {
    const { 
        selectedUser, 
        activeGroup, 
        setSelectedUser, 
        setSelectedGroup, 
        isTyping, 
        groupTypingUsers, 
        showSearch, 
        setShowSearch,
        showInfoPanel,
        setShowInfoPanel
    } = userChatStore();
    const { onlineUsers, authUser } = userAuthStore();

    const isOnline = selectedUser ? onlineUsers.includes(selectedUser._id) : false;

    // Resolve typing status for Group or DM
    let typingStatusText = null;
    let hasTyping = false;

    if (activeGroup) {
        const typingIds = groupTypingUsers[activeGroup._id] || [];
        const filteredTypingIds = typingIds.filter(id => id !== authUser._id);
        if (filteredTypingIds.length > 0) {
            hasTyping = true;
            const names = filteredTypingIds.map(uid => {
                const member = activeGroup.members?.find(m => m.userId?._id === uid || m.userId === uid);
                return member?.userId?.fullName || "Someone";
            });
            if (names.length === 1) {
                typingStatusText = `${names[0]} is typing`;
            } else if (names.length === 2) {
                typingStatusText = `${names[0]} and ${names[1]} are typing`;
            } else {
                typingStatusText = `${names[0]} and ${names.length - 1} others are typing`;
            }
        }
    } else if (selectedUser && isTyping) {
        hasTyping = true;
        typingStatusText = "typing";
    }

    const handleClose = () => {
        if (activeGroup) {
            setSelectedGroup(null);
        } else {
            setSelectedUser(null);
        }
    };

    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === "Escape" && showSearch) setShowSearch(false);
        };
        window.addEventListener("keydown", handleEscKey);
        return () => window.removeEventListener("keydown", handleEscKey);
    }, [showSearch, setShowSearch]);

    const displayTitle = activeGroup ? activeGroup.name : selectedUser?.fullName;
    const displayAvatar = activeGroup ? activeGroup.avatar : selectedUser?.profilePic;

    return (
        <div
            className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6 flex-shrink-0 relative z-10"
            style={{
                background: 'var(--bg-glass)',
                borderBottom: '1px solid var(--border-subtle)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
            }}
        >
            {/* Left: back button (mobile) + avatar + info */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {/* Back button — mobile only */}
                <button
                    className="md:hidden btn-icon p-1.5 flex-shrink-0"
                    onClick={handleClose}
                    aria-label="Back to chats"
                >
                    <ArrowLeftIcon size={20} />
                </button>

                {/* Clickable Info Area */}
                <div 
                    onClick={() => setShowInfoPanel(!showInfoPanel)}
                    className="flex items-center gap-2 sm:gap-3 min-w-0 cursor-pointer hover:bg-white/5 px-2 py-1.5 rounded-xl transition-all duration-200"
                    title="Click to view details"
                >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <div
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden flex items-center justify-center animate-fade-in"
                            style={{ border: '2px solid var(--border-medium)', background: 'var(--bg-input)' }}
                        >
                            {activeGroup ? (
                                displayAvatar ? (
                                    <img
                                        src={displayAvatar}
                                        alt={displayTitle}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <UsersIcon size={18} style={{ color: 'var(--text-muted)' }} />
                                )
                            ) : (
                                <img
                                    src={displayAvatar || "/avatar.png"}
                                    alt={displayTitle}
                                    className="w-full h-full object-cover"
                                />
                            )}
                        </div>
                        {isOnline && !activeGroup && (
                            <span
                                className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 animate-pulse"
                                style={{ background: 'var(--online-color)', ringColor: 'var(--bg-chat)' }}
                            />
                        )}
                    </div>

                    {/* Name + status */}
                    <div className="min-w-0">
                        <h3
                            className="font-semibold text-sm leading-tight truncate"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {displayTitle}
                        </h3>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs leading-tight">
                                {hasTyping ? (
                                    <span className="flex items-center gap-1" style={{ color: 'var(--accent-hover)' }}>
                                        <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                                        <span className="typing-dot" style={{ animationDelay: '200ms' }} />
                                        <span className="typing-dot" style={{ animationDelay: '400ms' }} />
                                        <span className="ml-0.5 font-medium">{typingStatusText}</span>
                                    </span>
                                ) : activeGroup ? (
                                    <span style={{ color: 'var(--text-muted)' }}>
                                        {activeGroup.members?.length || 0} members
                                    </span>
                                ) : isOnline ? (
                                    <span style={{ color: 'var(--online-color)' }}>Online</span>
                                ) : (
                                    <span style={{ color: 'var(--text-muted)' }}>Offline</span>
                                )}
                            </span>
                            {selectedUser && selectedUser.customStatus && !hasTyping && (
                                <>
                                    <span style={{ color: 'var(--text-muted)' }}>·</span>
                                    <span className="text-xs truncate max-w-[100px] sm:max-w-[150px]" style={{ color: 'var(--text-secondary)' }}>
                                        {selectedUser.statusEmoji && <span>{selectedUser.statusEmoji} </span>}
                                        {selectedUser.customStatus}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0">
                {/* Call icons — visual placeholders */}
                <button
                    className="btn-icon p-1.5 sm:p-2 rounded-lg hidden sm:flex"
                    title="Voice call (coming soon)"
                    disabled
                    style={{ opacity: 0.4, cursor: 'not-allowed' }}
                >
                    <PhoneIcon size={18} />
                </button>
                <button
                    className="btn-icon p-1.5 sm:p-2 rounded-lg hidden sm:flex"
                    title="Video call (coming soon)"
                    disabled
                    style={{ opacity: 0.4, cursor: 'not-allowed' }}
                >
                    <VideoIcon size={18} />
                </button>

                {/* Search */}
                <button
                    onClick={() => setShowSearch(true)}
                    className="btn-icon p-1.5 sm:p-2 rounded-lg"
                    title="Search messages"
                    style={showSearch ? { color: 'var(--accent-primary)', background: 'var(--accent-muted)' } : {}}
                >
                    <SearchIcon size={18} />
                </button>

                {/* Close (desktop) */}
                <button
                    className="btn-icon p-1.5 sm:p-2 rounded-lg hidden md:flex"
                    onClick={handleClose}
                    title="Close chat"
                >
                    <XIcon size={18} />
                </button>
            </div>
        </div>
    );
}

export default ChatHeader;