import React, { useEffect } from 'react';
import { userChatStore } from '../store/userChatStore';
import { userAuthStore } from '../store/userAuthStore';
import UsersLoadingSkeleton from './UserLoadingSkeleton';
import NoChatsFound from './NoChatsFound';
import { formatMessageTime } from '../lib/timeUtils';
import { MicIcon, ImageIcon, FileIcon, UsersIcon, Pin, BellOff, UserIcon, Lock, MoreVertical } from 'lucide-react';

function ChatListItem({ 
  chat, isActive, isOnline, preview, pinnedChats, mutedChats, 
  syncingCount, failedCount, formatMessageTime, setSelectedGroup, 
  setSelectedUser, onSelectChat, theme, activeGroup, selectedUser,
  onContextMenu, markedUnreadChats
}) {
  const [shouldAnimate, setShouldAnimate] = React.useState(false);
  const prevMsgIdRef = React.useRef(chat.lastMessage?._id);

  // Swipe States for Mobile Actions
  const [touchStartX, setTouchStartX] = React.useState(null);
  const [touchStartY, setTouchStartY] = React.useState(null);
  const [touchDelta, setTouchDelta] = React.useState(0);
  const [swipedOpen, setSwipedOpen] = React.useState(false);

  const { togglePinChat, toggleMuteChat } = userChatStore();

  React.useEffect(() => {
    const currentMsgId = chat.lastMessage?._id;
    if (currentMsgId && currentMsgId !== prevMsgIdRef.current) {
      setShouldAnimate(true);
      prevMsgIdRef.current = currentMsgId;
      const timer = setTimeout(() => setShouldAnimate(false), 800);
      return () => clearTimeout(timer);
    }
  }, [chat.lastMessage?._id]);

  React.useEffect(() => {
    setTouchDelta(0);
    setSwipedOpen(false);
  }, [isActive]);

  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (touchStartX === null || touchStartY === null) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX;
    const deltaY = currentY - touchStartY;
    
    // Ignore swipe if vertical scrolling is dominant
    if (Math.abs(deltaY) > Math.abs(deltaX) * 0.8) {
      return;
    }
    
    if (deltaX < 0) {
      // Swiping left to reveal actions
      setTouchDelta(Math.max(-100, deltaX));
    }
  };

  const handleTouchEnd = () => {
    if (touchDelta < -50) {
      setSwipedOpen(true);
      setTouchDelta(-100);
    } else {
      setSwipedOpen(false);
      setTouchDelta(0);
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const isPinned = pinnedChats?.includes(chat._id);
  const isMuted = mutedChats?.includes(chat._id);
  const isManuallyUnread = markedUnreadChats?.includes(chat._id);
  const showUnreadBadge = chat.unreadCount > 0 || isManuallyUnread;

  const isAmethyst = theme === 'amethyst';
  const activeStyle = isActive ? (
    isAmethyst
      ? { background: '#ffffff', boxShadow: '0 4px 20px rgba(99,102,241,0.13)', borderColor: 'rgba(99,102,241,0.18)' }
      : { 
          background: theme === 'midnight' 
            ? 'color-mix(in srgb, #0d0d0d 87%, var(--accent-primary) 13%)' 
            : 'color-mix(in srgb, #0a0a1e 87%, var(--accent-primary) 13%)', 
          borderColor: 'rgba(99,102,241,0.25)' 
        }
  ) : {
    background: theme === 'amethyst' 
      ? '#ffffff' 
      : theme === 'midnight'
        ? '#0d0d0d'
        : '#0a0a1e',
    borderColor: 'transparent'
  };

  return (
    <div 
      className="relative overflow-hidden w-full select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Swipe Actions for Mobile */}
      <div 
        className="absolute right-[12px] top-[6px] bottom-[6px] w-[100px] flex items-stretch z-0 rounded-2xl overflow-hidden"
        style={{ margin: '0' }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePinChat(chat._id);
            setTouchDelta(0);
            setSwipedOpen(false);
          }}
          className="flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 border-none text-white hover:brightness-110 active:scale-95 cursor-pointer"
          style={{
            background: isPinned 
              ? 'linear-gradient(135deg, #f43f5e, #e11d48)' 
              : 'linear-gradient(135deg, #6366f1, #4f46e5)', 
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          <Pin size={13} className={`${isPinned ? "rotate-45" : ""} transition-transform duration-200`} />
          <span className="text-[9px] font-extrabold tracking-wider uppercase opacity-90">{isPinned ? 'Unpin' : 'Pin'}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMuteChat(chat._id);
            setTouchDelta(0);
            setSwipedOpen(false);
          }}
          className="flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 border-none text-white hover:brightness-110 active:scale-95 cursor-pointer"
          style={{
            background: isMuted
              ? 'linear-gradient(135deg, #e2e8f0, #cbd5e1)' 
              : 'linear-gradient(135deg, #4b5563, #374151)', 
            color: isMuted ? '#0f172a' : '#ffffff',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          <BellOff size={13} className="transition-transform duration-200" />
          <span className="text-[9px] font-extrabold tracking-wider uppercase opacity-90">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>
      </div>

      <div
        className={`chat-item group animate-fade-in ${shouldAnimate ? 'chat-item-update' : ''}`}
        style={{
          ...activeStyle,
          transform: `translate3d(${touchDelta}px, 0, 0)`,
          transition: touchStartX === null ? 'transform 250ms cubic-bezier(0.175, 0.885, 0.32, 1.275)' : 'none',
          position: 'relative',
          zIndex: 10,
        }}
        onClick={() => {
          if (swipedOpen) {
            setTouchDelta(0);
            setSwipedOpen(false);
            return;
          }
          if (chat.isGroup) setSelectedGroup(chat);
          else setSelectedUser(chat);
          onSelectChat?.();
        }}
        onContextMenu={(e) => onContextMenu?.(e, chat)}
      >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="overflow-hidden flex items-center justify-center"
          style={{
            width: '46px',
            height: '46px',
            borderRadius: chat.isGroup ? '14px' : '50%',
            background: 'var(--bg-input)',
            border: `2px solid ${isOnline ? 'var(--online-color)' : isActive ? 'var(--accent-primary)' : 'rgba(99,102,241,0.2)'}`,
            boxShadow: isOnline ? '0 0 8px var(--online-color)' : 'none',
            flexShrink: 0,
          }}
        >
          {chat.isGroup
            ? (chat.avatar ? <img src={chat.avatar} alt={chat.name} className="w-full h-full object-cover" /> : <UsersIcon size={18} style={{ color: 'var(--text-muted)' }} />)
            : <img src={chat.profilePic || '/avatar.png'} alt={chat.fullName} className="w-full h-full object-cover" />
          }
        </div>
        {isOnline && (
          <span
            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full"
            style={{ background: 'var(--online-color)', border: '2px solid var(--bg-surface)', boxShadow: '0 0 5px var(--online-color)' }}
          />
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <h4
            className="truncate leading-tight flex items-center gap-1.5"
            style={{
              color: isActive ? 'var(--text-accent)' : 'var(--text-primary)',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '-0.01em',
            }}
          >
            <span className="truncate">{chat.isGroup ? chat.name : chat.fullName}</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              {pinnedChats?.includes(chat._id) && (
                <Pin size={11} className="text-[var(--accent-primary)] rotate-45" fill="currentColor" />
              )}
              {mutedChats?.includes(chat._id) && (
                <BellOff size={11} className="text-zinc-500" />
              )}
            </div>
          </h4>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {chat.lastMessage?.createdAt && (
              <span
                className="tabular-nums"
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: chat.unreadCount > 0 ? 'var(--accent-primary)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {formatMessageTime(chat.lastMessage.createdAt)}
              </span>
            )}
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onContextMenu?.(e, chat);
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer border-none bg-transparent hover:bg-[var(--bg-glass-hover)] hover:text-[var(--accent-primary)] text-[var(--text-muted)] opacity-50 md:opacity-0 md:group-hover:opacity-100 active:scale-90"
              title="Options"
              style={{
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <MoreVertical size={13} className="stroke-[2.5]" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-1">
          <p
            className="truncate leading-tight"
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              opacity: chat.unreadCount > 0 ? 0.85 : 0.55,
              fontWeight: chat.unreadCount > 0 ? 500 : 400,
              fontFamily: 'var(--font-body)',
            }}
          >
            {preview}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {syncingCount > 0 && (
              <span 
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse"
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: 'var(--accent-hover)',
                  border: '1px solid rgba(245, 158, 11, 0.25)'
                }}
                title={`${syncingCount} message(s) in outbox syncing...`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                <span>Syncing ({syncingCount})</span>
              </span>
            )}
            {failedCount > 0 && syncingCount === 0 && (
              <span 
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.25)'
                }}
                title={`${failedCount} message(s) failed to sync.`}
              >
                <span>(!) Failed ({failedCount})</span>
              </span>
            )}
            {showUnreadBadge && (
              <span className="unread-badge">
                {isManuallyUnread ? "" : chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}

function ChatList({ onSelectChat }) {
  const {
    getMyChatPartners, getGroups, chats, groups,
    isUsersLoading, isGroupsLoading,
    setSelectedUser, setSelectedGroup,
    selectedUser, activeGroup, sidebarSearchQuery,
    theme, dmTypingUsers, groupTypingUsers,
    pinnedChats, mutedChats,
    offlineQueue, loadOfflineQueue,
    markedUnreadChats, markChatAsUnread, markChatAsRead,
    togglePinChat, toggleMuteChat
  } = userChatStore();
  const { onlineUsers, authUser } = userAuthStore();

  const [contextMenu, setContextMenu] = React.useState(null); // { x, y, chat }

  useEffect(() => {
    getMyChatPartners();
    getGroups();
    loadOfflineQueue();
  }, []);

  useEffect(() => {
    const handleCloseMenu = () => setContextMenu(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  const handleContextMenu = (e, chat) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      chat
    });
  };

  if (isUsersLoading || isGroupsLoading) return <UsersLoadingSkeleton />;

  const dmItems = chats.map(c => ({ ...c, isGroup: false }));
  const groupItems = groups.map(g => ({ ...g, isGroup: true }));
  const allChats = [...dmItems, ...groupItems];

  allChats.sort((a, b) => {
    const isAPinned = pinnedChats?.includes(a._id) || false;
    const isBPinned = pinnedChats?.includes(b._id) || false;

    if (isAPinned && !isBPinned) return -1;
    if (!isAPinned && isBPinned) return 1;

    // Sort by newest message timestamp
    const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.createdAt || 0);
    const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.createdAt || 0);
    return timeB - timeA;
  });

  const filteredChats = allChats.filter(chat => {
    const name = chat.isGroup ? chat.name : chat.fullName;
    return name?.toLowerCase().includes(sidebarSearchQuery.toLowerCase());
  });

  if (filteredChats.length === 0) return <NoChatsFound />;

  const getPreview = (chat) => {
    if (chat.isGroup) {
      const typingIds = (groupTypingUsers[chat._id] || []).filter(id => id !== authUser._id);
      if (typingIds.length > 0) {
        const typingId = typingIds[0];
        const member = chat.members?.find(m => (m.userId?._id || m.userId) === typingId);
        const name = member?.userId?.fullName || 'Someone';
        return (
          <span className="text-[var(--accent-primary)] font-semibold animate-pulse">
            {typingIds.length > 1 ? `${typingIds.length} members are typing...` : `${name} is typing...`}
          </span>
        );
      }
    } else {
      const isTyping = dmTypingUsers[chat._id];
      if (isTyping) {
        return (
          <span className="text-[var(--accent-primary)] font-semibold animate-pulse">
            typing...
          </span>
        );
      }
    }

    const msg = chat.lastMessage;
    if (!msg) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No messages yet</span>;

    let prefix = '';
    if (msg.senderId) {
      const sid = msg.senderId._id || msg.senderId;
      if (sid === authUser._id) {
        prefix = 'You: ';
      } else if (chat.isGroup) {
        prefix = `${msg.senderId.fullName || 'Member'}: `;
      }
    }

    if (msg.image) return <span className="flex items-center gap-1.5">{prefix && <span>{prefix}</span>}<ImageIcon size={11} className="flex-shrink-0" /><span>Photo</span></span>;
    if (msg.audioUrl) return <span className="flex items-center gap-1.5">{prefix && <span>{prefix}</span>}<MicIcon size={11} className="flex-shrink-0" /><span>Voice message</span></span>;
    if (msg.fileUrl) return <span className="flex items-center gap-1.5">{prefix && <span>{prefix}</span>}<FileIcon size={11} className="flex-shrink-0" /><span className="truncate">{msg.fileName || 'File'}</span></span>;
    if (msg.contentType === 'contact') {
      if (msg.text && (msg.text.startsWith('🔒') || msg.text.includes('Encrypted Contact'))) {
        return <span className="flex items-center gap-1.5">{prefix && <span>{prefix}</span>}<UserIcon size={11} className="flex-shrink-0" /><span className="flex items-center gap-1 text-[var(--text-muted)]"><Lock size={10} className="text-zinc-550" /> [Encrypted Contact]</span></span>;
      }
      let contactName = 'Contact';
      try {
        const parsed = msg.sharedContact || JSON.parse(msg.text);
        if (parsed && parsed.fullName) {
          contactName = parsed.fullName;
        }
      } catch (e) {}
      return <span className="flex items-center gap-1.5">{prefix && <span>{prefix}</span>}<UserIcon size={11} className="flex-shrink-0" /><span className="truncate">Contact: {contactName}</span></span>;
    }
    if (msg.text) {
      const isEncryptedPlaceholder = msg.text.startsWith('[Encrypted Message]') || msg.text.startsWith('[Decryption Failed') || msg.text.startsWith('[Legacy Encrypted Message]') || msg.text.startsWith('🔒');
      const displayText = msg.text.startsWith('🔒 ') ? msg.text.substring(2) : msg.text.startsWith('🔒') ? msg.text.substring(1) : msg.text;
      return (
        <span className="flex items-center gap-1 overflow-hidden max-w-full">
          {prefix && <span className="flex-shrink-0">{prefix}</span>}
          {isEncryptedPlaceholder && <Lock size={10} className="text-indigo-400 flex-shrink-0" />}
          <span className="truncate">{displayText}</span>
        </span>
      );
    }
    return `${prefix}New message`;
  };

  return (
    <div className="space-y-0.5 pb-2">
      {filteredChats.map(chat => {
        const isOnline = !chat.isGroup && onlineUsers?.includes(chat._id);
        const isActive = chat.isGroup
          ? activeGroup?._id === chat._id
          : selectedUser?._id === chat._id;
        
        const chatQueue = offlineQueue?.filter(item => 
          chat.isGroup 
            ? item.isGroup && item.groupId === chat._id 
            : !item.isGroup && item.recipientId === chat._id
        ) || [];

        const syncingCount = chatQueue.filter(item => !item.isFailed).length;
        const failedCount = chatQueue.filter(item => item.isFailed).length;

        let preview = getPreview(chat);

        if (chatQueue.length > 0) {
          const sortedQueue = [...chatQueue].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          const latestQueued = sortedQueue[0];
          
          let prefix = 'You: ';
          let queuedText = latestQueued.textPlain || latestQueued.messageData?.text || "";
          
          if (latestQueued.messageData?.image) queuedText = "Photo";
          if (latestQueued.messageData?.audioUrl) queuedText = "Voice message";
          if (latestQueued.messageData?.fileUrl) queuedText = latestQueued.messageData.fileName || "File";
          
          const previewText = queuedText.length > 38 ? queuedText.slice(0, 38) + '…' : queuedText;
          
          preview = (
            <span className="flex items-center gap-1">
              <span>{prefix}{previewText}</span>
            </span>
          );
        }

        return (
          <ChatListItem
            key={chat._id}
            chat={chat}
            isActive={isActive}
            isOnline={isOnline}
            preview={preview}
            pinnedChats={pinnedChats}
            mutedChats={mutedChats}
            syncingCount={syncingCount}
            failedCount={failedCount}
            formatMessageTime={formatMessageTime}
            setSelectedGroup={setSelectedGroup}
            setSelectedUser={setSelectedUser}
            onSelectChat={onSelectChat}
            theme={theme}
            activeGroup={activeGroup}
            selectedUser={selectedUser}
            onContextMenu={handleContextMenu}
            markedUnreadChats={markedUnreadChats}
          />
        );
      })}

      {/* Custom Context Menu */}
      {contextMenu && (
        <div
          className="fixed rounded-2xl border p-1.5 shadow-2xl flex flex-col gap-0.5 z-[1000] animate-fade-in w-40"
          style={{
            left: contextMenu.x > 220 ? contextMenu.x - 170 : contextMenu.x,
            top: contextMenu.y,
            background: theme === 'amethyst' ? '#ffffff' : 'rgba(18, 18, 38, 0.98)',
            borderColor: 'var(--border-medium)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              togglePinChat(contextMenu.chat._id);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors text-left"
          >
            <Pin size={12} className="text-indigo-400" />
            <span>{pinnedChats?.includes(contextMenu.chat._id) ? "Unpin Chat" : "Pin Chat"}</span>
          </button>
          <button
            onClick={() => {
              toggleMuteChat(contextMenu.chat._id);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors text-left"
          >
            <BellOff size={12} className="text-indigo-400" />
            <span>{mutedChats?.includes(contextMenu.chat._id) ? "Unmute Chat" : "Mute Chat"}</span>
          </button>
          <button
            onClick={() => {
              const isUnread = markedUnreadChats?.includes(contextMenu.chat._id) || contextMenu.chat.unreadCount > 0;
              if (isUnread) {
                // Mark as read
                if (contextMenu.chat.isGroup) {
                  const timestamps = { ...userChatStore.getState().groupReadTimestamps, [contextMenu.chat._id]: new Date().toISOString() };
                  localStorage.setItem("aether-group-read-timestamps", JSON.stringify(timestamps));
                  userChatStore.setState({
                    groupReadTimestamps: timestamps,
                    groups: userChatStore.getState().groups.map(g => g._id === contextMenu.chat._id ? { ...g, unreadCount: 0 } : g)
                  });
                } else {
                  userChatStore.setState({
                    chats: userChatStore.getState().chats.map(c => c._id === contextMenu.chat._id ? { ...c, unreadCount: 0 } : c)
                  });
                }
                markChatAsRead(contextMenu.chat._id);
              } else {
                markChatAsUnread(contextMenu.chat._id);
              }
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors text-left border-t border-[var(--border-subtle)] mt-0.5 pt-1.5"
          >
            <UserIcon size={12} className="text-indigo-400" />
            <span>
              {markedUnreadChats?.includes(contextMenu.chat._id) || contextMenu.chat.unreadCount > 0 ? "Mark as Read" : "Mark as Unread"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export default ChatList;