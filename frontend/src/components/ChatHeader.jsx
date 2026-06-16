import React, { useEffect, useState, useRef } from 'react';
import { userChatStore } from '../store/userChatStore';
import { XIcon, SearchIcon, ArrowLeftIcon, PhoneIcon, VideoIcon, UsersIcon, RefreshCw, MoreVertical, Ban, Trash2, Info, Bell, BellOff, Pin, PinOff, Download, ChevronRight } from 'lucide-react';
import { userAuthStore } from '../store/userAuthStore';
import { useCallStore } from '../store/useCallStore';

function ChatHeader() {
    const {
        selectedUser, activeGroup,
        setSelectedUser, setSelectedGroup,
        isTyping, groupTypingUsers,
        showSearch, setShowSearch,
        showInfoPanel, setShowInfoPanel,
        theme,
        refreshActiveChat,
        blockedUsers,
        blockUser,
        unblockUser,
        clearChat,
        mutedChats,
        pinnedChats,
        toggleMuteChat,
        togglePinChat,
        exportChatLog
    } = userChatStore();

    const { initiateCall, isInitiating, callState } = useCallStore();

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showExportSubmenu, setShowExportSubmenu] = useState(false);
    const menuRef = useRef(null);

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        await refreshActiveChat(true);
        setIsRefreshing(false);
    };
    const { onlineUsers, authUser } = userAuthStore();

    const isOnline = selectedUser ? onlineUsers.includes(selectedUser._id) : false;
    const isAmethyst = theme === 'amethyst';

    const isBlockedByThem = !activeGroup && selectedUser && (selectedUser.blockedByThem || selectedUser.blockedUsers?.includes(authUser?._id));
    const isBlockedByMe = !activeGroup && selectedUser && blockedUsers?.some(u => (u._id || u) === selectedUser._id);
    const isBlocked = isBlockedByThem || isBlockedByMe;

    let typingStatusText = null;
    let hasTyping = false;

    if (activeGroup) {
        const typingIds = (groupTypingUsers[activeGroup._id] || []).filter(id => id !== authUser._id);
        if (typingIds.length > 0) {
            hasTyping = true;
            const names = typingIds.map(uid => {
                const member = activeGroup.members?.find(m => m.userId?._id === uid || m.userId === uid);
                return member?.userId?.fullName || 'Someone';
            });
            if (names.length === 1) typingStatusText = `${names[0]} is typing`;
            else if (names.length === 2) typingStatusText = `${names[0]} and ${names[1]} are typing`;
            else typingStatusText = `${names[0]} and ${names.length - 1} others are typing`;
        }
    } else if (selectedUser && isTyping) {
        hasTyping = true;
        typingStatusText = 'typing';
    }

    const handleClose = () => {
        if (activeGroup) setSelectedGroup(null);
        else setSelectedUser(null);
    };

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape' && showSearch) setShowSearch(false); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [showSearch, setShowSearch]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showMenu && menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
                setShowExportSubmenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const displayTitle = activeGroup ? activeGroup.name : selectedUser?.fullName;
    const displayAvatar = activeGroup ? activeGroup.avatar : selectedUser?.profilePic;

    const iconBtn = {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '36px', height: '36px',
        border: 'none', cursor: 'pointer',
        borderRadius: '10px',
        transition: 'all 0.2s ease',
        background: 'transparent',
        color: 'var(--text-secondary)',
        flexShrink: 0,
    };

    const currentChatId = activeGroup ? activeGroup._id : selectedUser?._id;
    const isMuted = mutedChats?.includes(currentChatId);
    const isPinned = pinnedChats?.includes(currentChatId);

    return (
        <div
            className="flex items-center justify-between px-4 sm:px-6 flex-shrink-0 relative z-30 h-[calc(72px+var(--safe-top-padding))] sm:h-[calc(84px+var(--safe-top-padding))]"
            style={{
                paddingTop: 'var(--safe-top-padding)',
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 5%, var(--bg-surface)) 0%, color-mix(in srgb, var(--bg-surface) 90%, transparent) 100%)',
                borderBottom: '1px solid color-mix(in srgb, var(--accent-primary) 12%, var(--border-subtle))',
                backdropFilter: 'blur(28px)',
                WebkitBackdropFilter: 'blur(28px)',
                boxShadow: '0 4px 20px -5px rgba(0, 0, 0, 0.12)',
            }}
        >
            {/* Left: back + info */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 h-full">
                <button
                    className="md:hidden flex-shrink-0"
                    style={iconBtn}
                    onClick={handleClose}
                    aria-label="Back"
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <ArrowLeftIcon size={20} />
                </button>

                {/* Clickable info capsule */}
                <div
                    onClick={() => setShowInfoPanel(!showInfoPanel)}
                    className="flex-grow h-[56px] sm:h-[66px] flex items-center gap-3 min-w-0 cursor-pointer px-4 transition-all duration-200 border border-[var(--border-subtle)] rounded-2xl hover:bg-[var(--bg-glass-hover)] hover:border-[var(--border-medium)] bg-[var(--bg-glass)]"
                    title="Click to view details"
                >
                    {/* Avatar Container with Online status badge overlay */}
                    <div className="relative flex-shrink-0">
                        <div
                            className="overflow-hidden flex items-center justify-center animate-fade-in w-[40px] h-[40px] sm:w-[48px] sm:h-[48px]"
                            style={{
                                borderRadius: activeGroup ? '12px' : '50%',
                                background: 'var(--bg-input)',
                                border: '1.5px solid var(--border-medium)',
                            }}
                        >
                            {activeGroup
                                ? (displayAvatar ? <img src={displayAvatar} alt={displayTitle} className="w-full h-full object-cover" /> : <UsersIcon className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />)
                                : <img src={displayAvatar || '/avatar.png'} alt={displayTitle} className="w-full h-full object-cover" />
                            }
                        </div>
                        {isOnline && !activeGroup && (
                            <span 
                                className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 animate-pulse"
                                style={{
                                    backgroundColor: 'var(--online-color)',
                                    borderColor: 'var(--bg-surface)',
                                }}
                            />
                        )}
                    </div>

                    {/* Name + status */}
                    <div className="min-w-0 flex-1">
                        <h3
                            className="leading-tight truncate flex items-center gap-1.5"
                            style={{
                                color: 'var(--text-primary)',
                                fontFamily: 'var(--font-display)',
                                fontWeight: 700,
                                fontSize: '16px',
                                letterSpacing: '-0.015em',
                            }}
                        >
                            {displayTitle}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            {hasTyping ? (
                                <span className="flex items-center gap-1" style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-body)', fontSize: '12px' }}>
                                    <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                                    <span className="typing-dot" style={{ animationDelay: '200ms' }} />
                                    <span className="typing-dot" style={{ animationDelay: '400ms' }} />
                                    <span className="ml-0.5 font-medium">{typingStatusText}</span>
                                </span>
                            ) : activeGroup ? (
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                                    {activeGroup.members?.length || 0} members
                                </span>
                            ) : isOnline ? (
                                <span style={{ fontSize: '12px', color: 'var(--online-color)', fontFamily: 'var(--font-body)', fontWeight: 500 }}>Online</span>
                            ) : (
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>Offline</span>
                            )}
                            {selectedUser?.customStatus && !hasTyping && (
                                <>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>·</span>
                                    <span className="truncate max-w-[120px]" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
                                        {selectedUser.statusEmoji && <span>{selectedUser.statusEmoji} </span>}{selectedUser.customStatus}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: action icons */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {!activeGroup && selectedUser && (
                    <>
                        <button
                            style={{
                                ...iconBtn,
                                opacity: (!isOnline || isBlocked || isInitiating || callState !== "idle") ? 0.35 : 1,
                                cursor: (!isOnline || isBlocked || isInitiating || callState !== "idle") ? "not-allowed" : "pointer"
                            }}
                            title={isBlocked ? "Unblock user to call" : !isOnline ? "User is offline" : "Voice Call"}
                            disabled={!isOnline || isBlocked || isInitiating || callState !== "idle"}
                            onClick={() => initiateCall(selectedUser, "voice")}
                            className="flex"
                        >
                            <PhoneIcon size={18} />
                        </button>
                        <button
                            style={{
                                ...iconBtn,
                                opacity: (!isOnline || isBlocked || isInitiating || callState !== "idle") ? 0.35 : 1,
                                cursor: (!isOnline || isBlocked || isInitiating || callState !== "idle") ? "not-allowed" : "pointer"
                            }}
                            title={isBlocked ? "Unblock user to call" : !isOnline ? "User is offline" : "Video Call"}
                            disabled={!isOnline || isBlocked || isInitiating || callState !== "idle"}
                            onClick={() => initiateCall(selectedUser, "video")}
                            className="flex animate-fade-in"
                        >
                            <VideoIcon size={18} />
                        </button>
                    </>
                )}

                {/* Three Dot Options Menu */}
                <div className="relative" ref={menuRef}>
                    <button
                        style={{ ...iconBtn, ...(showMenu ? { color: 'var(--accent-primary)', background: 'rgba(99,102,241,0.07)' } : {}) }}
                        onClick={() => {
                            setShowMenu(!showMenu);
                            if (showMenu) setShowExportSubmenu(false);
                        }}
                        title="Options"
                        onMouseEnter={e => { if (!showMenu) e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; }}
                        onMouseLeave={e => { if (!showMenu) e.currentTarget.style.background = 'transparent'; }}
                    >
                        <MoreVertical size={18} />
                    </button>

                    {showMenu && (
                        <div
                            className="absolute right-0 mt-2 w-52 rounded-2xl border p-1.5 shadow-2xl flex flex-col gap-1 z-50 animate-fade-in"
                            style={{
                                background: 'color-mix(in srgb, var(--bg-surface) 94%, var(--accent-primary) 6%)',
                                borderColor: 'var(--border-medium)',
                                boxShadow: 'var(--shadow-glass)',
                                backdropFilter: 'blur(24px)',
                                WebkitBackdropFilter: 'blur(24px)',
                            }}
                        >
                                {/* View Info Option */}
                                <button
                                    onClick={() => {
                                        setShowInfoPanel(!showInfoPanel);
                                        setShowMenu(false);
                                    }}
                                    className="w-full py-2.5 px-3.5 text-left rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-zinc-300 hover:bg-[var(--bg-glass-hover)] hover:text-white"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    <Info size={14} className="text-[var(--accent-primary)]" />
                                    <span>{activeGroup ? "View Group Info" : "View Contact Info"}</span>
                                </button>

                                {/* Search Messages Option */}
                                <button
                                    onClick={() => {
                                        setShowSearch(true);
                                        setShowMenu(false);
                                    }}
                                    className="w-full py-2.5 px-3.5 text-left rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-zinc-300 hover:bg-[var(--bg-glass-hover)] hover:text-white"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    <SearchIcon size={14} className="text-[var(--accent-primary)]" />
                                    <span>Search Messages</span>
                                </button>

                                {/* Mute/Unmute Notifications */}
                                <button
                                    onClick={() => {
                                        toggleMuteChat(currentChatId);
                                        setShowMenu(false);
                                    }}
                                    className="w-full py-2.5 px-3.5 text-left rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-zinc-300 hover:bg-[var(--bg-glass-hover)] hover:text-white"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    {isMuted ? (
                                        <>
                                            <Bell size={14} className="text-[var(--accent-primary)]" />
                                            <span>Unmute Notifications</span>
                                        </>
                                    ) : (
                                        <>
                                            <BellOff size={14} className="text-[var(--accent-primary)]" />
                                            <span>Mute Notifications</span>
                                        </>
                                    )}
                                </button>

                                {/* Pin/Unpin Conversation */}
                                <button
                                    onClick={() => {
                                        togglePinChat(currentChatId);
                                        setShowMenu(false);
                                    }}
                                    className="w-full py-2.5 px-3.5 text-left rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-zinc-300 hover:bg-[var(--bg-glass-hover)] hover:text-white"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    {isPinned ? (
                                        <>
                                            <PinOff size={14} className="text-[var(--accent-primary)]" />
                                            <span>Unpin Conversation</span>
                                        </>
                                    ) : (
                                        <>
                                            <Pin size={14} className="text-[var(--accent-primary)]" />
                                            <span>Pin Conversation</span>
                                        </>
                                    )}
                                </button>

                                {/* Export Chat Log Option */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowExportSubmenu(!showExportSubmenu);
                                    }}
                                    className="w-full py-2.5 px-3.5 text-left rounded-xl text-xs font-semibold flex items-center justify-between transition-all text-zinc-300 hover:bg-[var(--bg-glass-hover)] hover:text-white"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Download size={14} className="text-[var(--accent-primary)]" />
                                        <span>Export Chat Log</span>
                                    </div>
                                    <ChevronRight 
                                        size={14} 
                                        className={`text-[var(--accent-primary)] transition-transform duration-200 ${showExportSubmenu ? "rotate-90" : ""}`} 
                                    />
                                </button>

                                {/* Export Submenu Options */}
                                {showExportSubmenu && (
                                    <div className="pl-6 pr-2 py-1 flex flex-col gap-1.5 animate-fade-in border-l border-[var(--accent-primary)] ml-5 mt-0.5 mb-1">
                                        <button
                                            onClick={() => {
                                                exportChatLog('txt');
                                                setShowMenu(false);
                                                setShowExportSubmenu(false);
                                            }}
                                            className="w-full py-1.5 px-2 text-left rounded-lg text-[11px] font-semibold flex items-center gap-2 transition-all text-zinc-400 hover:bg-[var(--bg-glass-hover)] hover:text-white"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                                            <span>Plain Text (.txt)</span>
                                        </button>
                                        <button
                                            onClick={() => {
                                                exportChatLog('json');
                                                setShowMenu(false);
                                                setShowExportSubmenu(false);
                                            }}
                                            className="w-full py-1.5 px-2 text-left rounded-lg text-[11px] font-semibold flex items-center gap-2 transition-all text-zinc-400 hover:bg-[var(--bg-glass-hover)] hover:text-white"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                                            <span>JSON format (.json)</span>
                                        </button>
                                    </div>
                                )}

                                {/* Refresh Chat Option */}
                                <button
                                    onClick={() => {
                                        handleRefresh();
                                        setShowMenu(false);
                                    }}
                                    disabled={isRefreshing}
                                    className="w-full py-2.5 px-3.5 text-left rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-zinc-300 hover:bg-[var(--bg-glass-hover)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    <RefreshCw size={14} className={`text-[var(--accent-primary)] ${isRefreshing ? "animate-spin" : ""}`} />
                                    <span>Refresh Chat</span>
                                </button>

                                {/* Block/Unblock Option (DMs only) */}
                                {!activeGroup && selectedUser && (
                                    isBlockedByMe ? (
                                        <button
                                            onClick={async () => {
                                                setShowMenu(false);
                                                await unblockUser(selectedUser._id);
                                            }}
                                            className="w-full py-2.5 px-3.5 text-left rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-emerald-400 hover:bg-[var(--bg-glass-hover)] hover:text-emerald-300 border-t border-white/5"
                                        >
                                            <Ban size={14} className="text-emerald-400" />
                                            <span>Unblock User</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={async () => {
                                                setShowMenu(false);
                                                if (window.confirm("Are you sure you want to block this user?")) {
                                                    await blockUser(selectedUser._id);
                                                }
                                            }}
                                            className="w-full py-2.5 px-3.5 text-left rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-red-400 hover:bg-[var(--bg-glass-hover)] hover:text-red-300 border-t border-white/5"
                                        >
                                            <Ban size={14} className="text-red-400" />
                                            <span>Block User</span>
                                        </button>
                                    )
                                )}

                                {/* Clear Chat Option */}
                                <button
                                    onClick={async () => {
                                        setShowMenu(false);
                                        const targetId = activeGroup?._id || selectedUser?._id;
                                        if (targetId && window.confirm("Are you sure you want to clear this chat history? This cannot be undone.")) {
                                            await clearChat(targetId);
                                        }
                                    }}
                                    className="w-full py-2.5 px-3.5 text-left rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-red-400 hover:bg-rose-500/10 hover:text-rose-300 border-t border-white/5 pt-3"
                                >
                                    <Trash2 size={14} className="text-red-400" />
                                    <span>Clear Chat</span>
                                </button>
                            </div>
                    )}
                </div>

                <button
                    style={iconBtn}
                    onClick={handleClose}
                    title="Close chat"
                    className="hidden md:flex"
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <XIcon size={18} />
                </button>
            </div>
        </div>
    );
}

export default ChatHeader;