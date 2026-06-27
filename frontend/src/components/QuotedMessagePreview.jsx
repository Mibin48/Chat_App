import { useState, useEffect } from "react";
import { XIcon, FileIcon, ImageIcon, MicIcon, ReplyIcon, UserIcon } from "lucide-react";
import { userChatStore } from "../store/userChatStore";
import { userAuthStore } from "../store/userAuthStore";

/**
 * QuotedMessagePreview — a dismissible banner displayed above the message
 * input bar showing the message the user is replying to.
 */
function QuotedMessagePreview() {
  const { replyingTo, clearReplyingTo, activeGroup, selectedUser, theme } = userChatStore();
  const { authUser } = userAuthStore();
  const [activeReply, setActiveReply] = useState(null);

  useEffect(() => {
    if (replyingTo) {
      setActiveReply(replyingTo);
    }
  }, [replyingTo]);

  if (!activeReply) return null;

  const { text, image, audioUrl, fileUrl, fileName, contentType, sharedContact } = activeReply;

  let preview = text || "";
  let mediaIcon = null;

  if (contentType === "contact") {
    let name = "Contact";
    try {
      const card = sharedContact || JSON.parse(text);
      if (card && card.fullName) name = card.fullName;
    } catch (e) { }
    preview = `Contact: ${name}`;
    mediaIcon = <UserIcon size={12} className="flex-shrink-0 text-[var(--accent-hover)]" />;
  } else if (image && !text) {
    preview = "Photo";
    mediaIcon = <ImageIcon size={12} className="flex-shrink-0 animate-pulse text-[var(--accent-hover)]" />;
  } else if (audioUrl && !text) {
    preview = "Voice message";
    mediaIcon = <MicIcon size={12} className="flex-shrink-0 text-[var(--accent-hover)]" />;
  } else if (fileUrl && !text) {
    preview = fileName || "File";
    mediaIcon = <FileIcon size={12} className="flex-shrink-0 text-[var(--accent-hover)]" />;
  }

  // Look up the name of the sender of the message being replied to
  const getReplyingToSenderName = () => {
    if (!replyingTo?.senderId) return "";
    const sId = typeof replyingTo.senderId === 'object' ? replyingTo.senderId._id : replyingTo.senderId;
    if (sId === authUser?._id) return "You";
    if (activeGroup) {
      const member = activeGroup.members?.find(m => {
        const mId = typeof m.userId === 'object' ? m.userId._id : m.userId;
        return mId === sId;
      });
      if (member && typeof member.userId === 'object') {
        return member.userId.fullName;
      }
    } else if (selectedUser) {
      const sIdSelected = typeof selectedUser === 'object' ? selectedUser._id : selectedUser;
      if (sIdSelected === sId) {
        return selectedUser.fullName;
      }
    }
    return "Member";
  };

  const senderName = getReplyingToSenderName();

  // Glassmorphic background depending on theme
  const bannerBackground = theme === 'amethyst'
    ? "rgba(99, 102, 241, 0.05)"
    : "rgba(0, 0, 0, 0.2)";

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 select-none"
      style={{
        borderTop: "1px solid var(--border-subtle)",
        borderLeft: "4px solid var(--accent-primary)",
        background: bannerBackground,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)"
      }}
    >
      {/* Reply Icon Indicator */}
      <div
        className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
        style={{
          background: "var(--accent-muted)",
          border: "1px solid var(--border-accent)"
        }}
      >
        <ReplyIcon size={14} style={{ color: "var(--accent-primary)" }} className="stroke-[2.5]" />
      </div>

      {/* Thumbnail if image is quoted */}
      {image && (
        <img
          src={image}
          alt="reply preview"
          className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
          style={{
            border: "1.5px solid var(--border-subtle)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.12)"
          }}
        />
      )}

      {/* Preview text description */}
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
          style={{ color: "var(--accent-primary)" }}
        >
          Replying to <span style={{ color: "var(--text-primary)" }}>{senderName}</span>
        </p>
        <p
          className="text-xs truncate flex items-center gap-1.5 font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          {mediaIcon}
          <span className="truncate">{preview || "Message"}</span>
        </p>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={clearReplyingTo}
        className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200 hover:bg-white/10 active:scale-90"
        style={{ color: "var(--text-muted)", border: "1px solid transparent" }}
        aria-label="Cancel reply"
      >
        <XIcon size={14} className="hover:text-[var(--danger-color)] transition-colors duration-200" />
      </button>
    </div>
  );
}

export default QuotedMessagePreview;
