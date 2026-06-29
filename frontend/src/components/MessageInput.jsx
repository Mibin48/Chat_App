import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { userChatStore } from '../store/userChatStore';
import { userAuthStore } from '../store/userAuthStore';
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon, SmileIcon, FileIcon, Megaphone, BarChart2, PlusIcon, Trash2Icon, Orbit, PaperclipIcon, LinkIcon } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import FileUpload from './FileUpload';
import VoiceRecorder from './VoiceRecorder';
import QuotedMessagePreview from './QuotedMessagePreview';


function MessageInput() {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const fileUploadRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const tagMenuRef = useRef(null);
  const attachmentMenuRef = useRef(null);

  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [tagStartIndex, setTagStartIndex] = useState(-1);

  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [linkInputMode, setLinkInputMode] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [showGroupAddonsMenu, setShowGroupAddonsMenu] = useState(false);
  const groupAddonsRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) && !event.target.closest('.emoji-picker-btn')) {
        setShowEmojiPicker(false);
      }
      if (showTagMenu && tagMenuRef.current && !tagMenuRef.current.contains(event.target) && event.target !== inputRef.current) {
        setShowTagMenu(false);
      }
      if (showAttachmentMenu && attachmentMenuRef.current && !attachmentMenuRef.current.contains(event.target) && !event.target.closest('.attachment-menu-btn')) {
        setShowAttachmentMenu(false);
        setLinkInputMode(false);
        setLinkText("");
        setLinkUrl("");
      }
      if (showGroupAddonsMenu && groupAddonsRef.current && !groupAddonsRef.current.contains(event.target) && !event.target.closest('.group-addons-btn')) {
        setShowGroupAddonsMenu(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowAttachmentMenu(false);
        setLinkInputMode(false);
        setLinkText("");
        setLinkUrl("");
        setShowGroupAddonsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showEmojiPicker, showTagMenu, showAttachmentMenu]);
  
  // Announcements & Polls States
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollIsMultiSelect, setPollIsMultiSelect] = useState(false);
  const [pollIsAnonymous, setPollIsAnonymous] = useState(false);

  const {
    sendMessage, 
    sendGroupMessage, 
    uploadFile, 
    sendAudio, 
    sendTyping, 
    sendStopTyping, 
    sendGroupTyping, 
    sendGroupStopTyping, 
    selectedUser, 
    activeGroup, 
    theme,
    uploadProgress,
    handshakeActive,
    sendQuantumMessage,
    quantumMode,
    setQuantumMode,
    replyingTo
  } = userChatStore();

  const activeChatId = activeGroup ? activeGroup._id : selectedUser ? selectedUser._id : null;
  const prevChatIdRef = useRef(activeChatId);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    const oldId = prevChatIdRef.current;
    // Save previous draft before switching
    if (oldId && oldId !== activeChatId) {
      const currentDrafts = JSON.parse(localStorage.getItem('chat_drafts') || '{}');
      const currentText = textRef.current;
      if (currentText.trim()) {
        currentDrafts[oldId] = currentText;
      } else {
        delete currentDrafts[oldId];
      }
      localStorage.setItem('chat_drafts', JSON.stringify(currentDrafts));
    }

    // Load new draft for active chat
    if (activeChatId) {
      const currentDrafts = JSON.parse(localStorage.getItem('chat_drafts') || '{}');
      setText(currentDrafts[activeChatId] || "");
    } else {
      setText("");
    }

    prevChatIdRef.current = activeChatId;
  }, [activeChatId]);
  const { authUser } = userAuthStore();

  useEffect(() => {
    if (!handshakeActive) {
      setQuantumMode(false);
    }
  }, [handshakeActive, setQuantumMode]);

  const isGroupAdmin = activeGroup && activeGroup.members?.some(
    m => m.userId?._id === authUser?._id && m.role === 'admin'
  );
  const isGroupCreator = activeGroup && activeGroup.creatorId === authUser?._id;
  const canPostAnnouncement = isGroupAdmin || isGroupCreator;

  const resetPoll = () => {
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollIsMultiSelect(false);
    setPollIsAnonymous(false);
    setShowPollModal(false);
  };

  const handleCreatePoll = (e) => {
    e.preventDefault();
    if (!pollQuestion.trim()) {
      toast.error("Poll question is required");
      return;
    }
    const activeOpts = pollOptions.filter(opt => opt.trim() !== "");
    if (activeOpts.length < 2) {
      toast.error("At least 2 options are required");
      return;
    }
    
    sendGroupMessage({
      poll: {
        question: pollQuestion.trim(),
        isMultiSelect: pollIsMultiSelect,
        anonymous: pollIsAnonymous,
        options: activeOpts.map(opt => ({ optionText: opt.trim() }))
      }
    });
    
    resetPoll();
  };

  const filteredMembers = activeGroup
    ? activeGroup.members?.filter(member => {
        if (!member.userId) return false;
        const fullName = member.userId.fullName?.toLowerCase() || "";
        const isSelf = member.userId._id === authUser?._id;
        return fullName.includes(tagSearchQuery) && !isSelf;
      })
    : [];

  const handleSelectTag = (fullName) => {
    if (tagStartIndex === -1) return;
    const textBeforeTag = text.substring(0, tagStartIndex);
    const textAfterTag = text.substring(tagStartIndex + 1 + tagSearchQuery.length);
    const newText = textBeforeTag + `#${fullName} ` + textAfterTag;
    setText(newText);
    setShowTagMenu(false);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview && !selectedFile) return;
    if (selectedFile) {
      uploadFile(selectedFile);
      setSelectedFile(null);
      fileUploadRef.current?.clear();
    } else {
      if (activeGroup) {
        sendGroupMessage({ text: text.trim(), image: imagePreview, isAnnouncement });
        setIsAnnouncement(false);
      } else {
        if (quantumMode) {
          sendQuantumMessage(text.trim());
        } else {
          sendMessage({ text: text.trim(), image: imagePreview });
        }
      }
    }
    // Clear draft on send
    if (activeChatId) {
      const currentDrafts = JSON.parse(localStorage.getItem('chat_drafts') || '{}');
      delete currentDrafts[activeChatId];
      localStorage.setItem('chat_drafts', JSON.stringify(currentDrafts));
    }
    setText("");
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileUploadRef.current?.clear();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file?.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setSelectedFile(null);
      fileUploadRef.current?.clear();
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileUploadRef.current?.clear();
  };

  const handleFileSelect = (fileData, file) => {
    if (!fileData) {
      setSelectedFile(null);
      return;
    }
    if (file && file.type.startsWith("image/")) {
      setImagePreview(fileData);
      setSelectedFile(null);
    } else {
      setSelectedFile({
        fileData,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      });
      setImagePreview(null);
    }
  };

  const handleInsertLink = () => {
    if (!linkUrl.trim()) return;

    let formattedUrl = linkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    const textToInsert = linkText.trim()
      ? `[${linkText.trim()}](${formattedUrl})`
      : formattedUrl;

    setText((prev) => {
      const spacing = prev.length > 0 && !prev.endsWith(" ") ? " " : "";
      return prev + spacing + textToInsert + " ";
    });

    setShowAttachmentMenu(false);
    setLinkInputMode(false);
    setLinkText("");
    setLinkUrl("");

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  };

  const handleSendAudio = (audioData, duration) => sendAudio(audioData, duration);
  const isAmethyst = theme === 'amethyst';
  const hasContent = text.trim() || imagePreview || selectedFile;

  return (
    /* Message input bar — full-width frosted glass, theme-adaptive */
    <div
      className="flex-shrink-0 p-2 sm:p-3.5 message-input-bar"
      style={{
        background: isAmethyst ? 'rgba(255,255,255,0.80)' : 'rgba(7,7,26,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(99,102,241,0.08)',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {/* Inner wrapper for previews + form */}
      <div className="relative">
        {/* Reply-to preview banner */}
        <div className={`reply-banner-container ${replyingTo ? 'active' : ''}`} style={{ overflow: 'hidden' }}>
          <div style={{ minHeight: '0px' }}>
            <QuotedMessagePreview />
          </div>
        </div>

        {/* Image preview strip */}
        {imagePreview && (
          <div
            className="flex items-center gap-2 px-3 pt-2.5"
          >
            <div className="relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-14 h-14 object-cover rounded-xl"
                style={{ border: '2px solid var(--border-medium)' }}
              />
              <button
                onClick={removeImage}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md"
                style={{ background: 'var(--danger-color)' }}
                type="button"
              >
                <XIcon className="w-3 h-3" />
              </button>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Image ready to send</span>
          </div>
        )}

        {/* Video preview strip */}
        {selectedFile && selectedFile.fileType?.startsWith("video/") && (
          <div className="flex items-center gap-2 px-3 pt-2.5 animate-fade-in">
            <div className="relative">
              <video
                src={selectedFile.fileData}
                className="w-14 h-14 object-cover rounded-xl"
                style={{ border: '2px solid var(--border-medium)' }}
              />
              <button
                onClick={() => { setSelectedFile(null); fileUploadRef.current?.clear(); }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md active:scale-90"
                style={{ background: 'var(--danger-color)' }}
                type="button"
              >
                <XIcon className="w-3 h-3" />
              </button>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Video ready to send</span>
          </div>
        )}

        {/* File preview strip */}
        {selectedFile && !selectedFile.fileType?.startsWith("video/") && (
          <div
            className="flex items-center gap-2 px-3 pt-2.5 animate-fade-in"
          >
            <div
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl flex-1"
              style={{ background: 'var(--accent-muted)', border: '1px solid var(--border-accent)' }}
            >
              <span className="text-xs font-medium truncate flex items-center gap-1.5" style={{ color: 'var(--text-accent)' }}>
                <FileIcon size={13} /> {selectedFile.fileName || 'File ready to send'}
              </span>
              <button type="button" onClick={() => { setSelectedFile(null); fileUploadRef.current?.clear(); }} className="btn-icon p-0.5 rounded-full flex-shrink-0">
                <XIcon size={11} />
              </button>
            </div>
          </div>
        )}

        {/* Upload Progress Bar */}
        {uploadProgress !== null && (
          <div className="px-4 pt-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>
              <span>Uploading attachment...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-black/20 rounded-full overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
              <div 
                className="h-full bg-gradient-to-r from-[var(--accent-primary)] to-violet-500 rounded-full transition-all duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
        {/* Tag autocomplete popover */}
        {showTagMenu && (filteredMembers.length > 0 || tagSearchQuery === "" || "all".includes(tagSearchQuery)) && (
          <div 
            ref={tagMenuRef}
            className="absolute bottom-full left-4 mb-2 w-64 max-h-48 overflow-y-auto rounded-2xl p-2 border z-50 animate-slide-up"
            style={{
              background: isAmethyst ? '#ffffff' : 'var(--bg-glass-panel)',
              borderColor: 'var(--border-medium)',
              backdropFilter: 'blur(20px)',
              boxShadow: isAmethyst ? '0 8px 32px rgba(99,102,241,0.08)' : '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div 
              className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1.5 border-b"
              style={{ 
                color: isAmethyst ? 'var(--accent-primary)' : 'rgba(244,114,182,1)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              Tag Group Member
            </div>
            <div className="flex flex-col gap-0.5 mt-1.5">
              {/* Tag All item */}
              {(tagSearchQuery === "" || "all".includes(tagSearchQuery)) && (
                <button
                  type="button"
                  onClick={() => handleSelectTag("all")}
                  className={`w-full px-2.5 py-2 text-left rounded-xl text-xs flex items-center gap-2 transition-colors font-semibold
                    ${isAmethyst
                      ? 'text-pink-600 hover:bg-pink-500/10'
                      : 'text-pink-300 hover:bg-pink-500/10'
                    }
                  `}
                >
                  <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center text-[10px]">📣</div>
                  <span>Tag All (#all)</span>
                </button>
              )}

              {filteredMembers.map(member => (
                <button
                  key={member.userId?._id}
                  type="button"
                  onClick={() => handleSelectTag(member.userId?.fullName)}
                  className={`w-full px-2.5 py-2 text-left rounded-xl text-xs flex items-center gap-2.5 transition-all
                    ${isAmethyst 
                      ? 'text-zinc-800 hover:bg-zinc-100 hover:text-zinc-950 font-medium' 
                      : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  <img
                    src={member.userId?.profilePic || "/avatar.png"}
                    alt={member.userId?.fullName}
                    className="w-6 h-6 rounded-full object-cover border border-white/10"
                  />
                  <span className="truncate">{member.userId?.fullName}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input row */}
        <form
          onSubmit={handleSendMessage}
          className={`flex items-center gap-1.5 sm:gap-2 transition-opacity duration-200 ${uploadProgress !== null ? 'pointer-events-none opacity-40' : ''}`}
          style={{ marginTop: imagePreview || selectedFile || uploadProgress !== null ? '10px' : '0' }}
        >
          {/* Pill-shaped text input — responsive height, theme-adaptive bg */}
          <div
            className={`flex-1 relative flex items-center h-10 sm:h-[50px] transition-all duration-300 ${quantumMode ? 'quantum-vault-input-active' : ''}`}
            style={{
              background: quantumMode 
                ? (isAmethyst ? '#eef2ff' : 'rgba(99, 102, 241, 0.06)') 
                : (isAmethyst ? '#f2f2f9' : 'rgba(255,255,255,0.05)'),
              border: quantumMode
                ? '1.5px solid rgba(99, 102, 241, 0.65)'
                : isAnnouncement 
                  ? '1.5px solid rgba(245,158,11,0.6)'
                  : `1.5px solid ${isAmethyst ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.15)'}`,
              borderRadius: 'var(--radius-pill)',
              transition: 'box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease',
              boxShadow: quantumMode
                ? '0 0 15px rgba(99, 102, 241, 0.45)'
                : isAnnouncement 
                  ? '0 0 12px rgba(245,158,11,0.25)' 
                  : 'none',
            }}
            onFocusCapture={e => {
              if (quantumMode) return;
              e.currentTarget.style.boxShadow = isAnnouncement 
                ? '0 0 12px rgba(245,158,11,0.4)' 
                : '0 0 0 3px rgba(99,102,241,0.2)';
              e.currentTarget.style.borderColor = isAnnouncement 
                ? 'rgba(245,158,11,0.8)' 
                : 'rgba(99,102,241,0.5)';
            }}
            onBlurCapture={e => {
              if (quantumMode) return;
              e.currentTarget.style.boxShadow = isAnnouncement 
                ? '0 0 12px rgba(245,158,11,0.25)' 
                : 'none';
              e.currentTarget.style.borderColor = isAnnouncement 
                ? 'rgba(245,158,11,0.6)'
                : (isAmethyst ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.15)');
            }}
          >
            {quantumMode && (
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest border select-none ml-2.5 flex-shrink-0"
                style={{
                  background: 'var(--accent-muted, rgba(99, 102, 241, 0.12))',
                  borderColor: 'var(--border-accent, rgba(99, 102, 241, 0.4))',
                  color: 'var(--text-accent, var(--accent-primary))',
                  boxShadow: '0 0 8px var(--accent-glow, rgba(99, 102, 241, 0.15))',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse animate-duration-1000" style={{ boxShadow: '0 0 6px var(--accent-primary)' }} />
                Vault
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => {
                const val = e.target.value;
                setText(val);

                // Tag menu detection
                const selectionStart = e.target.selectionStart;
                const textBeforeCursor = val.substring(0, selectionStart);
                const lastHashIndex = textBeforeCursor.lastIndexOf('#');

                if (activeGroup && lastHashIndex !== -1) {
                  const charBeforeHash = lastHashIndex > 0 ? textBeforeCursor[lastHashIndex - 1] : ' ';
                  const textAfterHash = textBeforeCursor.substring(lastHashIndex + 1);
                  if ((charBeforeHash === ' ' || charBeforeHash === '\n' || lastHashIndex === 0) && !/\s/.test(textAfterHash)) {
                    setShowTagMenu(true);
                    setTagSearchQuery(textAfterHash.toLowerCase());
                    setTagStartIndex(lastHashIndex);
                  } else {
                    setShowTagMenu(false);
                  }
                } else {
                  setShowTagMenu(false);
                }

                if (activeGroup) {
                  sendGroupTyping();
                  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = setTimeout(() => sendGroupStopTyping(), 2000);
                } else {
                  sendTyping();
                  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                  typingTimeoutRef.current = setTimeout(() => sendStopTyping(), 2000);
                }
              }}
              className="flex-1 text-sm outline-none"
              style={{
                background: 'transparent',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-body)',
                padding: '0 1.25rem',
                paddingLeft: quantumMode ? '0.75rem' : '1.25rem',
                border: 'none',
                minWidth: 0,
                height: '100%',
              }}
              placeholder={
                quantumMode 
                  ? "Enter secure vault message..." 
                  : isAnnouncement 
                    ? "Write group announcement..." 
                    : "Type a message..."
              }
            />

            {/* Emoji button inside pill — responsive sizing */}
            <button
              type="button"
              className="emoji-picker-btn flex-shrink-0 flex items-center justify-center transition-all duration-200 w-[30px] h-[30px] sm:w-[34px] sm:h-[34px]"
              style={{
                marginRight: '2px',
                borderRadius: '10px',
                border: 'none', cursor: 'pointer',
                background: showEmojiPicker ? 'var(--accent-muted)' : 'transparent',
                color: showEmojiPicker ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <SmileIcon size={15} className="sm:w-[17px] sm:h-[17px]" />
            </button>

            {/* Quantum Handshake Vault Toggle */}
            {!activeGroup && (
              <button
                type="button"
                className="flex-shrink-0 flex items-center justify-center transition-all duration-200 w-[30px] h-[30px] sm:w-[34px] sm:h-[34px]"
                style={{
                  marginRight: '2px',
                  borderRadius: '10px',
                  border: 'none', cursor: 'pointer',
                  background: quantumMode ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: quantumMode ? 'var(--accent-primary, #6366f1)' : 'var(--text-muted)',
                  boxShadow: quantumMode ? '0 0 8px rgba(99, 102, 241, 0.3)' : 'none',
                }}
                onClick={() => {
                  if (!handshakeActive) {
                    toast.error("Quantum Handshake not active. Both users must be looking at this chat screen simultaneously.", {
                      duration: 4000
                    });
                    return;
                  }
                  setQuantumMode(!quantumMode);
                }}
                title={quantumMode ? "Disable Co-Presence Vault" : "Enable Co-Presence Vault"}
              >
                <Orbit size={15} className={`sm:w-[17px] sm:h-[17px] ${quantumMode ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
              </button>
            )}

            {/* Attachment button inside pill — responsive sizing */}
            {!quantumMode && (
              <button
                type="button"
                className="attachment-menu-btn flex-shrink-0 flex items-center justify-center transition-all duration-200 w-[30px] h-[30px] sm:w-[34px] sm:h-[34px]"
                style={{
                  marginRight: '8px',
                  borderRadius: '10px',
                  border: 'none', cursor: 'pointer',
                  background: showAttachmentMenu ? 'var(--accent-muted)' : 'transparent',
                  color: showAttachmentMenu ? 'var(--accent-primary)' : 'var(--text-muted)',
                }}
                onClick={() => {
                  setShowAttachmentMenu(!showAttachmentMenu);
                  setLinkInputMode(false);
                  setLinkText("");
                  setLinkUrl("");
                }}
                title="Attach files, photos or links"
              >
                <PaperclipIcon size={15} className="sm:w-[17px] sm:h-[17px]" />
              </button>
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute bottom-14 right-0 z-50 shadow-2xl rounded-2xl overflow-hidden">
                <EmojiPicker
                  theme={theme === 'amethyst' ? 'light' : 'dark'}
                  onEmojiClick={(emojiObject) => setText((prev) => prev + emojiObject.emoji)}
                  width={300}
                  height={360}
                />
              </div>
            )}

            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          </div>

          {/* File upload */}
          {!quantumMode && <FileUpload ref={fileUploadRef} onFileSelect={handleFileSelect} hideButton={true} />}

          {/* Voice recorder */}
          {!quantumMode && <VoiceRecorder onSendAudio={handleSendAudio} />}

          {/* Interactive Poll / Announcement Plus Button */}
          {activeGroup && (
            <div className="relative flex-shrink-0">
              <button
                type="button"
                className="group-addons-btn flex-shrink-0 flex items-center justify-center transition-all duration-200 hover:bg-[var(--bg-glass-hover)] active:scale-95 w-9 h-9 sm:w-11 sm:h-11 border"
                style={{
                  borderRadius: 'var(--radius-btn)',
                  borderColor: 'var(--border-subtle)',
                  background: showGroupAddonsMenu ? 'var(--accent-muted)' : 'transparent',
                  color: showGroupAddonsMenu ? 'var(--accent-primary)' : 'var(--text-muted)',
                  cursor: 'pointer'
                }}
                onClick={() => setShowGroupAddonsMenu(!showGroupAddonsMenu)}
                title="Group tools"
              >
                <PlusIcon size={16} className={`sm:w-[18px] sm:h-[18px] transition-transform duration-250 ${showGroupAddonsMenu ? 'rotate-45 text-[var(--accent-primary)]' : ''}`} />
              </button>

              {showGroupAddonsMenu && (
                <div
                  ref={groupAddonsRef}
                  className="absolute bottom-full right-0 mb-2 w-48 rounded-2xl p-1.5 border z-50 animate-slide-up shadow-xl flex flex-col gap-1"
                  style={{
                    background: isAmethyst ? '#ffffff' : 'var(--bg-glass-panel)',
                    borderColor: 'var(--border-medium)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)'
                  }}
                >
                  {/* Create Poll */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowGroupAddonsMenu(false);
                      setShowPollModal(true);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-colors
                      ${isAmethyst ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-white/5'}
                    `}
                  >
                    <BarChart2 size={14} className="text-purple-400" />
                    <span>Create Poll</span>
                  </button>

                  {/* Toggle Announcement */}
                  {canPostAnnouncement && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowGroupAddonsMenu(false);
                        setIsAnnouncement(!isAnnouncement);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl text-left transition-colors
                        ${isAnnouncement 
                          ? 'bg-amber-500/10 text-amber-600 font-extrabold' 
                          : (isAmethyst ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-white/5')
                        }
                      `}
                    >
                      <Megaphone size={14} className={isAnnouncement ? "text-amber-500" : "text-amber-400"} />
                      <span>{isAnnouncement ? "Disable Announcement" : "Post Announcement"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Send button */}
          <button
            type="submit"
            disabled={!hasContent}
            className="flex-shrink-0 flex items-center justify-center transition-all duration-200 disabled:opacity-35 disabled:cursor-not-allowed active:scale-95 w-9 h-9 sm:w-11 sm:h-11"
            style={{
              borderRadius: 'var(--radius-btn)',
              border: 'none', cursor: 'pointer',
              background: hasContent 
                ? quantumMode 
                  ? 'linear-gradient(135deg, var(--accent-primary, #6366f1), #8b5cf6)' 
                  : 'linear-gradient(135deg, var(--accent-primary), #7c3aed)' 
                : 'var(--bg-glass-hover)',
              color: hasContent ? '#ffffff' : 'var(--text-muted)',
              boxShadow: hasContent 
                ? quantumMode 
                  ? '0 2px 14px rgba(99, 102, 241, 0.6)' 
                  : '0 2px 14px var(--accent-glow)' 
                : 'none',
              flexShrink: 0,
            }}
          >
            <SendIcon size={15} className="sm:w-[17px] sm:h-[17px]" />
          </button>
        </form>

        {/* Consolidated Attachment Menu Popover / Mobile Bottom Sheet */}
        {showAttachmentMenu && (
          <>
            {/* Mobile Backdrop & Bottom Sheet (< 768px) */}
            <div
              className="block md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] transition-opacity duration-300"
              onClick={() => {
                setShowAttachmentMenu(false);
                setLinkInputMode(false);
                setLinkText("");
                setLinkUrl("");
              }}
            />
            <div
              ref={attachmentMenuRef}
              className={`fixed md:absolute bottom-0 md:bottom-[calc(100%+8px)] left-0 md:left-auto md:right-8 w-full md:w-64 max-w-md md:max-w-xs z-[100]
                transition-all duration-300 transform rounded-t-3xl md:rounded-2xl p-4 md:p-3 border
                ${isAmethyst ? 'border-zinc-200' : 'border-[var(--border-medium)]'}
              `}
              style={{
                background: isAmethyst 
                  ? '#ffffff' 
                  : theme === 'midnight' 
                    ? 'rgba(5, 5, 8, 0.95)' 
                    : 'rgba(13, 13, 36, 0.95)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                boxShadow: isAmethyst ? '0 8px 32px rgba(99,102,241,0.08)' : '0 8px 32px rgba(0,0,0,0.5)',
                paddingBottom: 'calc(env(safe-area-inset-bottom, 16px) + 12px)',
              }}
            >
              <div className="md:pb-0 flex flex-col gap-1">
                {!linkInputMode ? (
                  <>
                    <div className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1.5 border-b mb-1" style={{ color: 'var(--text-accent)', borderColor: 'var(--border-subtle)' }}>
                      Add Attachment
                    </div>
                    {/* Photo Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachmentMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className={`w-full px-3 py-3 md:py-2 text-left rounded-xl text-xs sm:text-sm flex items-center gap-3 transition-colors min-h-[44px]
                        ${isAmethyst ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-white/5'}
                      `}
                    >
                      <ImageIcon size={16} className="text-[var(--accent-primary)]" />
                      <span className="font-medium">Photos & Videos</span>
                    </button>

                    {/* File Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachmentMenu(false);
                        fileUploadRef.current?.triggerClick();
                      }}
                      className={`w-full px-3 py-3 md:py-2 text-left rounded-xl text-xs sm:text-sm flex items-center gap-3 transition-colors min-h-[44px]
                        ${isAmethyst ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-white/5'}
                      `}
                    >
                      <FileIcon size={16} className="text-emerald-400" />
                      <span className="font-medium">Document / File</span>
                    </button>

                    {/* Link Option */}
                    <button
                      type="button"
                      onClick={() => setLinkInputMode(true)}
                      className={`w-full px-3 py-3 md:py-2 text-left rounded-xl text-xs sm:text-sm flex items-center gap-3 transition-colors min-h-[44px]
                        ${isAmethyst ? 'text-zinc-800 hover:bg-zinc-100' : 'text-zinc-200 hover:bg-white/5'}
                      `}
                    >
                      <LinkIcon size={16} className="text-amber-400" />
                      <span className="font-medium">Insert Link</span>
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-3 p-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider px-1 py-0.5 border-b flex justify-between items-center" style={{ color: 'var(--text-accent)', borderColor: 'var(--border-subtle)' }}>
                      <span>Insert Markdown Link</span>
                      <button
                        type="button"
                        onClick={() => {
                          setLinkInputMode(false);
                          setLinkText("");
                          setLinkUrl("");
                        }}
                        className="text-[9px] lowercase font-normal hover:underline"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Back
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>
                          Link Text (optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Google Search"
                          value={linkText}
                          onChange={(e) => setLinkText(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all duration-200"
                          style={{
                            background: "var(--bg-input-search)",
                            border: "1.5px solid var(--border-subtle)",
                            color: "var(--text-primary)",
                            fontFamily: "var(--font-body)",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                          onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleInsertLink();
                            }
                          }}
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>
                          URL Target *
                        </label>
                        <input
                          type="text"
                          placeholder="https://example.com"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          required
                          className="w-full px-3 py-2 rounded-lg text-xs outline-none transition-all duration-200"
                          style={{
                            background: "var(--bg-input-search)",
                            border: "1.5px solid var(--border-subtle)",
                            color: "var(--text-primary)",
                            fontFamily: "var(--font-body)",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                          onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleInsertLink();
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setLinkInputMode(false);
                          setLinkText("");
                          setLinkUrl("");
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium border"
                        style={{
                          background: 'transparent',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleInsertLink}
                        disabled={!linkUrl.trim()}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Insert
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── INTERACTIVE POLL CREATOR MODAL ── */}
      {showPollModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={resetPoll}
          />

          {/* Modal Card */}
          <div 
            className="relative w-full max-w-md overflow-hidden flex flex-col shadow-2xl animate-fade-in"
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-medium)",
              borderRadius: "var(--radius-logo, 24px)",
              boxShadow: "var(--shadow-panel)",
              backdropFilter: "blur(24px)",
              fontFamily: "var(--font-body)",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column"
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-5 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2.5">
                <BarChart2 size={20} style={{ color: "var(--accent-primary)" }} />
                <h3 className="font-bold text-lg tracking-tight" style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
                  Create Interactive Poll
                </h3>
              </div>
              <button 
                onClick={resetPoll} 
                className="btn-icon"
                style={{ color: "var(--text-secondary)" }}
              >
                <XIcon size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreatePoll} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar" style={{ overflowY: "auto" }}>
              {/* Question */}
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  Question *
                </label>
                <input
                  type="text"
                  placeholder="Ask a question..."
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-glow)]"
                  style={{
                    background: "var(--bg-input-search)",
                    border: "1.5px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-body)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--accent-primary)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border-subtle)")}
                />
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold block" style={{ color: "var(--text-secondary)" }}>
                  Options *
                </label>
                <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: "160px", overflowY: "auto" }}>
                  {pollOptions.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPollOptions(pollOptions.map((opt, idx) => idx === index ? val : opt));
                        }}
                        required={index < 2}
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                        style={{
                          background: "var(--bg-input-search)",
                          border: "1.5px solid var(--border-subtle)",
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-body)",
                        }}
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setPollOptions(pollOptions.filter((_, idx) => idx !== index))}
                          className="btn-icon p-2 rounded-xl hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2Icon size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {pollOptions.length < 10 && (
                  <button
                    type="button"
                    onClick={() => setPollOptions([...pollOptions, ""])}
                    className="text-xs font-bold uppercase tracking-wider text-[var(--accent-primary)] hover:underline flex items-center gap-1 mt-1 transition-all"
                  >
                    <PlusIcon size={12} /> Add Option
                  </button>
                )}
              </div>

              {/* Toggles */}
              <div className="pt-2 space-y-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                {/* Multiple choices */}
                <div className="flex items-center justify-between py-1.5">
                  <div>
                    <span className="text-xs font-semibold block" style={{ color: "var(--text-primary)" }}>
                      Multiple Choices
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      Allow voting for more than one option
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setPollIsMultiSelect(!pollIsMultiSelect)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-all duration-200 focus:outline-none flex items-center ${pollIsMultiSelect ? 'bg-[var(--accent-primary)] justify-end' : 'bg-zinc-650 justify-start'}`}
                    style={{
                      background: pollIsMultiSelect ? 'var(--accent-primary)' : (isAmethyst ? 'rgba(0, 0, 0, 0.18)' : 'rgba(255, 255, 255, 0.15)'),
                      boxShadow: pollIsMultiSelect ? '0 0 8px var(--accent-glow)' : 'none'
                    }}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md transform active:scale-90 transition-transform duration-200" />
                  </button>
                </div>

                {/* Anonymous voting */}
                <div className="flex items-center justify-between py-1.5 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                  <div>
                    <span className="text-xs font-semibold block" style={{ color: "var(--text-primary)" }}>
                      Anonymous Voting
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      Hide who voted for which option
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setPollIsAnonymous(!pollIsAnonymous)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-all duration-200 focus:outline-none flex items-center ${pollIsAnonymous ? 'bg-[var(--accent-primary)] justify-end' : 'bg-zinc-650 justify-start'}`}
                    style={{
                      background: pollIsAnonymous ? 'var(--accent-primary)' : (isAmethyst ? 'rgba(0, 0, 0, 0.18)' : 'rgba(255, 255, 255, 0.15)'),
                      boxShadow: pollIsAnonymous ? '0 0 8px var(--accent-glow)' : 'none'
                    }}
                  >
                    <div className="bg-white w-4 h-4 rounded-full shadow-md transform active:scale-90 transition-transform duration-200" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 flex-shrink-0 border-t" style={{ borderColor: "var(--border-subtle)" }}>
                <button
                  type="button"
                  onClick={resetPoll}
                  className="btn-ghost"
                  style={{ padding: "0.5rem 1.25rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex items-center gap-2"
                  style={{ padding: "0.5rem 1.25rem" }}
                >
                  Create Poll
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default MessageInput;