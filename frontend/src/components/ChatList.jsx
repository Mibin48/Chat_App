import React, { useEffect } from 'react';
import { userChatStore } from '../store/userChatStore';
import { userAuthStore } from '../store/userAuthStore';
import UsersLoadingSkeleton from './UserLoadingSkeleton';
import NoChatsFound from './NoChatsFound';
import { formatMessageTime } from '../lib/timeUtils';
import { MicIcon, ImageIcon, FileIcon, UsersIcon } from 'lucide-react';

function ChatList({ onSelectChat }) {
  const { 
    getMyChatPartners, 
    getGroups, 
    chats, 
    groups, 
    isUsersLoading, 
    isGroupsLoading,
    setSelectedUser, 
    setSelectedGroup, 
    selectedUser, 
    activeGroup,
    sidebarSearchQuery
  } = userChatStore();
  const { onlineUsers, authUser } = userAuthStore();

  useEffect(() => { 
    getMyChatPartners(); 
    getGroups();
  }, [getMyChatPartners, getGroups]);

  if (isUsersLoading || isGroupsLoading) return <UsersLoadingSkeleton />;

  // Merge & Sort Chats and Groups
  const dmItems = chats.map(chat => ({ ...chat, isGroup: false }));
  const groupItems = groups.map(group => ({ ...group, isGroup: true }));
  const allChats = [...dmItems, ...groupItems];

  allChats.sort((a, b) => {
    const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.createdAt || 0);
    const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.createdAt || 0);
    return timeB - timeA;
  });

  const filteredChats = allChats.filter(chat => {
    const name = chat.isGroup ? chat.name : chat.fullName;
    return name?.toLowerCase().includes(sidebarSearchQuery.toLowerCase());
  });

  if (filteredChats.length === 0) return <NoChatsFound />;

  const getLastMessagePreview = (chat) => {
    const msg = chat.lastMessage;
    if (!msg) return <span className="text-zinc-500 italic">No messages yet</span>;

    let prefix = "";
    if (chat.isGroup && msg.senderId) {
      const senderId = msg.senderId._id || msg.senderId;
      const senderName = senderId === authUser._id ? 'You' : (msg.senderId.fullName || 'Member');
      prefix = `${senderName}: `;
    }

    if (msg.image) return (
      <span className="flex items-center gap-1.5 truncate">
        {prefix && <span>{prefix}</span>}
        <ImageIcon size={12} className="flex-shrink-0" />
        <span>Photo</span>
      </span>
    );
    if (msg.audioUrl) return (
      <span className="flex items-center gap-1.5 truncate">
        {prefix && <span>{prefix}</span>}
        <MicIcon size={12} className="flex-shrink-0" />
        <span>Voice message</span>
      </span>
    );
    if (msg.fileUrl) return (
      <span className="flex items-center gap-1.5 truncate">
        {prefix && <span>{prefix}</span>}
        <FileIcon size={12} className="flex-shrink-0" />
        <span className="truncate">{msg.fileName || 'File'}</span>
      </span>
    );
    if (msg.text) {
      const textVal = msg.text.length > 40 ? msg.text.slice(0, 40) + '…' : msg.text;
      return `${prefix}${textVal}`;
    }
    return `${prefix}New message`;
  };

  return (
    <div className="space-y-0.5">
      {filteredChats.map(chat => {
        const isOnline = !chat.isGroup && onlineUsers?.includes(chat._id);
        const isActive = chat.isGroup 
          ? activeGroup?._id === chat._id 
          : selectedUser?._id === chat._id;
        const preview = getLastMessagePreview(chat);

        return (
          <div
            key={chat._id}
            className="chat-item animate-fade-in"
            style={isActive ? {
              background: 'var(--accent-muted)',
              borderColor: 'var(--border-accent)',
            } : {}}
            onClick={() => {
              if (chat.isGroup) {
                setSelectedGroup(chat);
              } else {
                setSelectedUser(chat);
              }
              onSelectChat?.();
            }}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-11 h-11 rounded-full overflow-hidden transition-all duration-200 flex items-center justify-center"
                style={{ 
                  border: `2px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  background: 'var(--bg-input)'
                }}
              >
                {chat.isGroup ? (
                  chat.avatar ? (
                    <img
                      src={chat.avatar}
                      alt={chat.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UsersIcon size={20} style={{ color: 'var(--text-muted)' }} />
                  )
                ) : (
                  <img
                    src={chat.profilePic || "/avatar.png"}
                    alt={chat.fullName}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              {isOnline && (
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2"
                  style={{ background: 'var(--online-color)', ringColor: 'var(--bg-sidebar)' }}
                />
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <h4
                  className="font-semibold text-sm truncate leading-tight tracking-tight"
                  style={{ color: isActive ? 'var(--text-accent)' : 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}
                >
                  {chat.isGroup ? chat.name : chat.fullName}
                </h4>
                {chat.lastMessage?.createdAt && (
                  <span
                    className="text-[10px] flex-shrink-0 tabular-nums"
                    style={{ color: chat.unreadCount > 0 ? 'var(--accent-hover)' : 'var(--text-muted)', fontWeight: chat.unreadCount > 0 ? 600 : 400 }}
                  >
                    {formatMessageTime(chat.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1">
                <p
                  className="text-xs truncate leading-tight"
                  style={{
                    color: chat.unreadCount > 0 ? 'var(--text-secondary)' : 'var(--text-muted)',
                    fontWeight: chat.unreadCount > 0 ? 500 : 400,
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.75rem',
                  }}
                >
                  {preview}
                </p>
                {chat.unreadCount > 0 && (
                  <span className="unread-badge flex-shrink-0">
                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ChatList;