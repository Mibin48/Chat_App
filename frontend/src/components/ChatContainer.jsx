import { useEffect, useRef, useState, useMemo, useLayoutEffect } from "react";
import { userAuthStore } from "../store/userAuthStore";
import { userChatStore } from "../store/userChatStore";
import toast from "react-hot-toast";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageReactions from "./MessageReactions";
import MessageEditor from "./MessageEditor";
import SearchBar from "./SearchBar";
import InfoPanel from "./InfoPanel";
import FilePreviewModal from "./FilePreviewModal";
import BirthdayPage from "./BirthdayPage";
import DecryptedMedia from "./DecryptedMedia";
import QuotedBubble from "./QuotedBubble";
import { Trash2Icon, EditIcon, DownloadIcon, PlayIcon, PauseIcon, CheckCheckIcon, CheckIcon, PinIcon, ImageIcon, MicIcon, FileIcon, CakeIcon, Star as StarIcon, ExternalLinkIcon, Loader2Icon, LockIcon, ReplyIcon } from "lucide-react";
import { formatMessageTime, formatFullDateTime, formatDateSeparator, isSameDay, formatMessageTimestamp } from "../lib/timeUtils";

const LinkPreview = ({ url }) => {
    const { linkPreviews, fetchLinkPreview, theme } = userChatStore();

    useEffect(() => {
        if (url) {
            fetchLinkPreview(url);
        }
    }, [url, fetchLinkPreview]);

    const preview = linkPreviews[url];

    if (!preview) return null;

    if (preview.loading) {
        return (
            <div className="mt-2.5 p-3 rounded-xl border border-white/5 bg-white/[0.02] animate-pulse flex flex-col gap-2 w-full max-w-[280px]">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-5/6" />
                <div className="h-16 bg-white/5 rounded-lg w-full" />
            </div>
        );
    }

    const { title, description, image } = preview;

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-2.5 block rounded-2xl overflow-hidden border transition-all duration-200 shadow-lg group max-w-[280px]"
            style={{ 
                background: theme === 'amethyst' ? 'rgba(255, 255, 255, 0.78)' : 'var(--bg-glass-panel)',
                borderColor: 'var(--border-subtle)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
            }}
        >
            {image && (
                <div className="w-full h-24 overflow-hidden relative border-b border-white/5 bg-black/20">
                    <img 
                        src={image} 
                        alt="Preview" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </div>
            )}
            <div className="p-3 flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--accent-hover)] font-mono flex items-center gap-1">
                    {new URL(url).hostname}
                    <ExternalLinkIcon size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </span>
                <h4 className="text-xs font-bold leading-snug line-clamp-1 text-[var(--text-primary)]">
                    {title || new URL(url).hostname}
                </h4>
                {description && (
                    <p className="text-[9px] leading-relaxed line-clamp-2 text-[var(--text-secondary)]">
                        {description}
                    </p>
                )}
            </div>
        </a>
    );
};

const generateWaveform = (url, count = 28) => {
    if (!url) return Array(count).fill(12);
    const hash = url.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const heights = [];
    for (let i = 0; i < count; i++) {
        const val = Math.abs(Math.sin(hash + i * 1.6));
        const h = Math.floor(val * 16) + 8; // range from 8px to 24px
        heights.push(h);
    }
    return heights;
};

function ChatContainer() {
  const {
    selectedUser, activeGroup, getMessagesByUserId, getGroupMessages, messages, isMessagesLoading,
    subscribeToTypingEvents, unsubscribeFromTypingEvents,
    deleteMessage, subscribeToDeleteEvents, unsubscribeFromDeleteEvents,
    addReaction, subscribeToReactionEvents, unsubscribeFromReactionEvents,
    markMessagesAsRead, subscribeToReadEvents, unsubscribeFromReadEvents,
    editMessage, subscribeToEditEvents, unsubscribeFromEditEvents,
    togglePinMessage, toggleStarMessage,
    showSearch, setShowSearch,
    showInfoPanel, setShowInfoPanel,
    activePreviewFile, setActivePreviewFile,
    sendMessage, sendGroupMessage,
    setReplyingTo,
    isTyping, groupTypingUsers,
    hasMoreMessages, isLoadingOlder,
    theme,
  } = userChatStore();
  const { authUser } = userAuthStore();
  const messageEndRef = useRef(null);
  const lastSelectedIdRef = useRef(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [playbackProgress, setPlaybackProgress] = useState({});
  const [showBirthdayPage, setShowBirthdayPage] = useState(false);

  // Pagination and Scroll Refs
  const chatContainerRef = useRef(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const oldScrollHeightRef = useRef(0);
  const skipScrollToBottomRef = useRef(false);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages]);

  const isBirthdayToday = (() => {
    if (activeGroup || !selectedUser?.dob) return false;
    const dob = new Date(selectedUser.dob);
    const today = new Date();
    return dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
  })();

  const handleSendWish = (wishText) => {
    if (activeGroup) {
      sendGroupMessage({ text: wishText });
    } else {
      sendMessage({ text: wishText });
    }
    setShowBirthdayPage(false);
  };

  useEffect(() => {
    if (activeGroup) {
      getGroupMessages(activeGroup._id);
    } else if (selectedUser) {
      getMessagesByUserId(selectedUser._id);
      markMessagesAsRead(selectedUser._id);
    }

    subscribeToTypingEvents();
    subscribeToDeleteEvents();
    subscribeToReactionEvents();
    subscribeToReadEvents();
    subscribeToEditEvents();

    return () => {
      unsubscribeFromTypingEvents();
      unsubscribeFromDeleteEvents();
      unsubscribeFromReactionEvents();
      unsubscribeFromReadEvents();
      unsubscribeFromEditEvents();
    };
  }, [selectedUser?._id, activeGroup?._id]);

  // Synchronous scroll positioning when older messages are loaded
  useLayoutEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    if (messages.length > prevMessagesLengthRef.current) {
      if (skipScrollToBottomRef.current) {
        // Keep scroll anchored precisely to the same message
        container.scrollTop = container.scrollHeight - oldScrollHeightRef.current;
      }
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages]);

  useEffect(() => {
    if (skipScrollToBottomRef.current) {
      // Clear flag and skip automatic scroll to bottom
      skipScrollToBottomRef.current = false;
      return;
    }
    if (messageEndRef.current) {
      const currentSelectedId = activeGroup?._id || selectedUser?._id;
      const isSameChat = lastSelectedIdRef.current === currentSelectedId;
      
      messageEndRef.current.scrollIntoView({
        behavior: isSameChat ? "smooth" : "auto"
      });
      
      lastSelectedIdRef.current = currentSelectedId;
    }
  }, [messages, activeGroup?._id, selectedUser?._id, isTyping, groupTypingUsers]);

  const handleScroll = async (e) => {
    const container = e.currentTarget;
    if (container.scrollTop <= 15 && hasMoreMessages && !isLoadingOlder) {
      const oldestMsg = messages[0];
      if (oldestMsg) {
        oldScrollHeightRef.current = container.scrollHeight;
        skipScrollToBottomRef.current = true;
        
        if (activeGroup) {
          await getGroupMessages(activeGroup._id, oldestMsg.createdAt);
        } else if (selectedUser) {
          await getMessagesByUserId(selectedUser._id, oldestMsg.createdAt);
        }
      }
    }
  };

  const handleEditMessage = (messageId, newText) => {
    editMessage(messageId, newText);
    setEditingMessageId(null);
  };

  const isUserTagged = (msg) => {
    if (!activeGroup || !msg.text) return false;
    const selfTag = `#${authUser?.fullName}`;
    return msg.text.includes(selfTag) || msg.text.includes('#all');
  };

  const getSenderName = (senderId) => {
    if (!senderId) return "";
    const sId = (typeof senderId === 'object' && senderId !== null) 
      ? (senderId._id || senderId).toString() 
      : senderId.toString();
      
    const authId = authUser?._id?.toString();
    if (sId === authId) return "You";
    
    if (activeGroup) {
      const member = activeGroup.members?.find(m => {
        const mId = (m.userId && typeof m.userId === 'object') ? m.userId._id : m.userId;
        return mId?.toString() === sId;
      });
      if (member && member.userId && typeof member.userId === 'object') {
        return member.userId.fullName;
      }
    } else if (selectedUser) {
      const sIdSelected = (typeof selectedUser === 'object' && selectedUser !== null)
        ? (selectedUser._id || selectedUser).toString()
        : selectedUser.toString();
      if (sIdSelected === sId) {
        return selectedUser.fullName;
      }
    }
    return "Member";
  };


  const renderMessageText = (text) => {
    if (!text) return null;

    // First process links (convert URLs into clickable <a> tags)
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    const parts = [];
    let lastIndex = 0;
    let match;
    const textStr = String(text);

    while ((match = urlRegex.exec(textStr)) !== null) {
      const matchIndex = match.index;
      const url = match[0];

      if (matchIndex > lastIndex) {
        parts.push(textStr.substring(lastIndex, matchIndex));
      }

      const href = url.toLowerCase().startsWith('http') ? url : `https://${url}`;
      parts.push(
        <a
          key={`link-${matchIndex}-${Math.random()}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline break-all font-semibold"
          onClick={(e) => e.stopPropagation()}
        >
          {url}
        </a>
      );

      lastIndex = urlRegex.lastIndex;
    }

    if (lastIndex < textStr.length) {
      parts.push(textStr.substring(lastIndex));
    }

    let currentParts = parts;

    if (!activeGroup || !activeGroup.members) {
      return currentParts;
    }

    const sortedMembers = [...activeGroup.members].sort((a, b) => {
      const lenA = a.userId?.fullName?.length || 0;
      const lenB = b.userId?.fullName?.length || 0;
      return lenB - lenA;
    });

    // First process #all
    const nextPartsAll = [];
    currentParts.forEach(part => {
      if (typeof part !== 'string') {
        nextPartsAll.push(part);
        return;
      }

      if (!part.includes('#all')) {
        nextPartsAll.push(part);
        return;
      }

      let temp = part;
      while (temp.includes('#all')) {
        const idx = temp.indexOf('#all');
        const before = temp.substring(0, idx);
        if (before) nextPartsAll.push(before);

        nextPartsAll.push(
          <span 
            key={`all-${Math.random()}`}
            className="inline-block px-1.5 py-0.5 rounded-md font-bold text-[10px] bg-amber-500/25 text-amber-300 border border-amber-500/30 cursor-help mx-0.5 select-none"
            title="Everyone in group is tagged"
          >
            #all
          </span>
        );

        temp = temp.substring(idx + 4);
      }
      if (temp) nextPartsAll.push(temp);
    });
    currentParts = nextPartsAll;

    // Process each member tag
    sortedMembers.forEach(member => {
      const name = member.userId?.fullName;
      if (!name) return;
      const tag = `#${name}`;

      const nextParts = [];
      currentParts.forEach(part => {
        if (typeof part !== 'string') {
          nextParts.push(part);
          return;
        }

        if (!part.includes(tag)) {
          nextParts.push(part);
          return;
        }

        let temp = part;
        while (temp.includes(tag)) {
          const idx = temp.indexOf(tag);
          const before = temp.substring(0, idx);
          if (before) nextParts.push(before);

          const isSelf = member.userId?._id === authUser?._id;
          nextParts.push(
            <span 
              key={`tag-${member.userId?._id}-${Math.random()}`}
              className={`inline-block px-1.5 py-0.5 rounded-md font-bold text-[10px] cursor-help transition-transform duration-100 hover:scale-105 mx-0.5 select-none
                ${isSelf 
                  ? 'bg-pink-500/25 text-pink-300 border border-pink-500/30' 
                  : 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/30'
                }
              `}
              title={`${name} is tagged`}
            >
              {tag}
            </span>
          );

          temp = temp.substring(idx + tag.length);
        }
        if (temp) nextParts.push(temp);
      });
      currentParts = nextParts;
    });

    return currentParts;
  };

  const isMessageRead = (msg) => {
    const senderId = msg.senderId?._id || msg.senderId;
    if (senderId !== authUser._id) return false;
    if (activeGroup) {
      return msg.readBy && msg.readBy.length > 0;
    }
    return msg.readBy?.some(r => r.userId === selectedUser?._id);
  };

  const toggleAudioPlayback = (audioId, audioRef) => {
    if (!audioRef) return;
    if (playingAudio === audioId) {
      audioRef.pause();
      setPlayingAudio(null);
    } else {
      if (playingAudio) document.querySelectorAll('audio').forEach(a => a.pause());
      audioRef.muted = false;
      audioRef.volume = 1.0;
      audioRef.play()
        .then(() => setPlayingAudio(audioId))
        .catch(err => { console.error("Audio playback failed:", err); setPlayingAudio(null); });
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const shouldShowDateSeparator = (currentMsg, previousMsg) => {
    if (!previousMsg) return true;
    return !isSameDay(currentMsg.createdAt, previousMsg.createdAt);
  };

  const shouldShowAvatar = (msg, nextMsg) => {
    const senderId = msg.senderId?._id || msg.senderId;
    if (senderId === authUser._id) return false;
    const nextSenderId = nextMsg?.senderId?._id || nextMsg?.senderId;
    return !nextMsg || nextSenderId !== senderId;
  };

  // Resolve pinned messages in current conversation
  const pinnedMessages = messages.filter(m => m.isPinned);
  const latestPinned = pinnedMessages[pinnedMessages.length - 1];

  const handleJumpToMessage = async (messageId) => {
    let element = document.getElementById(`msg-${messageId}`);
    if (!element) {
      const chatId = activeGroup ? activeGroup._id : selectedUser?._id;
      if (chatId) {
        skipScrollToBottomRef.current = true;
        const container = chatContainerRef.current;
        if (container) {
          oldScrollHeightRef.current = container.scrollHeight;
        }
        
        const { loadHistoryUntilMessage } = userChatStore.getState();
        const success = await loadHistoryUntilMessage(chatId, !!activeGroup, messageId);
        if (success) {
          setTimeout(() => {
            element = document.getElementById(`msg-${messageId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.classList.add('highlight-message');
              setTimeout(() => element.classList.remove('highlight-message'), 1600);
            }
          }, 150);
        } else {
          toast.error("Message could not be located in chat history");
        }
      }
    } else {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-message');
      setTimeout(() => element.classList.remove('highlight-message'), 1600);
    }
  };


  return (
    <div className="flex-1 flex overflow-hidden relative h-full animate-fade-in">
      {/* ── MAIN CHAT COLUMN ── */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        <ChatHeader />

        {/* ── BIRTHDAY CELEBRATION BANNER ── */}
        {isBirthdayToday && (
          <div 
            onClick={() => setShowBirthdayPage(true)}
            className={`px-4 py-2 flex items-center justify-between cursor-pointer transition-all duration-200 border-b z-10 animate-pulse
              ${theme === 'amethyst' ? 'hover:bg-pink-500/15' : 'hover:bg-pink-500/10'}
            `}
            style={{
              background: theme === 'amethyst'
                ? 'linear-gradient(90deg, rgba(236,72,153,0.18) 0%, rgba(139,92,246,0.18) 100%)'
                : 'linear-gradient(90deg, rgba(236,72,153,0.15) 0%, rgba(139,92,246,0.15) 100%)',
              borderColor: theme === 'amethyst'
                ? 'rgba(236,72,153,0.28)'
                : 'rgba(236,72,153,0.2)'
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <CakeIcon size={14} className={theme === 'amethyst' ? 'text-pink-600 flex-shrink-0 animate-bounce' : 'text-pink-400 flex-shrink-0 animate-bounce'} />
              <div className="text-xs truncate">
                <span 
                  className="font-semibold"
                  style={{ color: theme === 'amethyst' ? 'var(--text-primary)' : '#ffffff' }}
                >
                  Today is {selectedUser.fullName}'s Birthday! 🎂{" "}
                </span>
                <span 
                  style={{ color: theme === 'amethyst' ? '#be185d' : '#f9a8d4' }}
                >
                  Click to celebrate their special day! ✨
                </span>
              </div>
            </div>
            <button 
              className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded transition-all active:scale-95 flex-shrink-0
                ${theme === 'amethyst' 
                  ? 'text-pink-700 hover:text-pink-800 bg-pink-500/15 hover:bg-pink-500/25' 
                  : 'text-pink-400 hover:text-pink-300 bg-pink-500/10 hover:bg-pink-500/20'
                }
              `}
            >
              Celebrate
            </button>
          </div>
        )}

        {/* ── PINNED MESSAGES BANNER ── */}
        {latestPinned && (
          <div 
            onClick={() => handleJumpToMessage(latestPinned._id)}
            className="px-4 py-2 flex items-center justify-between cursor-pointer transition-all duration-200 border-b hover:bg-white/5 z-10"
            style={{
              background: 'var(--bg-glass-hover)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <PinIcon size={13} className="text-[var(--accent-primary)] flex-shrink-0" />
              <div className="text-xs truncate">
                <span className="font-semibold text-[var(--text-primary)]">Pinned Message: </span>
                <span className="text-[var(--text-secondary)]">
                  {latestPinned.text || (
                    <span className="inline-flex items-center gap-1">
                      {latestPinned.image && (
                        <>
                          <ImageIcon size={12} className="flex-shrink-0" /> Photo
                        </>
                      )}
                      {latestPinned.audioUrl && (
                        <>
                          <MicIcon size={12} className="flex-shrink-0" /> Voice Note
                        </>
                      )}
                      {!latestPinned.image && !latestPinned.audioUrl && (
                        <>
                          <FileIcon size={12} className="flex-shrink-0" /> File attachment
                        </>
                      )}
                    </span>
                  )}
                </span>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                togglePinMessage(latestPinned._id);
              }}
              className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 px-2 py-0.5 rounded hover:bg-white/5 transition-colors flex-shrink-0"
            >
              Unpin
            </button>
          </div>
        )}

        {/* ── MESSAGES AREA ── */}
        <div
          ref={chatContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto custom-scrollbar"
          style={{
            background: 'var(--bg-chat)',
            backgroundImage: `
              radial-gradient(ellipse at 20% 20%, rgba(99,102,241,0.04) 0%, transparent 60%),
              radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.04) 0%, transparent 60%)
            `,
            padding: '1.25rem 1rem',
          }}
        >
          {messages.length > 0 && !isMessagesLoading ? (
            <div style={{ maxWidth: '760px', margin: '0 auto' }}>
              {/* Spinner for older messages */}
              {isLoadingOlder && (
                <div className="flex justify-center items-center pb-4 animate-fade-in">
                  <Loader2Icon className="w-4 h-4 text-[var(--accent-primary)] animate-spin" />
                  <span className="text-xs text-[var(--text-muted)] ml-2 font-medium">Loading older messages...</span>
                </div>
              )}
              {sortedMessages.map((msg, index) => {
                  const senderId = msg.senderId?._id || msg.senderId;
                  const nextMsg = sortedMessages[index + 1];
                  const nextSenderId = nextMsg?.senderId?._id || nextMsg?.senderId;
                  
                  const isOwn = senderId === authUser._id;
                  const showAvatar = shouldShowAvatar(msg, nextMsg);
                  const isLastInGroup = !nextMsg || nextSenderId !== senderId;

                  return (
                    <div key={msg._id}>
                      {/* Date Separator */}
                      {shouldShowDateSeparator(msg, sortedMessages[index - 1]) && (
                      <div className="date-separator my-4">
                        <div className="date-separator-pill">{formatDateSeparator(msg.createdAt)}</div>
                      </div>
                    )}

                    {/* Message Row */}
                    <div
                      id={`msg-${msg._id}`}
                      className={`flex items-end gap-1.5 transition-all duration-300 rounded-lg
                        ${isOwn ? 'flex-row-reverse' : 'flex-row'}
                        ${isLastInGroup ? 'mb-3' : 'mb-0.5'}
                      `}
                    >
                      {/* ── INCOMING AVATAR (left side only, last in group) ── */}
                      {!isOwn && (
                        <div className="flex-shrink-0 w-7">
                          {showAvatar ? (
                            <div
                              className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-zinc-800"
                              style={{ border: '1.5px solid var(--border-subtle)' }}
                            >
                              <img
                                src={activeGroup ? (msg.senderId?.profilePic || "/avatar.png") : (selectedUser?.profilePic || "/avatar.png")}
                                alt="avatar"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : null}
                        </div>
                      )}

                      {/* ── BUBBLE + META ── */}
                      <div
                        className={`flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}
                        style={{ maxWidth: 'min(72%, 480px)' }}
                      >
                        {/* Bubble */}
                        {editingMessageId === msg._id ? (
                          <MessageEditor
                            message={msg}
                            onSave={handleEditMessage}
                            onCancel={() => setEditingMessageId(null)}
                          />
                        ) : (
                          <div
                            className={`relative group ${isOwn ? 'bubble-own' : 'bubble-other'}`}
                            style={isUserTagged(msg) ? {
                              border: '1px solid rgba(236,72,153,0.4)',
                              boxShadow: '0 0 12px rgba(236,72,153,0.15)',
                              backgroundImage: 'linear-gradient(to bottom right, rgba(236,72,153,0.05), transparent)'
                            } : {}}
                          >
                            {/* Group Sender Name */}
                            {activeGroup && !isOwn && (
                              <p className="mb-1" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-hover)', fontFamily: 'var(--font-display)' }}>
                                {msg.senderId?.fullName || 'Member'}
                              </p>
                            )}

                            {/* Quoted reply bubble */}
                            {msg.replyTo && (
                              <QuotedBubble 
                                replyTo={msg.replyTo} 
                                isOwn={isOwn} 
                                senderName={getSenderName(msg.replyTo.senderId)}
                                onJumpToMessage={() => handleJumpToMessage(msg.replyTo._id)}
                              />
                            )}

                            {/* Hover Actions Row */}
                            <div className={`absolute -top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isOwn ? '-left-1' : '-right-1'}`}>
                              {isOwn && msg.text && (
                                <button
                                  onClick={() => setEditingMessageId(msg._id)}
                                  className="w-5 h-5 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                                  style={{ background: 'var(--accent-primary)', color: '#fff' }}
                                  title="Edit"
                                >
                                  <EditIcon size={9} />
                                </button>
                              )}
                              {isOwn && (
                                <button
                                  onClick={() => deleteMessage(msg._id)}
                                  className="w-5 h-5 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                                  style={{ background: 'var(--danger-color)', color: '#fff' }}
                                  title="Delete"
                                >
                                  <Trash2Icon size={9} />
                                </button>
                              )}
                              <button
                                onClick={() => togglePinMessage(msg._id)}
                                className="w-5 h-5 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                                style={{ 
                                  background: msg.isPinned ? 'var(--accent-primary)' : 'var(--bg-input)', 
                                  color: msg.isPinned ? '#fff' : 'var(--text-secondary)',
                                  border: '1px solid var(--border-subtle)'
                                }}
                                title={msg.isPinned ? "Unpin Message" : "Pin Message"}
                              >
                                <PinIcon size={9} style={{ transform: msg.isPinned ? 'rotate(45deg)' : 'none' }} />
                              </button>
                              <button
                                onClick={() => toggleStarMessage(msg._id)}
                                className="w-5 h-5 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                                style={{ 
                                  background: msg.starredBy?.includes(authUser._id) ? '#d97706' : 'var(--bg-input)', 
                                  color: msg.starredBy?.includes(authUser._id) ? '#fff' : 'var(--text-secondary)',
                                  border: '1px solid var(--border-subtle)'
                                }}
                                title={msg.starredBy?.includes(authUser._id) ? "Unstar Message" : "Star Message"}
                              >
                                <StarIcon size={9} fill={msg.starredBy?.includes(authUser._id) ? '#fff' : 'none'} />
                              </button>
                              {/* Reply button */}
                              <button
                                onClick={() => setReplyingTo({
                                  _id: msg._id,
                                  text: msg.text,
                                  image: msg.image,
                                  audioUrl: msg.audioUrl,
                                  fileUrl: msg.fileUrl,
                                  fileName: msg.fileName,
                                  senderId: msg.senderId,
                                })}
                                className="w-5.5 h-5.5 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                                style={{ 
                                  background: 'var(--accent-primary)', 
                                  color: '#fff', 
                                  border: '1.5px solid rgba(255,255,255,0.2)',
                                  boxShadow: '0 2px 8px var(--accent-glow)'
                                }}
                                title="Reply"
                              >
                                <ReplyIcon size={10} className="stroke-[2.5]" />
                              </button>
                            </div>

                            {/* Image — wrapped in themed card */}
                            {msg.image && (
                              <DecryptedMedia msg={msg} type="image" fallbackUrl={msg.image}>
                                {(url, isLoading, isError) => {
                                  if (isLoading) {
                                    return (
                                      <div
                                        className="mb-1.5 flex flex-col items-center justify-center gap-1.5 animate-pulse"
                                        style={{
                                          width: '220px',
                                          height: '180px',
                                          borderRadius: '20px',
                                          background: isOwn ? 'rgba(0,0,0,0.15)' : 'var(--bg-bubble-other)',
                                          border: `1px solid ${isOwn ? 'rgba(255,255,255,0.1)' : 'var(--border-bubble-other)'}`,
                                        }}
                                      >
                                        <Loader2Icon className="w-5 h-5 text-cyan-400 animate-spin" />
                                        <span className="text-[10px] text-slate-400 font-medium">Decrypting Photo...</span>
                                      </div>
                                    );
                                  }
                                  if (isError) {
                                    return (
                                      <div
                                        className="mb-1.5 flex flex-col items-center justify-center gap-1.5"
                                        style={{
                                          width: '220px',
                                          height: '180px',
                                          borderRadius: '20px',
                                          background: isOwn ? 'rgba(0,0,0,0.15)' : 'var(--bg-bubble-other)',
                                          border: `1px solid ${isOwn ? 'rgba(255,255,255,0.1)' : 'var(--border-bubble-other)'}`,
                                        }}
                                      >
                                        <LockIcon className="w-5 h-5 text-rose-500 animate-bounce" />
                                        <span className="text-[10px] text-rose-400 font-medium">Decryption failed</span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <div
                                      onClick={() => setActivePreviewFile({ url, name: 'Photo', type: 'image' })}
                                      className="mb-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                                      style={{
                                        borderRadius: '20px',
                                        padding: '8px',
                                        background: isOwn ? 'rgba(0,0,0,0.15)' : 'var(--bg-bubble-other)',
                                        border: `1px solid ${isOwn ? 'rgba(255,255,255,0.1)' : 'var(--border-bubble-other)'}`,
                                        boxShadow: isOwn ? 'none' : 'var(--shadow-bubble-other)',
                                      }}
                                    >
                                      <img
                                        src={url}
                                        alt="Attachment"
                                        className="block object-cover"
                                        style={{
                                          maxWidth: '220px',
                                          maxHeight: '280px',
                                          borderRadius: '16px',
                                        }}
                                      />
                                    </div>
                                  );
                                }}
                              </DecryptedMedia>
                            )}

                            {/* File */}
                            {msg.fileUrl && (
                              <DecryptedMedia msg={msg} type="file" fallbackUrl={msg.fileUrl}>
                                {(url, isLoading, isError) => {
                                  const isPdf = msg.fileType?.toLowerCase().includes('pdf') || msg.fileName?.toLowerCase().endsWith('.pdf');
                                  const isVideo = msg.fileType?.startsWith("video/") || ['mp4', 'webm', 'mov', 'ogg'].some(ext => msg.fileName?.toLowerCase().endsWith(`.${ext}`));
                                  const isImg = msg.fileType?.startsWith("image/") || ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => msg.fileType?.toLowerCase() === ext || msg.fileName?.toLowerCase().endsWith(`.${ext}`));

                                  if (isLoading) {
                                    return (
                                      <div
                                        className="mb-1.5 flex items-center gap-3 p-3 animate-pulse"
                                        style={{
                                          borderRadius: '16px',
                                          background: isOwn ? 'rgba(0,0,0,0.18)' : 'var(--bg-bubble-other)',
                                          border: `1px solid ${isOwn ? 'rgba(255,255,255,0.1)' : 'var(--border-bubble-other)'}`,
                                        }}
                                      >
                                        <Loader2Icon className="w-5 h-5 text-cyan-400 animate-spin" />
                                        <div className="flex-1">
                                          <div className="h-3 bg-white/10 rounded w-2/3 mb-1" />
                                          <div className="h-2 bg-white/10 rounded w-1/3" />
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (isError) {
                                    return (
                                      <div
                                        className="mb-1.5 flex items-center gap-3 p-3 text-rose-500"
                                        style={{
                                          borderRadius: '16px',
                                          background: isOwn ? 'rgba(0,0,0,0.18)' : 'var(--bg-bubble-other)',
                                          border: `1px solid ${isOwn ? 'rgba(255,255,255,0.1)' : 'var(--border-bubble-other)'}`,
                                        }}
                                      >
                                        <LockIcon className="w-5 h-5 text-rose-500 animate-bounce" />
                                        <div className="flex-1">
                                          <p className="text-xs font-bold">Decryption Failed</p>
                                          <p className="text-[10px] text-rose-400/80">Cannot read encrypted file</p>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (isVideo) {
                                    return (
                                      <div 
                                        onClick={() => setActivePreviewFile({
                                          url,
                                          name: msg.fileName || 'Video',
                                          type: 'video'
                                        })}
                                        className="mb-1.5 rounded-xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity" 
                                        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                                      >
                                        <video
                                          src={url}
                                          controls
                                          className="max-w-[220px] sm:max-w-[280px] max-h-[280px] object-cover block"
                                        />
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      onClick={() => {
                                        setActivePreviewFile({
                                          url,
                                          name: msg.fileName || 'Document',
                                          type: isPdf ? 'pdf' : (isImg ? 'image' : 'other')
                                        });
                                      }}
                                      className="mb-1.5 flex items-center gap-2.5 p-3 cursor-pointer hover:opacity-90 transition-all duration-200"
                                      style={{
                                        borderRadius: '16px',
                                        background: isOwn ? 'rgba(0,0,0,0.18)' : 'var(--bg-bubble-other)',
                                        border: `1px solid ${isOwn ? 'rgba(255,255,255,0.1)' : 'var(--border-bubble-other)'}`,
                                        boxShadow: isOwn ? 'none' : 'var(--shadow-bubble-other)',
                                      }}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="truncate" style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-body)', color: isOwn ? '#fff' : 'var(--text-primary)' }}>
                                          {msg.fileName || 'File'}
                                        </p>
                                        <p style={{ fontSize: '10px', opacity: 0.5, fontFamily: 'var(--font-body)', color: isOwn ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)' }}>
                                          {msg.fileType?.toUpperCase()} · {(msg.fileSize / 1024).toFixed(1)} KB
                                        </p>
                                      </div>
                                      <a
                                        href={url}
                                        onClick={(e) => e.stopPropagation()}
                                        download={msg.fileName || 'file'} target="_blank" rel="noopener noreferrer"
                                        className="flex-shrink-0 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                                        style={{
                                          width: '32px', height: '32px',
                                          borderRadius: '10px',
                                          background: isOwn ? 'rgba(255,255,255,0.2)' : 'var(--accent-primary)',
                                          color: '#fff',
                                        }}
                                      >
                                        <DownloadIcon size={13} />
                                      </a>
                                    </div>
                                  );
                                }}
                              </DecryptedMedia>
                            )}

                            {/* Audio Player */}
                            {msg.audioUrl && (
                              <DecryptedMedia msg={msg} type="audio" fallbackUrl={msg.audioUrl}>
                                {(url, isLoading, isError) => {
                                  if (isLoading) {
                                    return (
                                      <div
                                        className="mb-1.5 flex items-center justify-center gap-2 px-3 py-2 animate-pulse"
                                        style={{
                                          minWidth: '200px',
                                          maxWidth: '240px',
                                          borderRadius: '14px',
                                          background: isOwn ? 'rgba(0,0,0,0.2)' : 'rgba(99,102,241,0.08)',
                                          border: `1px solid ${isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.2)'}`,
                                        }}
                                      >
                                        <Loader2Icon className="w-4 h-4 text-cyan-400 animate-spin" />
                                        <span className="text-[10px] text-slate-400 font-medium">Decrypting voice note...</span>
                                      </div>
                                    );
                                  }

                                  if (isError) {
                                    return (
                                      <div
                                        className="mb-1.5 flex items-center justify-center gap-2 px-3 py-2 text-rose-500"
                                        style={{
                                          minWidth: '200px',
                                          maxWidth: '240px',
                                          borderRadius: '14px',
                                          background: isOwn ? 'rgba(0,0,0,0.2)' : 'rgba(99,102,241,0.08)',
                                          border: `1px solid ${isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.2)'}`,
                                        }}
                                      >
                                        <LockIcon className="w-4 h-4 text-rose-500 animate-bounce" />
                                        <span className="text-[10px] text-rose-400 font-medium font-mono">Decryption failed</span>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      className="mb-1.5"
                                      style={{
                                        minWidth: '200px',
                                        maxWidth: '240px',
                                        padding: '10px 12px',
                                        borderRadius: '14px',
                                        background: isOwn
                                          ? 'rgba(0,0,0,0.2)'
                                          : 'rgba(99,102,241,0.08)',
                                        border: `1px solid ${isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.2)'}`,
                                        backdropFilter: 'blur(8px)',
                                      }}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <button
                                          onClick={() => {
                                            const audio = document.getElementById(`audio-${msg._id}`);
                                            toggleAudioPlayback(msg._id, audio);
                                          }}
                                          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                                          style={{
                                            background: 'var(--accent-primary)',
                                            color: '#fff',
                                            boxShadow: '0 2px 12px var(--accent-glow)',
                                          }}
                                        >
                                          {playingAudio === msg._id ? <PauseIcon size={13} /> : <PlayIcon size={13} />}
                                        </button>

                                        <audio
                                          id={`audio-${msg._id}`}
                                          src={url}
                                          preload="auto"
                                          controls={false}
                                          onTimeUpdate={(e) => {
                                            const audio = e.currentTarget;
                                            const progress = (audio.currentTime / (audio.duration || 1)) * 100;
                                            setPlaybackProgress(prev => ({ ...prev, [msg._id]: progress }));
                                          }}
                                          onEnded={() => {
                                            setPlayingAudio(null);
                                            setPlaybackProgress(prev => ({ ...prev, [msg._id]: 0 }));
                                          }}
                                          className="sr-only"
                                        />

                                        {/* Waveform + duration */}
                                        <div className="flex-1 min-w-0">
                                          <div
                                            className="flex items-center gap-[2px] cursor-pointer select-none"
                                            style={{ height: '28px' }}
                                            onClick={(e) => {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              const percent = (e.clientX - rect.left) / rect.width;
                                              const audio = document.getElementById(`audio-${msg._id}`);
                                              if (audio?.duration && isFinite(audio.duration)) {
                                                audio.currentTime = percent * audio.duration;
                                                setPlaybackProgress(prev => ({ ...prev, [msg._id]: percent * 100 }));
                                              }
                                            }}
                                          >
                                            {generateWaveform(url, 26).map((h, i) => {
                                              const progress = playbackProgress[msg._id] || 0;
                                              const isActive = progress >= (i / 26) * 100;
                                              return (
                                                <div
                                                  key={i}
                                                  className="rounded-full transition-all duration-75"
                                                  style={{
                                                    width: '2.5px',
                                                    height: `${h}px`,
                                                    background: isActive
                                                      ? 'var(--accent-primary)'
                                                      : isOwn
                                                        ? 'rgba(255,255,255,0.25)'
                                                        : 'var(--border-medium)',
                                                    transform: playingAudio === msg._id && isActive ? 'scaleY(1.2)' : 'scaleY(1)',
                                                  }}
                                                />
                                              );
                                            })}
                                          </div>
                                          <p style={{ fontSize: '9px', opacity: 0.55, fontVariantNumeric: 'tabular-nums', marginTop: '1px' }}>
                                            {msg.audioDuration ? formatDuration(msg.audioDuration) : '0:00'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }}
                              </DecryptedMedia>
                            )}

                            {/* Text */}
                            {msg.text && (
                              <p
                                className="text-sm leading-relaxed break-words"
                                style={{ fontFamily: 'var(--font-body)' }}
                              >
                                {renderMessageText(msg.text)}
                              </p>
                            )}

                            {/* Link Preview Card */}
                            {msg.text && (() => {
                              const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;
                              const match = msg.text.match(urlRegex);
                              if (match) {
                                const url = match[0].toLowerCase().startsWith('http') ? match[0] : `https://${match[0]}`;
                                return <LinkPreview url={url} />;
                              }
                              return null;
                            })()}

                            {/* Timestamp + read receipts */}
                            <div
                              className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}
                            >
                              {msg.starredBy?.includes(authUser._id) && (
                                <StarIcon size={10} className="text-amber-500 fill-amber-500" />
                              )}
                              {msg.isPinned && (
                                <PinIcon size={10} className="text-[var(--accent-primary)] animate-pulse" />
                              )}
                              {isUserTagged(msg) && (
                                <span className="text-[9px] bg-pink-500/25 text-pink-300 font-bold px-1.5 py-0.2 rounded scale-90 select-none flex-shrink-0">Tagged</span>
                              )}
                              {msg.isEncrypted && (
                                <span className="text-[8px] opacity-40 hover:opacity-85 transition-opacity cursor-help mr-0.5 select-none" title="End-to-End Encrypted">🔒</span>
                              )}
                              {msg.isEdited && (
                                <span style={{ fontSize: '9px', opacity: 0.45 }}>edited ·</span>
                              )}
                              <span
                                title={formatFullDateTime(msg.createdAt)}
                                style={{ fontSize: '9px', opacity: 0.5, fontVariantNumeric: 'tabular-nums', cursor: 'default' }}
                              >
                                {formatMessageTimestamp(msg.createdAt)}
                              </span>
                              {isOwn && !activeGroup && (
                                isMessageRead(msg)
                                  ? <CheckCheckIcon size={11} style={{ color: isOwn ? 'rgba(255,255,255,0.8)' : 'var(--accent-primary)', opacity: 0.9 }} title="Read" />
                                  : <CheckIcon size={11} style={{ opacity: 0.45 }} title="Sent" />
                              )}
                            </div>

                            {/* Reactions */}
                            <MessageReactions
                              message={msg}
                              onAddReaction={addReaction}
                              authUserId={authUser._id}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* In-chat Typing Indicator Bubble */}
              {(() => {
                let typingName = null;
                let typingAvatar = null;
                
                if (activeGroup) {
                  const typingIds = (groupTypingUsers[activeGroup._id] || []).filter(id => id !== authUser._id);
                  if (typingIds.length > 0) {
                    const typingId = typingIds[0];
                    const member = activeGroup.members?.find(m => (m.userId?._id || m.userId) === typingId);
                    typingName = member?.userId?.fullName || 'Someone';
                    typingAvatar = member?.userId?.profilePic || "/avatar.png";
                  }
                } else if (selectedUser && isTyping) {
                  typingName = selectedUser.fullName;
                  typingAvatar = selectedUser.profilePic || "/avatar.png";
                }
                
                if (!typingName) return null;
                
                return (
                  <div className="flex items-end gap-1.5 mb-3 flex-row animate-fade-in">
                    {/* Avatar */}
                    <div className="flex-shrink-0 w-7">
                      <div
                        className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-zinc-800"
                        style={{ border: '1.5px solid var(--border-subtle)' }}
                      >
                        <img
                          src={typingAvatar}
                          alt="avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    {/* Bubble */}
                    <div
                      className="flex flex-col gap-0.5 items-start"
                      style={{ maxWidth: 'min(72%, 480px)' }}
                    >
                      <div
                        className="relative bubble-other p-3.5"
                        style={{ borderRadius: '20px 20px 20px 4px' }}
                      >
                        {activeGroup && (
                          <p className="mb-1.5" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-hover)', fontFamily: 'var(--font-display)' }}>
                            {typingName}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
                          <span className="flex items-center gap-1">
                            <span className="typing-dot" style={{ animationDelay: '0ms' }} />
                            <span className="typing-dot" style={{ animationDelay: '200ms' }} />
                            <span className="typing-dot" style={{ animationDelay: '400ms' }} />
                          </span>
                          <span className="ml-1 text-[11px] opacity-75">{activeGroup ? "is typing..." : "typing..."}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div ref={messageEndRef} className="h-2" />
            </div>
          ) : isMessagesLoading ? (
            <MessagesLoadingSkeleton />
          ) : (
            <NoChatHistoryPlaceholder name={activeGroup ? activeGroup.name : selectedUser?.fullName} />
          )}
        </div>

        {/* ── INPUT ── */}
        <MessageInput />
      </div>

      {/* ── SEARCH SIDEBAR ── */}
      {showSearch && (
        <div
          className="w-full sm:w-[320px] md:w-[340px] border-l flex flex-col flex-shrink-0 animate-slide-in absolute sm:relative inset-0 sm:inset-auto z-20 sm:z-auto"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-sidebar)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <SearchBar onClose={() => setShowSearch(false)} onJumpToMessage={handleJumpToMessage} />
        </div>
      )}

      {/* ── FILE PREVIEW OVERLAY ── */}
      {activePreviewFile && (
        <FilePreviewModal 
          file={activePreviewFile} 
          onClose={() => setActivePreviewFile(null)} 
        />
      )}

      {/* ── BIRTHDAY CELEBRATION PAGE OVERLAY ── */}
      {showBirthdayPage && (
        <BirthdayPage
          user={selectedUser}
          onClose={() => setShowBirthdayPage(false)}
          onSendWish={handleSendWish}
        />
      )}
    </div>
  );
}

export default ChatContainer;