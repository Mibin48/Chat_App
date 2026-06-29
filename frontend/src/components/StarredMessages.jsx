import React, { useEffect } from 'react';
import { userChatStore } from '../store/userChatStore';
import { userAuthStore } from '../store/userAuthStore';
import { Star, ArrowRight, Trash2 } from 'lucide-react';
import { formatFullDateTime } from '../lib/timeUtils';

function StarredMessages() {
  const { 
    starredMessages, 
    getStarredMessages, 
    toggleStarMessage, 
    setSelectedUser, 
    setSelectedGroup, 
    chats, 
    groups,
    theme,
    setActiveTab,
    allContacts
  } = userChatStore();
  const { authUser } = userAuthStore();

  useEffect(() => {
    getStarredMessages();
  }, []);

  const handleJump = (msg) => {
    // Switch active tab back to chats so the chat pane is visible
    setActiveTab('chats');

    if (msg.groupId) {
      const gId = msg.groupId._id || msg.groupId;
      const group = groups.find(g => g._id === gId);
      if (group) {
        setSelectedGroup(group);
        setTimeout(() => {
          if (window.jumpToMessage) window.jumpToMessage(msg._id);
        }, 300);
      }
    } else {
      const rId = msg.recieverId?._id || msg.recieverId || msg.receiverId?._id || msg.receiverId;
      const partnerId = (msg.senderId?._id || msg.senderId) === authUser?._id 
        ? rId
        : (msg.senderId?._id || msg.senderId);
      
      let contact = chats.find(c => c._id === partnerId);
      if (!contact && allContacts) {
        contact = allContacts.find(c => c._id === partnerId);
      }

      if (contact) {
        setSelectedUser(contact);
        setTimeout(() => {
          if (window.jumpToMessage) window.jumpToMessage(msg._id);
        }, 300);
      }
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div 
        className="p-4 border-b flex items-center justify-between flex-shrink-0"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
          <Star size={16} className="text-amber-500 fill-amber-500 animate-pulse" />
          <span>Starred Messages</span>
        </h3>
        <span className="text-xs text-[var(--text-muted)] font-extrabold font-mono">
          {starredMessages?.length || 0} Total
        </span>
      </div>

      {/* Starred messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {!starredMessages || starredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <Star size={36} className="text-zinc-650 opacity-30 animate-pulse" />
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-body)' }}>No starred messages yet</p>
              <p className="text-[10px] text-[var(--text-secondary)] opacity-50 mt-1 max-w-[180px] mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
                Star important messages in chats to keep track of them here.
              </p>
            </div>
          </div>
        ) : (
          starredMessages.map((msg) => {
            const isOwn = (msg.senderId?._id || msg.senderId) === authUser?._id;
            const senderName = isOwn ? 'Me' : (msg.senderId?.fullName || 'Someone');
            
            // Determine Chat source label
            let chatLabel = "Direct Message";
            if (msg.groupId) {
              const gId = msg.groupId._id || msg.groupId;
              const g = groups.find(group => group._id === gId);
              chatLabel = g ? `Group: ${g.name}` : "Group Chat";
            } else {
              const partnerId = isOwn ? (msg.recieverId?._id || msg.recieverId) : (msg.senderId?._id || msg.senderId);
              const c = chats.find(contact => contact._id === partnerId);
              chatLabel = c ? `DM: ${c.fullName}` : "Direct Message";
            }

            return (
              <div 
                key={msg._id} 
                className="glass-card p-4 rounded-2xl border flex flex-col gap-2.5 hover:shadow-lg transition-all duration-300 relative overflow-hidden group"
                style={{
                  background: 'var(--bg-glass)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                {/* Header row */}
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <span 
                      className="text-[9px] font-extrabold uppercase tracking-wider block mb-0.5"
                      style={{ color: 'var(--accent-hover)' }}
                    >
                      {chatLabel}
                    </span>
                    <span className="text-xs font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
                      {senderName}
                    </span>
                  </div>
                  <span className="text-[9px] text-[var(--text-muted)] font-medium tabular-nums shrink-0">
                    {formatFullDateTime(msg.createdAt)}
                  </span>
                </div>

                {/* Text preview */}
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed break-words font-medium" style={{ fontFamily: 'var(--font-body)' }}>
                  {msg.text || (
                    <span className="italic opacity-60 text-[10px]">
                      {msg.image ? "[Photo Attachment]" : msg.audioUrl ? "[Voice Message]" : msg.fileUrl ? `[File: ${msg.fileName || "Attachment"}]` : "[Attachment]"}
                    </span>
                  )}
                </div>

                {/* Footer action row */}
                <div className="flex justify-between items-center mt-1.5 border-t border-[var(--border-subtle)] pt-2.5">
                  <button
                    onClick={() => toggleStarMessage(msg._id)}
                    className="text-[10px] font-extrabold uppercase tracking-wider text-red-400 hover:text-red-300 hover:underline transition-all flex items-center gap-1.5 p-0 border-none bg-transparent cursor-pointer"
                  >
                    <Trash2 size={12} />
                    <span>Unstar</span>
                  </button>

                  <button
                    onClick={() => handleJump(msg)}
                    className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--accent-primary)] hover:text-[var(--accent-hover)] transition-all flex items-center gap-1 hover:underline p-0 border-none bg-transparent cursor-pointer animate-pulse"
                  >
                    <span>Jump to chat</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default StarredMessages;
