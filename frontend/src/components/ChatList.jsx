import React, { useEffect } from 'react';
import { userChatStore } from '../store/userChatStore';
import { userAuthStore } from '../store/userAuthStore';
import UsersLoadingSkeleton from './UserLoadingSkeleton';
import NoChatsFound from './NoChatsFound';
import { formatMessageTime } from '../lib/timeUtils';
import { MicIcon, ImageIcon, FileIcon, UsersIcon } from 'lucide-react';

function ChatList({ onSelectChat }) {
  const {
    getMyChatPartners, getGroups, chats, groups,
    isUsersLoading, isGroupsLoading,
    setSelectedUser, setSelectedGroup,
    selectedUser, activeGroup, sidebarSearchQuery,
    theme,
  } = userChatStore();
  const { onlineUsers, authUser } = userAuthStore();

  useEffect(() => {
    getMyChatPartners();
    getGroups();
  }, [getMyChatPartners, getGroups]);

  if (isUsersLoading || isGroupsLoading) return <UsersLoadingSkeleton />;

  const dmItems = chats.map(c => ({ ...c, isGroup: false }));
  const groupItems = groups.map(g => ({ ...g, isGroup: true }));
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

  const getPreview = (chat) => {
    const msg = chat.lastMessage;
    if (!msg) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No messages yet</span>;

    let prefix = '';
    if (chat.isGroup && msg.senderId) {
      const sid = msg.senderId._id || msg.senderId;
      const senderName = sid === authUser._id ? 'You' : (msg.senderId.fullName || 'Member');
      prefix = `${senderName}: `;
    }

    if (msg.image) return <span className="flex items-center gap-1.5">{prefix && <span>{prefix}</span>}<ImageIcon size={11} className="flex-shrink-0" /><span>Photo</span></span>;
    if (msg.audioUrl) return <span className="flex items-center gap-1.5">{prefix && <span>{prefix}</span>}<MicIcon size={11} className="flex-shrink-0" /><span>Voice message</span></span>;
    if (msg.fileUrl) return <span className="flex items-center gap-1.5">{prefix && <span>{prefix}</span>}<FileIcon size={11} className="flex-shrink-0" /><span className="truncate">{msg.fileName || 'File'}</span></span>;
    if (msg.text) return `${prefix}${msg.text.length > 38 ? msg.text.slice(0, 38) + '…' : msg.text}`;
    return `${prefix}New message`;
  };

  const isAmethyst = theme === 'amethyst';

  return (
    <div className="space-y-0.5 pb-2">
      {filteredChats.map(chat => {
        const isOnline = !chat.isGroup && onlineUsers?.includes(chat._id);
        const isActive = chat.isGroup
          ? activeGroup?._id === chat._id
          : selectedUser?._id === chat._id;
        const preview = getPreview(chat);

        /* Active card style differs by theme */
        const activeStyle = isActive ? (
          isAmethyst
            ? { background: '#ffffff', boxShadow: '0 4px 20px rgba(99,102,241,0.13)', borderColor: 'rgba(99,102,241,0.18)' }
            : { background: 'rgba(99,102,241,0.13)', borderColor: 'rgba(99,102,241,0.25)' }
        ) : {};

        return (
          <div
            key={chat._id}
            className="chat-item animate-fade-in"
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
                  className="truncate leading-tight"
                  style={{
                    color: isActive ? 'var(--text-accent)' : 'var(--text-primary)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '14px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {chat.isGroup ? chat.name : chat.fullName}
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