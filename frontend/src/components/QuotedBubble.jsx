import { useState } from "react";
import { FileIcon, ImageIcon, MicIcon, ReplyIcon } from "lucide-react";

/**
 * QuotedBubble — renders a compact collapsed preview of the quoted message
 * inside a message bubble. Receives the populated `replyTo` object, the
 * resolved senderName, and an onClick handler to jump to the original message.
 */
function QuotedBubble({ replyTo, isOwn, senderName, onJumpToMessage }) {
  const [isHovered, setIsHovered] = useState(false);

  if (!replyTo) return null;

  const { text, image, audioUrl, fileUrl, fileName } = replyTo;

  // Determine preview text and media icon
  let preview = text || "";
  let mediaIcon = null;

  if (image && !text) {
    preview = "Photo";
    mediaIcon = <ImageIcon size={11} className="flex-shrink-0" />;
  } else if (audioUrl && !text) {
    preview = "Voice message";
    mediaIcon = <MicIcon size={11} className="flex-shrink-0" />;
  } else if (fileUrl && !text) {
    preview = fileName || "File";
    mediaIcon = <FileIcon size={11} className="flex-shrink-0" />;
  }

  // Handle click to jump
  const handleClick = (e) => {
    e.stopPropagation();
    if (onJumpToMessage) {
      onJumpToMessage();
    }
  };

  // Build backgrounds based on hover state and whether it's own bubble
  const backgroundStyle = isOwn
    ? (isHovered ? "rgba(0, 0, 0, 0.28)" : "rgba(0, 0, 0, 0.18)")
    : (isHovered ? "var(--bg-glass-hover)" : "var(--accent-muted)");

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      title="Click to view original message"
      style={{
        borderLeft: "4.5px solid var(--accent-primary)",
        borderRadius: "8px",
        background: backgroundStyle,
        padding: "6px 10px",
        marginBottom: "6px",
        maxWidth: "100%",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isHovered ? "translateY(-1px)" : "none",
        boxShadow: isHovered 
          ? "0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
          : "none",
        userSelect: "none"
      }}
      className="flex items-center gap-2 min-w-[140px] select-none"
    >
      {/* Side image preview if exists */}
      {image && (
        <img
          src={image}
          alt="quoted thumbnail"
          className="w-10 h-10 object-cover rounded-md flex-shrink-0"
          style={{ 
            opacity: 0.9, 
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
          }}
        />
      )}

      {/* Main preview text container */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        {/* Sender Label */}
        <span
          style={{
            color: isOwn ? "#a5b4fc" : "var(--accent-hover)",
            fontWeight: 700,
            fontSize: "10px",
            lineHeight: "1.2",
            letterSpacing: "0.02em",
            marginBottom: "2px",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          <ReplyIcon size={9} className="opacity-75 stroke-[2.5]" />
          {senderName || "Message"}
        </span>

        {/* Quoted Text Preview */}
        <p
          style={{
            color: isOwn ? "rgba(255,255,255,0.75)" : "var(--text-secondary)",
            fontSize: "11px",
            lineHeight: "1.4",
            margin: 0,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {mediaIcon}
          <span className="truncate">{preview || "Message"}</span>
        </p>
      </div>
    </div>
  );
}

export default QuotedBubble;
