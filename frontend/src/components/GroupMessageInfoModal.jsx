import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { XIcon, CheckCheckIcon, UsersIcon, ClockIcon, MessageSquareIcon, ImageIcon, FileVideoIcon, FileTextIcon, MicIcon } from "lucide-react";
import DecryptedMedia from "./DecryptedMedia";
import { formatFullDateTime } from "../lib/timeUtils";

export default function GroupMessageInfoModal({ message, group, onClose }) {
  const [activeTab, setActiveTab] = useState("read"); // "read" or "unread"

  // Process and match members
  const { readList, unreadList } = useMemo(() => {
    if (!group || !group.members) return { readList: [], unreadList: [] };

    const senderId = message.senderId?._id || message.senderId;
    
    // Group members excluding the message sender
    const eligibleMembers = group.members.filter(m => {
      const memberId = m.userId?._id || m.userId;
      return memberId?.toString() !== senderId?.toString();
    });

    const read = [];
    const unread = [];

    eligibleMembers.forEach(member => {
      const memberId = member.userId?._id || member.userId;
      const readReceipt = message.readBy?.find(r => r.userId?.toString() === memberId?.toString());
      
      if (readReceipt) {
        read.push({
          member,
          readAt: readReceipt.readAt
        });
      } else {
        unread.push(member);
      }
    });

    // Sort read list by readAt desc
    read.sort((a, b) => new Date(b.readAt) - new Date(a.readAt));

    return { readList: read, unreadList: unread };
  }, [message, group]);

  const renderMessagePreview = () => {
    const isImage = !!message.image;
    const isVideo = message.fileType?.startsWith("video/") || ['mp4', 'webm', 'mov', 'ogg'].some(ext => message.fileName?.toLowerCase().endsWith(`.${ext}`));
    const isAudio = !!message.audioUrl;
    const isPdf = message.fileType?.toLowerCase().includes('pdf') || message.fileName?.toLowerCase().endsWith('.pdf');
    const isFile = !!message.fileUrl && !isPdf && !isVideo;

    return (
      <div 
        className="p-3.5 rounded-2xl border border-[var(--border-subtle)] mb-6 flex flex-col gap-2 bg-[var(--bg-input-search)]"
        style={{ backdropFilter: "blur(4px)" }}
      >
        <span className="text-[10px] uppercase font-bold text-[var(--accent-hover)] font-mono tracking-wider flex items-center gap-1">
          <MessageSquareIcon size={10} /> Message Preview
        </span>
        
        {message.text && (
          <p className="text-xs text-[var(--text-primary)] leading-relaxed break-words line-clamp-3">
            {message.text}
          </p>
        )}

        {isImage && (
          <div className="w-16 h-16 rounded-lg overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-input-search)] mt-1">
            <DecryptedMedia msg={message} type="image" fallbackUrl={message.image}>
              {(url, isLoading, isError) => {
                if (isLoading) return <div className="w-full h-full bg-[var(--bg-input-search)] animate-pulse" />;
                if (isError) return <div className="w-full h-full bg-black/10 flex items-center justify-center text-[10px] text-red-400">🔒</div>;
                return <img src={url} alt="preview" className="w-full h-full object-cover" />;
              }}
            </DecryptedMedia>
          </div>
        )}

        {isVideo && (
          <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-secondary)] bg-[var(--bg-input)] p-2 rounded-lg border border-[var(--border-subtle)]">
            <FileVideoIcon size={14} className="text-purple-500" />
            <span className="truncate">{message.fileName || "Video Attachment"}</span>
          </div>
        )}

        {isAudio && (
          <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-secondary)] bg-[var(--bg-input)] p-2 rounded-lg border border-[var(--border-subtle)]">
            <MicIcon size={14} className="text-pink-500" />
            <span>Voice Note ({message.audioDuration ? `${Math.floor(message.audioDuration)}s` : "audio"})</span>
          </div>
        )}

        {isFile && (
          <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-secondary)] bg-[var(--bg-input)] p-2 rounded-lg border border-[var(--border-subtle)]">
            <FileTextIcon size={14} className="text-blue-500" />
            <span className="truncate">{message.fileName || "File Attachment"}</span>
          </div>
        )}
      </div>
    );
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm animate-fade-in" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6 rounded-[28px] border border-[var(--border-subtle)] z-[9999] shadow-2xl animate-scale-in"
        style={{
          background: 'var(--bg-glass-panel)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CheckCheckIcon size={18} className="text-[var(--accent-hover)]" />
            <h3 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Message Info</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[var(--bg-glass-hover)] hover:bg-red-500/20 text-[var(--text-secondary)] hover:text-red-500 transition-colors"
          >
            <XIcon size={14} />
          </button>
        </div>

        {/* Message Preview */}
        {renderMessagePreview()}

        {/* Tab Switcher */}
        <div className="flex border border-[var(--border-subtle)] mb-4 p-0.5 bg-[var(--bg-tab-wrapper)] rounded-xl">
          <button
            onClick={() => setActiveTab("read")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5
              ${activeTab === "read" 
                ? 'bg-[var(--bg-surface)] text-[var(--accent-primary)] border border-[var(--border-subtle)] shadow-sm' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }
            `}
          >
            <CheckCheckIcon size={13} />
            <span>Read By ({readList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("unread")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5
              ${activeTab === "unread" 
                ? 'bg-[var(--bg-surface)] text-[var(--accent-primary)] border border-[var(--border-subtle)] shadow-sm' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }
            `}
          >
            <UsersIcon size={13} />
            <span>Remaining ({unreadList.length})</span>
          </button>
        </div>

        {/* Scrollable Members List */}
        <div className="max-h-[220px] overflow-y-auto custom-scrollbar pr-0.5 space-y-2">
          {activeTab === "read" ? (
            readList.length > 0 ? (
              readList.map(({ member, readAt }) => {
                const user = member.userId;
                return (
                  <div 
                    key={user._id}
                    className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] border border-[var(--border-subtle)] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-input-search)] flex-shrink-0">
                        <img src={user.profilePic || "/avatar.png"} alt="avatar" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{user.fullName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-[var(--text-muted)] font-mono">
                      <ClockIcon size={9} />
                      <span>{formatFullDateTime(readAt)}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-xs text-[var(--text-muted)] py-6">No one has read this message yet.</p>
            )
          ) : (
            unreadList.length > 0 ? (
              unreadList.map(member => {
                const user = member.userId;
                return (
                  <div 
                    key={user._id}
                    className="flex items-center gap-3 p-2 rounded-xl bg-[var(--bg-glass)] hover:bg-[var(--bg-glass-hover)] border border-[var(--border-subtle)] transition-all"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-input-search)] flex-shrink-0">
                      <img src={user.profilePic || "/avatar.png"} alt="avatar" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate">{user.fullName}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-xs text-[var(--text-muted)] py-6">Everyone has read this message!</p>
            )
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
