import React, { useEffect } from 'react';
import { userChatStore } from '../store/userChatStore';
import { userAuthStore } from '../store/userAuthStore';
import UsersLoadingSkeleton from './UserLoadingSkeleton';
import NoChatsFound from './NoChatsFound';
import { formatMessageTime } from '../lib/timeUtils';
import { MicIcon, ImageIcon, FileIcon, UsersIcon, Pin, BellOff, UserIcon, Lock } from 'lucide-react';

function ChatListItem({ 
  chat, isActive, isOnline, preview, pinnedChats, mutedChats, 
  syncingCount, failedCount, formatMessageTime, setSelectedGroup, 
  setSelectedUser, onSelectChat, theme, activeGroup, selectedUser
}) {
  const [shouldAnimate, setShouldAnimate] = React.useState(false);
  const prevMsgIdRef = React.useRef(chat.lastMessage?._id);

  React.useEffect(() => {
    const currentMsgId = chat.lastMessage?._id;
    if (currentMsgId && currentMsgId !== prevMsgIdRef.current) {
      setShouldAnimate(true);
      prevMsgIdRef.current = currentMsgId;
      const timer = setTimeout(() => setShouldAnimate(false), 800);
      return () => clearTimeout(timer);
    }
  }, [chat.lastMessage?._id]);

  const isAmethyst = theme === 'amethyst';
  const activeStyle = isActive ? (
    isAmethyst
      ? { background: '#ffffff', boxShadow: '0 4px 20px rgba(99,102,241,0.13)', borderColor: 'rgba(99,102,241,0.18)' }
      : { background: 'rgba(99,102,241,0.13)', borderColor: 'rgba(99,102,241,0.25)' }
  ) : {};

  return (
    <div
      className={`chat-item animate-fade-in ${shouldAnimate ? 'chat-item-update' : ''}`}
      style={activeStyle}
      onClick={() => {
        if (chat.isGroup) setSelectedGroup(chat);
        else setSelectedUser(chat);
        onSelectChat?.();
      }}
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
          {chat.lastMessage?.createdAt && (
            <span
              className="flex-shrink-0 tabular-nums"
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
            {chat.unreadCount > 0 && (
              <span className="unread-badge">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
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
    offlineQueue, loadOfflineQueue
  } = userChatStore();
  const { onlineUsers, authUser } = userAuthStore();

  useEffect(() => {
    getMyChatPartners();
    getGroups();
    loadOfflineQueue();
  }, []);

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
          />
        );
      })}
    </div>
  );
}

export default ChatList;