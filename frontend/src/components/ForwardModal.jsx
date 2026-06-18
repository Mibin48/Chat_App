import React, { useState, useEffect, useRef } from "react";
import { userChatStore } from "../store/userChatStore";
import { XIcon, SearchIcon, MessageSquareIcon, UsersIcon, CheckIcon, Loader2Icon, Send } from "lucide-react";
import toast from "react-hot-toast";

export default function ForwardModal() {
  const {
    isForwardModalOpen,
    forwardItem,
    forwardType,
    closeForwardModal,
    chats,
    groups,
    allContacts,
    sendDirectOrGroupMessage,
    theme
  } = userChatStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [sendingStatus, setSendingStatus] = useState({}); // { [targetId]: 'idle' | 'sending' | 'sent' | 'failed' }
  const [isBulkSending, setIsBulkSending] = useState(false);
  const searchInputRef = useRef(null);

  // Auto-focus search input when modal opens
  useEffect(() => {
    if (isForwardModalOpen) {
      setSearchQuery("");
      setSendingStatus({});
      setSelectedRecipients([]);
      // Focus after a tiny delay to allow CSS transitions / modal mount
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isForwardModalOpen]);

  if (!isForwardModalOpen) return null;

  // Prepare payload based on forwardItem and forwardType
  const getPayload = () => {
    if (!forwardItem) return null;

    if (forwardType === "contact") {
      // Sharing a contact
      return {
        contentType: "contact",
        sharedContact: {
          userId: forwardItem.userId,
          fullName: forwardItem.fullName,
          email: forwardItem.email,
          profilePic: forwardItem.profilePic
        }
      };
    } else {
      // Forwarding a message
      const msg = forwardItem;
      // Depending on original message type, construct forward payload
      if (msg.contentType === "contact") {
        return {
          contentType: "contact",
          sharedContact: msg.sharedContact
        };
      } else if (msg.image) {
        return {
          contentType: "image",
          text: msg.text || "",
          image: msg.image,
          mediaIv: msg.mediaIv
        };
      } else if (msg.audioUrl) {
        return {
          contentType: "audio",
          audioUrl: msg.audioUrl,
          audioDuration: msg.audioDuration,
          mediaIv: msg.mediaIv
        };
      } else if (msg.fileUrl) {
        return {
          contentType: "file",
          fileUrl: msg.fileUrl,
          fileName: msg.fileName,
          fileType: msg.fileType,
          fileSize: msg.fileSize,
          mediaIv: msg.mediaIv
        };
      } else {
        // Plain text fallback
        return {
          contentType: "text",
          text: msg.text || ""
        };
      }
    }
  };

  const handleToggleSelect = (recipient) => {
    if (isBulkSending) return; // Prevent selection changes while sending

    setSelectedRecipients(prev => {
      const isAlreadySelected = prev.some(r => r.id === recipient.id);
      if (isAlreadySelected) {
        return prev.filter(r => r.id !== recipient.id);
      } else {
        return [...prev, recipient];
      }
    });
  };

  const handleBulkSend = async () => {
    if (selectedRecipients.length === 0) return;
    const payload = getPayload();
    if (!payload) {
      toast.error("Nothing to share.");
      return;
    }

    setIsBulkSending(true);
    const recipientsToProcess = [...selectedRecipients];

    // Mark all selected as sending
    const initialStatuses = {};
    recipientsToProcess.forEach(r => {
      initialStatuses[r.id] = "sending";
    });
    setSendingStatus(prev => ({ ...prev, ...initialStatuses }));

    let successCount = 0;
    let failCount = 0;

    await Promise.all(recipientsToProcess.map(async (recipient) => {
      try {
        await sendDirectOrGroupMessage(recipient.id, recipient.isGroup, payload);
        setSendingStatus(prev => ({ ...prev, [recipient.id]: "sent" }));
        successCount++;
      } catch (err) {
        setSendingStatus(prev => ({ ...prev, [recipient.id]: "failed" }));
        failCount++;
        console.error("Forwarding failed for recipient:", recipient.id, err);
      }
    }));

    setIsBulkSending(false);

    if (successCount > 0 && failCount === 0) {
      toast.success(`Sent to ${successCount} chat${successCount > 1 ? "s" : ""}!`);
      // Auto close modal after a brief delay
      setTimeout(() => {
        closeForwardModal();
      }, 800);
    } else if (successCount > 0 && failCount > 0) {
      toast.success(`Sent to ${successCount} chats. ${failCount} failed.`);
    } else {
      toast.error("Failed to send.");
    }
  };

  // Compile unique recipient list
  const uniqueRecipients = [];
  const seenIds = new Set();

  // 1. Add active chats (DMs)
  chats.forEach(chat => {
    if (chat && chat._id && !seenIds.has(chat._id)) {
      seenIds.add(chat._id);
      uniqueRecipients.push({
        id: chat._id,
        name: chat.fullName || "User",
        avatar: chat.profilePic,
        isGroup: false,
        subLabel: "Recent Chat"
      });
    }
  });

  // 2. Add groups
  groups.forEach(group => {
    if (group && group._id && !seenIds.has(group._id)) {
      seenIds.add(group._id);
      uniqueRecipients.push({
        id: group._id,
        name: group.name || "Group",
        avatar: group.avatar,
        isGroup: true,
        subLabel: "Group"
      });
    }
  });

  // 3. Add contacts (friends)
  allContacts.forEach(contact => {
    if (contact && contact._id && !seenIds.has(contact._id)) {
      seenIds.add(contact._id);
      uniqueRecipients.push({
        id: contact._id,
        name: contact.fullName || "User",
        avatar: contact.profilePic,
        isGroup: false,
        subLabel: "Contact"
      });
    }
  });

  // Filter recipients based on search query
  const filteredRecipients = uniqueRecipients.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Theme support config
  const isAmethyst = theme === "amethyst";
  const isMidnight = theme === "midnight";

  // Dynamic colors
  const modalBg = isAmethyst
    ? "rgba(255, 255, 255, 0.95)"
    : isMidnight
    ? "rgba(10, 10, 10, 0.95)"
    : "rgba(18, 18, 38, 0.94)";

  const borderCol = isAmethyst
    ? "rgba(99, 102, 241, 0.16)"
    : isMidnight
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(99, 102, 241, 0.12)";

  const headerTextCol = "var(--accent-primary)";

  const inputBg = isAmethyst
    ? "rgba(244, 244, 250, 0.8)"
    : isMidnight
    ? "rgba(255, 255, 255, 0.03)"
    : "rgba(255, 255, 255, 0.04)";

  const textPrimary = isAmethyst ? "#1e1b4b" : "#ffffff";
  const textSecondary = isAmethyst ? "#4f46e5" : "rgba(255, 255, 255, 0.7)";
  const textMuted = isAmethyst ? "#8a8f9f" : "var(--text-muted)";

  return (
    <div
      className="fixed inset-0 z-[9999] flex justify-center bg-black/60 backdrop-blur-[6px] items-end sm:items-center p-0 sm:p-4 animate-fade-in"
      onClick={closeForwardModal}
    >
      <div
        className="w-full sm:max-w-md overflow-hidden flex flex-col animate-slide-up shadow-[var(--shadow-lift)] border max-h-[90vh] sm:max-h-[75vh] rounded-t-3xl sm:rounded-b-2xl sm:rounded-t-2xl transition-all duration-300"
        style={{
          background: modalBg,
          borderColor: borderCol,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b animate-fade-in" style={{ borderColor: borderCol }}>
          <div>
            <h3
              className="text-base font-bold uppercase tracking-wider animate-slide-up"
              style={{ color: headerTextCol, fontFamily: "var(--font-display)" }}
            >
              {forwardType === "contact" ? "Share Contact" : "Forward Message"}
            </h3>
            {selectedRecipients.length > 0 && (
              <p className="text-[11px] font-bold text-[var(--accent-primary)] mt-0.5 animate-pulse">
                {selectedRecipients.length} chat{selectedRecipients.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>
          <button
            onClick={closeForwardModal}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-white/10 active:scale-90"
            style={{ color: textMuted }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Selected Recipients horizontal chip list */}
        {selectedRecipients.length > 0 && (
          <div 
            className="px-6 py-3 border-b flex items-center gap-2 overflow-hidden animate-fade-in" 
            style={{ 
              borderColor: borderCol, 
              background: isAmethyst ? "rgba(99,102,241,0.02)" : "rgba(255,255,255,0.01)" 
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex-shrink-0">To:</span>
            <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
              {selectedRecipients.map((r) => (
                <div 
                  key={r.id}
                  className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full text-xs font-bold border transition-all duration-200 scale-95 hover:scale-100 flex-shrink-0 animate-scale-in"
                  style={{
                    background: isAmethyst ? "rgba(99,102,241,0.06)" : "rgba(255, 255, 255, 0.05)",
                    borderColor: isAmethyst ? "rgba(99,102,241,0.12)" : "rgba(255, 255, 255, 0.1)",
                    color: textPrimary
                  }}
                >
                  {r.avatar ? (
                    <img src={r.avatar} alt={r.name} className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: isAmethyst ? "rgba(99,102,241,0.12)" : "rgba(255, 255, 255, 0.1)" }}
                    >
                      {r.isGroup ? <UsersIcon size={10} /> : <MessageSquareIcon size={10} />}
                    </div>
                  )}
                  <span className="max-w-[70px] truncate">{r.name.split(" ")[0]}</span>
                  <button 
                    onClick={() => handleToggleSelect(r)}
                    disabled={isBulkSending}
                    className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-white/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                  >
                    <XIcon size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="px-6 py-4 border-b" style={{ borderColor: borderCol }}>
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full border transition-all duration-300 focus-within:border-[var(--accent-primary)] focus-within:shadow-[0_0_12px_var(--accent-glow)]"
            style={{ background: inputBg, borderColor: borderCol }}
          >
            <SearchIcon size={18} className="text-[var(--text-muted)] flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search chats, groups, or contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm font-medium placeholder-[var(--text-muted)]"
              style={{ color: textPrimary }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs font-bold hover:underline px-1"
                style={{ color: textSecondary }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Recipients List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 custom-scrollbar">
          {filteredRecipients.length > 0 ? (
            filteredRecipients.map((recipient) => {
              const status = sendingStatus[recipient.id] || "idle";
              const isSelected = selectedRecipients.some(r => r.id === recipient.id);

              return (
                <div
                  key={recipient.id}
                  onClick={() => {
                    if (status !== "idle") return; // disable toggle if sent/sending
                    handleToggleSelect(recipient);
                  }}
                  className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-200 select-none border
                    ${isSelected ? "bg-[rgba(99,102,241,0.08)] scale-[0.99]" : "hover:bg-[var(--bg-glass-hover)] active:scale-[0.99]"}
                  `}
                  style={{ 
                    borderColor: isSelected ? "var(--accent-primary)" : "transparent"
                  }}
                >
                  {/* Avatar & Details */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="relative flex-shrink-0">
                      {recipient.avatar ? (
                        <img
                          src={recipient.avatar}
                          alt={recipient.name}
                          className="w-11 h-11 rounded-full object-cover border shadow-sm"
                          style={{ borderColor: borderCol }}
                        />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center border shadow-sm"
                          style={{ 
                            background: isAmethyst ? "rgba(99, 102, 241, 0.06)" : "var(--accent-muted)",
                            borderColor: borderCol
                          }}
                        >
                          {recipient.isGroup ? (
                            <UsersIcon size={20} className="text-[var(--accent-primary)]" />
                          ) : (
                            <MessageSquareIcon size={20} className="text-[var(--accent-primary)]" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold truncate" style={{ color: textPrimary, fontFamily: "var(--font-body)" }}>
                        {recipient.name}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: textMuted }}>
                        {recipient.subLabel}
                      </p>
                    </div>
                  </div>

                  {/* Checkbox / Send Indicator */}
                  <div className="flex-shrink-0 pl-2">
                    {status === "sent" ? (
                      <div
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border select-none animate-scale-in"
                        style={{
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "var(--online-color)",
                          borderColor: "rgba(16, 185, 129, 0.3)"
                        }}
                      >
                        <CheckIcon size={12} className="stroke-[3]" />
                        Sent
                      </div>
                    ) : status === "sending" ? (
                      <div className="flex items-center justify-center w-6 h-6 mr-1">
                        <Loader2Icon size={16} className="animate-spin text-[var(--accent-primary)]" />
                      </div>
                    ) : status === "failed" ? (
                      <div className="text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-xl">
                        Failed
                      </div>
                    ) : (
                      // The checkbox circle
                      <div 
                        className={`w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center transition-all duration-300
                          ${isSelected 
                            ? "bg-[var(--accent-primary)] border-[var(--accent-primary)] scale-110 shadow-[0_0_8px_var(--accent-glow)]" 
                            : "border-[var(--text-muted)] opacity-50 hover:opacity-100"
                          }
                        `}
                      >
                        {isSelected && <CheckIcon size={11} className="text-white stroke-[3.5]" />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-bold" style={{ color: textMuted }}>No chats or contacts found</p>
            </div>
          )}
        </div>

        {/* Master Action Button at Bottom */}
        <div className="p-5 border-t flex flex-col gap-2" style={{ borderColor: borderCol, background: isAmethyst ? "rgba(99,102,241,0.01)" : "rgba(0,0,0,0.08)" }}>
          <button
            onClick={handleBulkSend}
            disabled={selectedRecipients.length === 0 || isBulkSending}
            className={`w-full py-3 px-4 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg cursor-pointer
              ${selectedRecipients.length === 0 
                ? "bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed shadow-none" 
                : "bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.01] active:scale-[0.99] text-white border border-indigo-500/20"
              }
            `}
            style={{
              background: selectedRecipients.length > 0 && !isBulkSending ? "linear-gradient(135deg, #4f46e5, #7c3aed)" : undefined
            }}
          >
            {isBulkSending ? (
              <>
                <Loader2Icon size={16} className="animate-spin" />
                Sending to {selectedRecipients.length} Recipient{selectedRecipients.length > 1 ? "s" : ""}...
              </>
            ) : (
              <>
                <Send size={15} />
                Send to {selectedRecipients.length} Recipient{selectedRecipients.length > 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
