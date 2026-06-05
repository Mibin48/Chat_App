import { useRef, useState } from 'react';
import { userChatStore } from '../store/userChatStore';
import { userAuthStore } from '../store/userAuthStore';
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon, SmileIcon, FileIcon } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import FileUpload from './FileUpload';
import VoiceRecorder from './VoiceRecorder';


function MessageInput() {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const fileUploadRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState("");
  const [tagStartIndex, setTagStartIndex] = useState(-1);
  
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
    uploadProgress
  } = userChatStore();
  const { authUser } = userAuthStore();

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
        sendGroupMessage({ text: text.trim(), image: imagePreview });
      } else {
        sendMessage({ text: text.trim(), image: imagePreview });
      }
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

  const handleSendAudio = (audioData, duration) => sendAudio(audioData, duration);
  const hasContent = text.trim() || imagePreview || selectedFile;

  return (
    /* Floating input bar: px-4 sm:px-6 gives side margins, pb-3 pt-2 for breathing room */
    <div
      className="flex-shrink-0 px-3 sm:px-5 pb-3 pt-2"
      style={{ background: 'var(--bg-chat)' }}
    >
      {/* Floating card wrapper */}
      <div
        className="relative"
        style={{
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-medium)',
          borderRadius: '1rem',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15), 0 1px 0 var(--border-subtle)',
        }}
      >
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
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowTagMenu(false)} />
            <div 
              className="absolute bottom-full left-4 mb-2 w-64 max-h-48 overflow-y-auto rounded-2xl p-2 border z-50 animate-slide-up"
              style={{
                background: 'var(--bg-glass)',
                borderColor: 'var(--border-medium)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-pink-400 px-2.5 py-1.5 border-b border-white/5">
                Tag Group Member
              </div>
              <div className="flex flex-col gap-0.5 mt-1.5">
                {/* Tag All item */}
                {(tagSearchQuery === "" || "all".includes(tagSearchQuery)) && (
                  <button
                    type="button"
                    onClick={() => handleSelectTag("all")}
                    className="w-full px-2.5 py-2 text-left rounded-xl text-xs text-pink-300 hover:bg-pink-500/10 flex items-center gap-2 transition-colors font-semibold"
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
                    className="w-full px-2.5 py-2 text-left rounded-xl text-xs text-zinc-300 hover:bg-white/5 hover:text-white flex items-center gap-2.5 transition-all"
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
          </>
        )}

        {/* Input row */}
        <form onSubmit={handleSendMessage} className={`flex items-center gap-1.5 p-2 transition-opacity duration-200 ${uploadProgress !== null ? 'pointer-events-none opacity-40' : ''}`}>

          {/* Text input */}
          <div className="flex-1 flex items-center gap-1 relative">
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
                fontFamily: 'Inter, sans-serif',
                padding: '0.4rem 5.25rem 0.4rem 0.75rem',
                border: 'none',
                minWidth: 0,
              }}
              placeholder="Type a message..."
            />

            {/* Emoji button */}
            <button
              type="button"
              className="absolute right-9 top-1/2 -translate-y-1/2 btn-icon p-1.5 rounded-lg"
              style={showEmojiPicker ? { color: 'var(--accent-primary)', background: 'var(--accent-muted)' } : {}}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <SmileIcon size={17} />
            </button>

            {/* Image button */}
            <button
              type="button"
              className="absolute right-1 top-1/2 -translate-y-1/2 btn-icon p-1.5 rounded-lg"
              style={imagePreview ? { color: 'var(--accent-primary)' } : {}}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon size={17} />
            </button>

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                <div className="absolute bottom-12 right-0 z-50 shadow-2xl rounded-2xl overflow-hidden">
                  <EmojiPicker
                    theme={theme === 'amethyst' ? 'light' : 'dark'}
                    onEmojiClick={(emojiObject) => setText((prev) => prev + emojiObject.emoji)}
                    width={300}
                    height={360}
                  />
                </div>
              </>
            )}

            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
          </div>

          {/* File upload */}
          <FileUpload ref={fileUploadRef} onFileSelect={handleFileSelect} />

          {/* Voice recorder */}
          <VoiceRecorder onSendAudio={handleSendAudio} />

          {/* Send button */}
          <button
            type="submit"
            disabled={!hasContent}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-35 disabled:cursor-not-allowed active:scale-95"
            style={{
              background: hasContent ? 'linear-gradient(135deg, var(--accent-primary), #7c3aed)' : 'var(--bg-glass-hover)',
              color: hasContent ? '#ffffff' : 'var(--text-muted)',
              boxShadow: hasContent ? '0 2px 12px var(--accent-glow)' : 'none',
            }}
          >
            <SendIcon size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default MessageInput;