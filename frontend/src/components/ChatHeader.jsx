import React, { useEffect } from 'react';
import { userChatStore } from '../store/userChatStore';
import { XIcon, SearchIcon, ArrowLeftIcon, PhoneIcon, VideoIcon, UsersIcon } from 'lucide-react';
import { userAuthStore } from '../store/userAuthStore';

function ChatHeader() {
    const {
        selectedUser, activeGroup,
        setSelectedUser, setSelectedGroup,
        isTyping, groupTypingUsers,
        showSearch, setShowSearch,
        showInfoPanel, setShowInfoPanel,
        theme,
    } = userChatStore();
    const { onlineUsers, authUser } = userAuthStore();

    const isOnline = selectedUser ? onlineUsers.includes(selectedUser._id) : false;
    const isAmethyst = theme === 'amethyst';

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

    return (
        <div
            className="flex items-center justify-between px-4 sm:px-5 flex-shrink-0 relative z-10 h-[calc(env(safe-area-inset-top,0px)+56px)] sm:h-16 pt-[env(safe-area-inset-top,0px)] sm:pt-0"
            style={{
                background: isAmethyst ? 'rgba(255,255,255,0.75)' : 'rgba(7,7,26,0.80)',
                borderBottom: '1px solid rgba(99,102,241,0.08)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
            }}
        >
            {/* Left: back + info */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
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

                {/* Clickable info */}
                <div
                    onClick={() => setShowInfoPanel(!showInfoPanel)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer px-2.5 py-1.5 transition-all duration-200"
                    style={{ borderRadius: '12px' }}
                    title="Click to view details"
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    {/* Avatar: 44px squircle for groups */}
                    <div
                        className="overflow-hidden flex items-center justify-center flex-shrink-0 animate-fade-in"
                        style={{
                            width: '44px', height: '44px',
                            borderRadius: activeGroup ? '12px' : '50%',
                            background: 'var(--bg-input)',
                            border: isOnline && !activeGroup
                                ? '2px solid var(--online-color)'
                                : '1.5px solid var(--border-medium)',
                            boxShadow: isOnline && !activeGroup ? '0 0 8px var(--online-color)' : 'none',
                        }}
                    >
                        {activeGroup
                            ? (displayAvatar ? <img src={displayAvatar} alt={displayTitle} className="w-full h-full object-cover" /> : <UsersIcon size={18} style={{ color: 'var(--text-muted)' }} />)
                            : <img src={displayAvatar || '/avatar.png'} alt={displayTitle} className="w-full h-full object-cover" />
                        }
                    </div>

                    {/* Name + status */}
                    <div className="min-w-0">
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
                            <span 
                                className="inline-flex items-center text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-1.5 py-0.5 rounded-md font-mono font-medium tracking-wide uppercase select-none"
                                title="This chat is end-to-end encrypted."
                            >
                                🔒 E2EE
                            </span>
                        </h3>
                        <div className="flex items-center gap-1.5">
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
            <div className="flex items-center gap-1 flex-shrink-0">
                {[
                    { icon: <PhoneIcon size={18} />, title: 'Voice call (coming soon)', disabled: true, hide: true },
                    { icon: <VideoIcon size={18} />, title: 'Video call (coming soon)', disabled: true, hide: true },
                ].map((item, i) => (
                    <button
                        key={i}
                        style={{ ...iconBtn, opacity: 0.35, cursor: 'not-allowed' }}
                        title={item.title}
                        disabled
                        className={item.hide ? 'hidden sm:flex' : 'flex'}
                    >
                        {item.icon}
                    </button>
                ))}

                <button
                    style={{ ...iconBtn, ...(showSearch ? { color: 'var(--accent-primary)', background: 'rgba(99,102,241,0.07)' } : {}) }}
                    onClick={() => setShowSearch(true)}
                    title="Search messages"
                    onMouseEnter={e => { if (!showSearch) e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; }}
                    onMouseLeave={e => { if (!showSearch) e.currentTarget.style.background = 'transparent'; }}
                >
                    <SearchIcon size={18} />
                </button>

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