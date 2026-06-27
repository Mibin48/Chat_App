import React, { useState, useEffect, useRef } from "react";
import { userChatStore } from "../store/userChatStore";
import { XIcon, SearchIcon, MessageSquareIcon, UsersIcon, CheckIcon, Loader2Icon, Send, CheckSquareIcon, SquareIcon } from "lucide-react";
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
  const [sendingStatus, setSendingStatus] = useState({});
  const [isBulkSending, setIsBulkSending] = useState(false);
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (isForwardModalOpen) {
      setSearchQuery("");
      setSendingStatus({});
      setSelectedRecipients([]);
      const timer = setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isForwardModalOpen]);

  if (!isForwardModalOpen) return null;

  const getPayload = () => {
    if (!forwardItem) return null;
    if (forwardType === "contact") {
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
      const msg = forwardItem;
      if (msg.contentType === "contact") {
        return { contentType: "contact", sharedContact: msg.sharedContact };
      } else if (msg.image) {
        return { contentType: "image", text: msg.text || "", image: msg.image, mediaIv: msg.mediaIv };
      } else if (msg.audioUrl) {
        return { contentType: "audio", audioUrl: msg.audioUrl, audioDuration: msg.audioDuration, mediaIv: msg.mediaIv };
      } else if (msg.fileUrl) {
        return { contentType: "file", fileUrl: msg.fileUrl, fileName: msg.fileName, fileType: msg.fileType, fileSize: msg.fileSize, mediaIv: msg.mediaIv };
      } else {
        return { contentType: "text", text: msg.text || "" };
      }
    }
  };

  const handleToggleSelect = (recipient) => {
    if (isBulkSending) return;
    setSelectedRecipients(prev => {
      const isAlreadySelected = prev.some(r => r.id === recipient.id);
      return isAlreadySelected ? prev.filter(r => r.id !== recipient.id) : [...prev, recipient];
    });
  };

  const handleBulkSend = async () => {
    if (selectedRecipients.length === 0) return;
    const payload = getPayload();
    if (!payload) { toast.error("Nothing to share."); return; }

    setIsBulkSending(true);
    const recipientsToProcess = [...selectedRecipients];
    const initialStatuses = {};
    recipientsToProcess.forEach(r => { initialStatuses[r.id] = "sending"; });
    setSendingStatus(prev => ({ ...prev, ...initialStatuses }));

    let successCount = 0, failCount = 0;
    await Promise.all(recipientsToProcess.map(async (recipient) => {
      try {
        await sendDirectOrGroupMessage(recipient.id, recipient.isGroup, payload);
        setSendingStatus(prev => ({ ...prev, [recipient.id]: "sent" }));
        successCount++;
      } catch (err) {
        setSendingStatus(prev => ({ ...prev, [recipient.id]: "failed" }));
        failCount++;
      }
    }));

    setIsBulkSending(false);
    if (successCount > 0 && failCount === 0) {
      toast.success(`Sent to ${successCount} chat${successCount > 1 ? "s" : ""}!`);
      setTimeout(() => closeForwardModal(), 800);
    } else if (successCount > 0) {
      toast.success(`Sent to ${successCount} chats. ${failCount} failed.`);
    } else {
      toast.error("Failed to send.");
    }
  };

  // Compile unique recipient list
  const uniqueRecipients = [];
  const seenIds = new Set();
  chats.forEach(chat => {
    if (chat && chat._id && !seenIds.has(chat._id)) {
      seenIds.add(chat._id);
      uniqueRecipients.push({ id: chat._id, name: chat.fullName || "User", avatar: chat.profilePic, isGroup: false, subLabel: "Recent Chat" });
    }
  });
  groups.forEach(group => {
    if (group && group._id && !seenIds.has(group._id)) {
      seenIds.add(group._id);
      uniqueRecipients.push({ id: group._id, name: group.name || "Group", avatar: group.avatar, isGroup: true, subLabel: "Group" });
    }
  });
  allContacts.forEach(contact => {
    if (contact && contact._id && !seenIds.has(contact._id)) {
      seenIds.add(contact._id);
      uniqueRecipients.push({ id: contact._id, name: contact.fullName || "User", avatar: contact.profilePic, isGroup: false, subLabel: "Contact" });
    }
  });

  const filteredRecipients = uniqueRecipients.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Select All / Deselect All for the FILTERED list
  const selectableFiltered = filteredRecipients.filter(r => (sendingStatus[r.id] || "idle") === "idle");
  const allFilteredSelected = selectableFiltered.length > 0 && selectableFiltered.every(r => selectedRecipients.some(s => s.id === r.id));

  const handleSelectAll = () => {
    if (isBulkSending) return;
    if (allFilteredSelected) {
      // Deselect all visible
      const filteredIds = new Set(selectableFiltered.map(r => r.id));
      setSelectedRecipients(prev => prev.filter(r => !filteredIds.has(r.id)));
    } else {
      // Select all visible not yet selected
      setSelectedRecipients(prev => {
        const existing = new Set(prev.map(r => r.id));
        const toAdd = selectableFiltered.filter(r => !existing.has(r.id));
        return [...prev, ...toAdd];
      });
    }
  };

  const isAmethyst = theme === "amethyst";
  const isMidnight = theme === "midnight";

  const modalBg = isAmethyst ? "rgba(255,255,255,0.97)" : isMidnight ? "rgba(10,10,10,0.97)" : "rgba(18,18,38,0.97)";
  const borderCol = isAmethyst ? "rgba(99,102,241,0.18)" : isMidnight ? "rgba(255,255,255,0.08)" : "rgba(99,102,241,0.14)";
  const inputBg = isAmethyst ? "rgba(244,244,250,0.8)" : isMidnight ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.05)";
  const textPrimary = isAmethyst ? "#1e1b4b" : "#ffffff";
  const textMuted = isAmethyst ? "#8a8f9f" : "var(--text-muted)";

  return (
    <div
      className="fixed inset-0 z-[9999] flex justify-center bg-black/60 backdrop-blur-[6px] items-end sm:items-center p-0 sm:p-4 animate-fade-in"
      onClick={closeForwardModal}
    >
      <div
        className="w-full sm:max-w-md overflow-hidden flex flex-col shadow-2xl border max-h-[92vh] sm:max-h-[78vh] rounded-t-3xl sm:rounded-3xl transition-all duration-300 animate-scale-in"
        style={{ background: modalBg, borderColor: borderCol, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b flex-shrink-0" style={{ borderColor: borderCol }}>
          <div>
            <h3 className="text-base font-extrabold tracking-tight" style={{ color: "var(--accent-primary)", fontFamily: "var(--font-display)" }}>
              {forwardType === "contact" ? "Share Contact" : "Forward Message"}
            </h3>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: textMuted }}>
              {selectedRecipients.length > 0
                ? <span className="text-[var(--accent-primary)] font-bold animate-pulse">{selectedRecipients.length} selected</span>
                : "Choose recipients to forward to"}
            </p>
          </div>
          <button
            onClick={closeForwardModal}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:bg-white/10 active:scale-90"
            style={{ color: textMuted }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* ── Selected chip strip ── */}
        {selectedRecipients.length > 0 && (
          <div
            className="px-4 py-2 border-b flex items-start gap-2 animate-fade-in flex-shrink-0"
            style={{ borderColor: borderCol, background: isAmethyst ? "rgba(99,102,241,0.03)" : "rgba(255,255,255,0.02)" }}
          >
            <span className="text-[9px] font-black uppercase tracking-widest flex-shrink-0 mt-2" style={{ color: textMuted }}>To:</span>
            <div className="flex-1 flex flex-wrap gap-1.5 overflow-y-auto max-h-[96px] py-1 custom-scrollbar">
              {selectedRecipients.map(r => (
                <div
                  key={r.id}
                  className="flex items-center gap-1 pl-1 pr-2 py-1 rounded-full text-[11px] font-bold animate-scale-in border cursor-pointer hover:border-red-400/50 group transition-all duration-200"
                  style={{
                    background: isAmethyst ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.07)",
                    borderColor: isAmethyst ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.12)",
                    color: textPrimary
                  }}
                  onClick={() => !isBulkSending && handleToggleSelect(r)}
                  title={`Remove ${r.name}`}
                >
                  {r.avatar ? (
                    <img src={r.avatar} alt={r.name} className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--accent-primary)]" style={{ background: "var(--accent-muted)" }}>
                      {r.isGroup ? <UsersIcon size={9} /> : <MessageSquareIcon size={9} />}
                    </div>
                  )}
                  <span className="max-w-[70px] truncate">{r.name.split(" ")[0]}</span>
                  <XIcon size={10} className="text-[var(--text-muted)] group-hover:text-red-400 transition-colors ml-0.5" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Search + Select All row ── */}
        <div className="px-4 py-3 border-b flex items-center gap-3 flex-shrink-0" style={{ borderColor: borderCol }}>
          {/* Search input */}
          <div
            className="flex flex-1 items-center gap-2 px-3 py-2 rounded-full border transition-all duration-300 focus-within:border-[var(--accent-primary)] focus-within:shadow-[0_0_12px_var(--accent-glow)]"
            style={{ background: inputBg, borderColor: borderCol }}
          >
            <SearchIcon size={14} className="text-[var(--text-muted)] flex-shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm font-medium placeholder-[var(--text-muted)]"
              style={{ color: textPrimary }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-[10px] font-bold hover:underline px-1 text-[var(--text-muted)]">✕</button>
            )}
          </div>

          {/* Select All / Deselect All button */}
          {selectableFiltered.length > 0 && !isBulkSending && (
            <button
              onClick={handleSelectAll}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all duration-200 border hover:scale-[1.03] active:scale-95 select-none"
              style={{
                background: allFilteredSelected
                  ? "linear-gradient(135deg, rgba(99,102,241,0.18), rgba(124,58,237,0.18))"
                  : isAmethyst ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.05)",
                borderColor: allFilteredSelected ? "var(--accent-primary)" : borderCol,
                color: allFilteredSelected ? "var(--accent-primary)" : textMuted,
                boxShadow: allFilteredSelected ? "0 0 10px var(--accent-glow)" : "none"
              }}
              title={allFilteredSelected ? "Deselect all" : "Select all"}
            >
              {allFilteredSelected
                ? <><CheckSquareIcon size={13} /> All</>
                : <><SquareIcon size={13} /> All</>}
            </button>
          )}
        </div>

        {/* ── Recipients List ── */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
          {filteredRecipients.length > 0 ? (
            filteredRecipients.map(recipient => {
              const status = sendingStatus[recipient.id] || "idle";
              const isSelected = selectedRecipients.some(r => r.id === recipient.id);
              const isSent = status === "sent";
              const isSending = status === "sending";
              const isFailed = status === "failed";

              return (
                <div
                  key={recipient.id}
                  onClick={() => {
                    if (status !== "idle") return;
                    handleToggleSelect(recipient);
                  }}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-2xl transition-all duration-200 select-none cursor-pointer border group relative overflow-hidden
                    ${isSelected && !isSent && !isSending
                      ? "border-[var(--accent-primary)] shadow-[0_0_14px_var(--accent-glow)] scale-[0.99]"
                      : isSent
                        ? "border-emerald-500/25"
                        : "border-transparent hover:border-[var(--border-subtle)]"
                    }
                  `}
                  style={{
                    background: isSelected && !isSent
                      ? isAmethyst
                        ? "linear-gradient(135deg, rgba(99,102,241,0.07), rgba(124,58,237,0.05))"
                        : "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(124,58,237,0.06))"
                      : isSent
                        ? "rgba(16,185,129,0.06)"
                        : "transparent"
                  }}
                >
                  {/* Selection glow accent bar */}
                  {isSelected && !isSent && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full animate-pulse"
                      style={{
                        height: "60%",
                        background: "var(--accent-primary)",
                        boxShadow: "0 0 8px var(--accent-glow)"
                      }}
                    />
                  )}

                  {/* Avatar & details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                      {recipient.avatar ? (
                        <img
                          src={recipient.avatar}
                          alt={recipient.name}
                          className="w-11 h-11 rounded-full object-cover border transition-all duration-300"
                          style={{ borderColor: borderCol }}
                        />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-300"
                          style={{ background: isAmethyst ? "rgba(99, 102, 241, 0.08)" : "var(--accent-muted)", borderColor: borderCol }}
                        >
                          {recipient.isGroup ? <UsersIcon size={20} className="text-[var(--accent-primary)]" /> : <MessageSquareIcon size={20} className="text-[var(--accent-primary)]" />}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className={`text-sm font-extrabold truncate transition-colors ${isSelected ? "text-[var(--accent-primary)]" : ""}`}
                        style={{ color: isSelected && !isSent ? "var(--accent-primary)" : textPrimary, fontFamily: "var(--font-body)" }}>
                        {recipient.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {recipient.isGroup
                          ? <UsersIcon size={9} className="text-[var(--text-muted)]" />
                          : <MessageSquareIcon size={9} className="text-[var(--text-muted)]" />}
                        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textMuted }}>
                          {recipient.subLabel}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right-side status indicator */}
                  <div className="flex-shrink-0 pl-3">
                    {isSent ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border animate-scale-in"
                        style={{ background: "rgba(16,185,129,0.12)", color: "var(--online-color)", borderColor: "rgba(16,185,129,0.3)" }}>
                        <CheckIcon size={11} className="stroke-[3]" />
                        Sent
                      </div>
                    ) : isSending ? (
                      <div className="flex items-center justify-center w-8 h-8">
                        <Loader2Icon size={18} className="animate-spin text-[var(--accent-primary)]" />
                      </div>
                    ) : isFailed ? (
                      <div className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/25 px-2.5 py-1 rounded-full">Failed</div>
                    ) : (
                      /* Custom animated checkbox */
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300
                          ${isSelected
                            ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]"
                            : "border-[var(--text-muted)] opacity-40 group-hover:opacity-90 group-hover:border-[var(--accent-primary)]"
                          }`}
                      >
                        {isSelected && <CheckIcon size={11} className="text-white stroke-[3.5]" />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-14 flex flex-col items-center justify-center text-center gap-3">
              <SearchIcon size={28} className="opacity-20" style={{ color: textMuted }} />
              <p className="text-sm font-bold" style={{ color: textMuted }}>No chats or contacts found</p>
            </div>
          )}
        </div>

        {/* ── Footer Action ── */}
        <div
          className="px-4 py-4 border-t flex items-center gap-3 flex-shrink-0"
          style={{ borderColor: borderCol, background: isAmethyst ? "rgba(99,102,241,0.01)" : "rgba(0,0,0,0.12)" }}
        >
          {/* Count badge */}
          <div
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-black border transition-all duration-300"
            style={{
              background: selectedRecipients.length > 0
                ? "linear-gradient(135deg, #4f46e5, #7c3aed)"
                : isAmethyst ? "rgba(99,102,241,0.06)" : "rgba(255,255,255,0.04)",
              borderColor: selectedRecipients.length > 0 ? "var(--accent-primary)" : borderCol,
              color: selectedRecipients.length > 0 ? "#fff" : textMuted
            }}
          >
            {selectedRecipients.length}
          </div>

          {/* Send button */}
          <button
            onClick={handleBulkSend}
            disabled={selectedRecipients.length === 0 || isBulkSending}
            className={`flex-1 py-3 px-4 rounded-2xl text-sm font-extrabold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg
              ${selectedRecipients.length === 0
                ? "bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed"
                : "hover:scale-[1.01] active:scale-[0.99] text-white border border-indigo-500/20"
              }
            `}
            style={{
              background: selectedRecipients.length > 0 ? "linear-gradient(135deg, #4f46e5, #7c3aed)" : undefined,
              boxShadow: selectedRecipients.length > 0 ? "0 4px 18px rgba(99,102,241,0.35)" : "none"
            }}
          >
            {isBulkSending ? (
              <><Loader2Icon size={16} className="animate-spin" /> Sending to {selectedRecipients.length}...</>
            ) : (
              <><Send size={14} className="stroke-[2.5]" /> Send to {selectedRecipients.length} Recipient{selectedRecipients.length !== 1 ? "s" : ""}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
