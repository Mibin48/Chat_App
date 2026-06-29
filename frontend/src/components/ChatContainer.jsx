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
import MediaGalleryLightbox from "./MediaGalleryLightbox";
import GroupMessageInfoModal from "./GroupMessageInfoModal";
import BirthdayPage from "./BirthdayPage";
import DecryptedMedia from "./DecryptedMedia";
import QuotedBubble from "./QuotedBubble";
import { Trash2Icon, EditIcon, DownloadIcon, PlayIcon, PauseIcon, CheckCheckIcon, CheckIcon, PinIcon, ImageIcon, MicIcon, FileIcon, CakeIcon, Star as StarIcon, ExternalLinkIcon, Loader2Icon, LockIcon, ReplyIcon, MoreHorizontal, Info as InfoIcon, Megaphone, BarChart2, Phone, Video, PhoneCall, PhoneMissed, CornerUpRight, Send, Orbit, Timer, ArrowDown, ChevronUp, ChevronDown, Search, X } from "lucide-react";
import { formatMessageTime, formatFullDateTime, formatDateSeparator, isSameDay, formatMessageTimestamp } from "../lib/timeUtils";
import CallLogCard from "./CallLogCard";
import ContactCardBubble from "./ContactCardBubble";


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

function PollCard({ msg, isOwn }) {
  const { castPollVote, closePoll, activeGroup, theme } = userChatStore();
  const { authUser } = userAuthStore();
  const { poll } = msg;

  if (!poll) return null;

  const totalVotes = poll.options?.reduce((sum, opt) => sum + (opt.votes?.length || 0), 0) || 0;

  // Check if current user is the owner/creator of the poll to allow closing
  const isCreator = msg.senderId?._id === authUser?._id || msg.senderId === authUser?._id;
  const canClose = isCreator && !poll.isClosed;

  const isAmethyst = theme === 'amethyst';

  // Determine styles dynamically based on light/dark theme and own/other bubble positioning
  const cardBg = isOwn
    ? 'rgba(0, 0, 0, 0.15)'
    : (isAmethyst ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-glass-panel)');

  const cardBorder = isOwn
    ? 'rgba(255, 255, 255, 0.12)'
    : 'var(--border-subtle)';

  const questionColor = isOwn ? '#ffffff' : 'var(--text-primary)';

  const labelColor = isOwn ? 'rgba(255, 255, 255, 0.65)' : 'var(--text-muted)';
  const footerBorder = isOwn ? 'rgba(255, 255, 255, 0.12)' : 'var(--border-subtle)';

  return (
    <div className="flex flex-col gap-3 p-3.5 my-1.5 rounded-2xl border transition-all duration-300 w-full" style={{
      background: cardBg,
      borderColor: cardBorder,
      minWidth: '240px',
      maxWidth: '320px'
    }}>
      {/* Poll Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <BarChart2 size={16} style={{ color: isOwn ? '#ffffff' : 'var(--accent-primary)' }} className="flex-shrink-0" />
          <h4 className="font-bold text-sm tracking-tight leading-snug" style={{ color: questionColor }}>
            {poll.question}
          </h4>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1 mt-1">
          <span className="text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded" style={{
            background: isOwn ? 'rgba(255, 255, 255, 0.18)' : 'var(--accent-muted)',
            color: isOwn ? '#ffffff' : 'var(--text-accent)'
          }}>
            {poll.isMultiSelect ? 'Multi-Choice' : 'Single-Choice'}
          </span>
          <span className="text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded" style={{
            background: isOwn ? 'rgba(255, 255, 255, 0.10)' : 'var(--bg-input-search)',
            color: isOwn ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-secondary)'
          }}>
            {poll.anonymous ? 'Anonymous' : 'Public'}
          </span>
          {poll.isClosed && (
            <span className={`text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded ${isOwn ? 'bg-red-500/25 text-red-200' : 'bg-red-500/10 text-red-400'
              }`}>
              Closed
            </span>
          )}
        </div>
      </div>

      {/* Poll Options */}
      <div className="flex flex-col gap-2 mt-1">
        {poll.options?.map((option, idx) => {
          const hasVoted = option.votes?.some(v => (v._id || v) === authUser?._id);
          const voteCount = option.votes?.length || 0;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

          // Determine button style dynamically
          const btnBg = isOwn
            ? (hasVoted ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.22)')
            : (hasVoted
              ? (isAmethyst ? 'rgba(67, 56, 202, 0.08)' : 'rgba(99, 102, 241, 0.08)')
              : 'var(--bg-input-search)');

          const btnBorder = isOwn
            ? (hasVoted ? 'rgba(255, 255, 255, 0.60)' : 'rgba(255, 255, 255, 0.12)')
            : (hasVoted ? 'var(--accent-primary)' : 'var(--border-subtle)');

          const btnTextColor = isOwn ? '#ffffff' : 'var(--text-primary)';

          // Progress fill overlay style
          const progressFillBg = isOwn
            ? (hasVoted ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)')
            : (hasVoted
              ? (isAmethyst ? 'rgba(67, 56, 202, 0.22)' : 'rgba(99, 102, 241, 0.15)')
              : (isAmethyst ? 'rgba(67, 56, 202, 0.10)' : 'rgba(255, 255, 255, 0.08)'));

          return (
            <div key={idx} className="flex flex-col gap-1">
              <button
                type="button"
                disabled={poll.isClosed}
                onClick={() => castPollVote(msg._id, idx)}
                className={`w-full relative overflow-hidden text-left p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all duration-200
                  ${poll.isClosed ? 'cursor-default' : 'hover:border-[var(--accent-primary)] active:scale-[0.99]'}
                `}
                style={{
                  background: btnBg,
                  borderColor: btnBorder,
                  color: btnTextColor,
                  cursor: poll.isClosed ? 'default' : 'pointer'
                }}
              >
                {/* Progress fill overlay */}
                <div className="absolute inset-y-0 left-0 transition-all duration-500" style={{
                  width: `${percentage}%`,
                  background: progressFillBg,
                  zIndex: 0
                }} />

                {/* Option text */}
                <span className="z-10 truncate pr-4">{option.optionText}</span>

                {/* Vote stats */}
                <span className="z-10 text-[10px] opacity-75 font-mono flex-shrink-0 flex items-center gap-1">
                  <span>{percentage}%</span>
                  <span className="opacity-50">({voteCount})</span>
                </span>
              </button>

              {/* Voter Avatars (if public and has votes) */}
              {!poll.anonymous && option.votes && option.votes.length > 0 && activeGroup && (
                <div className="flex items-center gap-1 pl-1">
                  <div className="flex -space-x-1 overflow-hidden">
                    {option.votes.slice(0, 5).map((voterId) => {
                      const voterObj = activeGroup.members?.find(m => (m.userId?._id || m.userId) === (voterId._id || voterId))?.userId;
                      if (!voterObj) return null;
                      return (
                        <img
                          key={voterObj._id}
                          src={voterObj.profilePic || "/avatar.png"}
                          alt={voterObj.fullName}
                          className={`inline-block h-4.5 w-4.5 rounded-full object-cover ring-2 ${isOwn ? 'ring-[#4d3cbd]' : 'ring-[var(--bg-surface)]'
                            }`}
                          title={voterObj.fullName}
                          style={{ width: '16px', height: '16px' }}
                        />
                      );
                    })}
                  </div>
                  {option.votes.length > 5 && (
                    <span className="text-[8px] font-bold" style={{ color: labelColor }}>
                      +{option.votes.length - 5}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Poll Footer */}
      <div className="flex items-center justify-between border-t pt-2 mt-1" style={{ borderColor: footerBorder }}>
        <span className="text-[10px]" style={{ color: labelColor }}>
          {totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}
        </span>

        {canClose && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Are you sure you want to close this poll? This action cannot be undone.")) {
                closePoll(msg._id);
              }
            }}
            className={`text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${isOwn ? 'text-red-200 hover:text-white' : 'text-red-400 hover:text-red-300'
              }`}
            style={{ cursor: 'pointer', background: 'none', border: 'none' }}
          >
            Close Poll
          </button>
        )}
      </div>
    </div>
  );
}

function QuantumProgressBar({ expiresAt, isOwn }) {
  const [percent, setPercent] = useState(100);
  const [secondsLeft, setSecondsLeft] = useState(20);
  const { theme } = userChatStore();

  useEffect(() => {
    let active = true;
    const tick = () => {
      if (!active) return;
      const remaining = expiresAt - Date.now();
      const pct = Math.max(0, (remaining / 20000) * 100);
      const sec = Math.max(0, remaining / 1000);
      setPercent(pct);
      setSecondsLeft(sec);
      if (remaining > 0) {
        requestAnimationFrame(tick);
      }
    };
    tick();
    return () => {
      active = false;
    };
  }, [expiresAt]);

  const isLowTime = secondsLeft <= 5;
  const isAmethyst = theme === 'amethyst';

  // Determine colors based on theme, ownership, and remaining time
  let labelClass = 'text-slate-400';
  let timerClass = 'text-slate-400 opacity-60';
  let badgeClass = 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/10';
  let trackClass = 'bg-slate-950/60 border-white/5';

  if (isLowTime) {
    labelClass = 'text-rose-400 font-bold animate-pulse';
    timerClass = 'animate-bounce text-rose-400';
    badgeClass = 'bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_8px_rgba(244,63,94,0.35)] animate-pulse';
  } else if (isAmethyst) {
    if (isOwn) {
      labelClass = 'text-indigo-200/90';
      timerClass = 'text-indigo-200 opacity-80';
      badgeClass = 'bg-white/15 text-white border border-white/20';
    } else {
      labelClass = 'text-indigo-700/80 font-medium';
      timerClass = 'text-indigo-600 opacity-90';
      badgeClass = 'bg-indigo-500/10 text-indigo-800 border border-indigo-500/15';
      trackClass = 'bg-slate-200 border-slate-300/30';
    }
  }

  return (
    <div className="mt-3 select-none">
      <div className="flex justify-between items-center mb-1.5 text-[9px] font-mono tracking-wider">
        <span className={`flex items-center gap-1 transition-colors duration-300 ${labelClass}`}>
          <Timer size={10} className={`${timerClass}`} />
          LIFESPAN
        </span>
        <span className={`font-bold tabular-nums px-1.5 py-0.5 rounded transition-all duration-300 ${badgeClass}`}>
          {secondsLeft.toFixed(1)}s
        </span>
      </div>
      <div className={`w-full h-1.5 rounded-full overflow-hidden border relative p-[0.5px] ${trackClass}`}>
        <div
          className={`h-full rounded-full transition-none bg-gradient-to-r ${isLowTime
              ? 'from-amber-500 via-rose-500 to-red-500'
              : 'from-cyan-400 via-indigo-500 to-purple-500'
            }`}
          style={{
            width: `${percent}%`,
            boxShadow: isLowTime
              ? '0 0 10px rgba(244, 63, 94, 0.7)'
              : '0 0 8px rgba(99, 102, 241, 0.45)',
          }}
        />
      </div>
    </div>
  );
}

function QuantumBubbleWrapper({ msg, children }) {
  const [isEvaporating, setIsEvaporating] = useState(false);
  const [isScrambling, setIsScrambling] = useState(false);

  useEffect(() => {
    let active = true;
    const check = () => {
      if (!active) return;
      const remaining = msg.expiresAt - Date.now();
      
      if (remaining <= 1200) {
        setIsScrambling(true);
      }
      if (remaining <= 0) {
        setIsEvaporating(true);
      } else {
        const delay = remaining > 1200 ? remaining - 1200 : remaining;
        setTimeout(check, Math.max(10, delay));
      }
    };
    check();
    return () => {
      active = false;
    };
  }, [msg.expiresAt]);

  return children(isEvaporating, isScrambling);
}

function DecryptText({ text, isScrambling }) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    if (isScrambling) return;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#@$%&*";
    const duration = 600;
    const steps = 15;
    const stepTime = duration / steps;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      if (step >= steps) {
        setDisplayText(text);
        clearInterval(interval);
        return;
      }

      const progress = step / steps;
      const revealedLength = Math.floor(text.length * progress);
      let currentText = text.substring(0, revealedLength);

      for (let i = revealedLength; i < text.length; i++) {
        if (text[i] === ' ') {
          currentText += ' ';
        } else {
          currentText += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      setDisplayText(currentText);
    }, stepTime);

    return () => clearInterval(interval);
  }, [text, isScrambling]);

  useEffect(() => {
    if (!isScrambling) return;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#@$%&*";
    const interval = setInterval(() => {
      let scrambled = "";
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') {
          scrambled += ' ';
        } else {
          scrambled += chars[Math.floor(Math.random() * chars.length)];
        }
      }
      setDisplayText(scrambled);
    }, 50);

    return () => clearInterval(interval);
  }, [isScrambling, text]);

  return <span>{displayText || text}</span>;
}

function ChatContainer() {
  const {
    selectedUser, activeGroup, getMessagesByUserId, getGroupMessages, messages, isMessagesLoading,
    subscribeToTypingEvents, unsubscribeFromTypingEvents,
    deleteMessage, subscribeToDeleteEvents, unsubscribeFromDeleteEvents,
    addReaction, subscribeToReactionEvents, unsubscribeFromReactionEvents,
    markMessagesAsRead, subscribeToReadEvents, unsubscribeFromReadEvents,
    editMessage, subscribeToEditEvents, unsubscribeFromEditEvents,
    subscribeToClearEvents, unsubscribeFromClearEvents,
    togglePinMessage, toggleStarMessage,
    showSearch, setShowSearch,
    showInfoPanel, setShowInfoPanel,
    activePreviewFile, setActivePreviewFile,
    sendMessage, sendGroupMessage, retryQueuedMessage,
    setReplyingTo,
    isTyping, groupTypingUsers,
    hasMoreMessages, isLoadingOlder,
    theme,
    castPollVote, closePoll,
    blockedUsers, openForwardModal,
    registerQuantumListener, unregisterQuantumListener,
    quantumMode,
    allContacts, setSelectedUser,
    searchQuery, setSearchQuery,
  } = userChatStore();
  const { authUser, needsRecovery, dismissedRecovery } = userAuthStore();
  const messageEndRef = useRef(null);
  const lastSelectedIdRef = useRef(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [playbackProgress, setPlaybackProgress] = useState({});
  const [showBirthdayPage, setShowBirthdayPage] = useState(false);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState(null);
  const [activeMediaMsgId, setActiveMediaMsgId] = useState(null);
  const [selectedInfoMessage, setSelectedInfoMessage] = useState(null);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [swipeMsgId, setSwipeMsgId] = useState(null);
  const [swipeDelta, setSwipeDelta] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Guarded unreadBelowCount logic to prevent render loops
  const unreadBelowCountRef = useRef(0);
  const [unreadBelowCount, setUnreadBelowCountState] = useState(0);
  const setUnreadBelowCount = (val) => {
    if (unreadBelowCountRef.current !== val) {
      unreadBelowCountRef.current = val;
      setUnreadBelowCountState(val);
    }
  };

  const [initialUnreadCount, setInitialUnreadCount] = useState(0);
  const currentChatIdRef = useRef(null);

  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const matchIds = useMemo(() => {
    if (!searchQuery || !searchQuery.trim() || !messages) return [];
    const q = searchQuery.toLowerCase();
    return messages
      .filter(msg => msg.text && msg.text.toLowerCase().includes(q))
      .map(msg => msg._id);
  }, [messages, searchQuery]);

  const handleNavigateMatch = (direction) => {
    if (matchIds.length === 0) return;
    let nextIdx = currentMatchIndex;
    if (direction === 'up') {
      nextIdx = currentMatchIndex <= 0 ? matchIds.length - 1 : currentMatchIndex - 1;
    } else {
      nextIdx = currentMatchIndex === matchIds.length - 1 ? 0 : currentMatchIndex + 1;
    }
    setCurrentMatchIndex(nextIdx);
    handleJumpToMessage(matchIds[nextIdx]);
  };

  useEffect(() => {
    if (!searchQuery) {
      setCurrentMatchIndex(-1);
    }
  }, [searchQuery]);

  const activeMenuMessage = useMemo(() => {
    return messages.find(m => m._id === activeMenuMessageId);
  }, [messages, activeMenuMessageId]);

  const activeMenuMessageIsOwn = useMemo(() => {
    if (!activeMenuMessage || !authUser) return false;
    const senderId = activeMenuMessage.senderId?._id || activeMenuMessage.senderId;
    return senderId === authUser._id;
  }, [activeMenuMessage, authUser]);

  // Pagination and Scroll Refs
  const chatContainerRef = useRef(null);
  const prevMessagesLengthRef = useRef(messages.length);
  const oldScrollHeightRef = useRef(0);
  const skipScrollToBottomRef = useRef(false);

  // ─── Ephemeral Quantum Message Local State ───
  const [quantumMessages, setQuantumMessages] = useState([]);

  // Subscribe to quantum events from the store registry
  useEffect(() => {
    const handleQuantumEvent = (msg) => {
      if (msg === null) {
        setQuantumMessages([]);
      } else {
        setQuantumMessages(prev => {
          if (prev.some(m => m._id === msg._id)) {
            return prev;
          }
          return [...prev, { ...msg, expiresAt: Date.now() + 20000 }]; // 20s lifespan
        });
      }
    };

    registerQuantumListener(handleQuantumEvent);

    return () => {
      unregisterQuantumListener(handleQuantumEvent);
    };
  }, [registerQuantumListener, unregisterQuantumListener]);

  // Ticker to clean up expired quantum messages every 1 second (allowing 800ms grace period for evaporation animation)
  useEffect(() => {
    const timer = setInterval(() => {
      setQuantumMessages(prev => {
        const now = Date.now();
        const unexpired = prev.filter(m => m.expiresAt + 800 > now);
        if (unexpired.length !== prev.length) {
          return unexpired;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Clear quantum messages if room changes locally
  useEffect(() => {
    setQuantumMessages([]);
  }, [selectedUser?._id, activeGroup?._id]);



  // ─── Image FLIP Lightbox Morph State ───
  const [morphingState, setMorphingState] = useState({
    active: false,
    msgId: null,
    src: '',
    startRect: null,
    phase: 'idle'
  });

  const handleImageClick = (msgId, event, decryptedUrl) => {
    const imgEl = event.currentTarget.querySelector('img');
    if (!imgEl) {
      setActiveMediaMsgId(msgId);
      return;
    }
    const rect = imgEl.getBoundingClientRect();
    setMorphingState({
      active: true,
      msgId,
      src: decryptedUrl || imgEl.src,
      startRect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      phase: 'entering'
    });

    requestAnimationFrame(() => {
      setTimeout(() => {
        setMorphingState(prev => ({ ...prev, phase: 'animating' }));
      }, 20);
    });

    setTimeout(() => {
      setActiveMediaMsgId(msgId);
      setMorphingState({
        active: false,
        msgId: null,
        src: '',
        startRect: null,
        phase: 'idle'
      });
    }, 370);
  };

  const sortedMessages = useMemo(() => {
    return [...messages, ...quantumMessages].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages, quantumMessages]);

  // Filter messages that contain decrypted/encryptable media (images/videos)
  const mediaMessages = useMemo(() => {
    return messages.filter(msg => {
      if (msg.image) return true;
      if (msg.fileUrl) {
        const isVideo = msg.fileType?.startsWith("video/") || ['mp4', 'webm', 'mov', 'ogg'].some(ext => msg.fileName?.toLowerCase().endsWith(`.${ext}`));
        const isImg = msg.fileType?.startsWith("image/") || ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => msg.fileType?.toLowerCase() === ext || msg.fileName?.toLowerCase().endsWith(`.${ext}`));
        return isVideo || isImg;
      }
      return false;
    });
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
      markMessagesAsRead(activeGroup._id);
    } else if (selectedUser) {
      getMessagesByUserId(selectedUser._id);
      markMessagesAsRead(selectedUser._id);
    }
  }, [activeGroup?._id, selectedUser?._id, getGroupMessages, getMessagesByUserId, markMessagesAsRead]);

  // Reset unread below count when we are at the bottom
  useEffect(() => {
    if (!showScrollButton) {
      setUnreadBelowCount(0);
    }
  }, [showScrollButton]);

  // Increment unread count for messages arriving while scrolled up
  useEffect(() => {
    if (messages.length > 0 && showScrollButton) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg) {
        const senderId = lastMsg.senderId?._id || lastMsg.senderId;
        if (senderId !== authUser?._id) {
          setUnreadBelowCount(unreadBelowCountRef.current + 1);
        }
      }
    }
  }, [messages.length]);

  // Capture initial unread count on active conversation transition
  useEffect(() => {
    const currentChatId = activeGroup?._id || selectedUser?._id;
    if (currentChatId && currentChatId !== currentChatIdRef.current) {
      currentChatIdRef.current = currentChatId;
      const currentChat = activeGroup 
        ? userChatStore.getState().groups?.find(g => g._id === currentChatId)
        : userChatStore.getState().chats?.find(c => c._id === currentChatId);
      setInitialUnreadCount(currentChat?.unreadCount || 0);
    } else if (!currentChatId) {
      currentChatIdRef.current = null;
      setInitialUnreadCount(0);
    }
  }, [activeGroup?._id, selectedUser?._id]);

  useEffect(() => {
    window.jumpToMessage = handleJumpToMessage;
    return () => {
      delete window.jumpToMessage;
    };
  }, [messages, activeGroup?._id, selectedUser?._id]);

  useEffect(() => {
    subscribeToDeleteEvents();
    subscribeToReactionEvents();
    subscribeToReadEvents();
    subscribeToEditEvents();
    subscribeToClearEvents();

    return () => {
      unsubscribeFromDeleteEvents();
      unsubscribeFromReactionEvents();
      unsubscribeFromReadEvents();
      unsubscribeFromEditEvents();
      unsubscribeFromClearEvents();
    };
  }, [selectedUser?._id, activeGroup?._id]);

  // Global click listener to close message options menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (activeMenuMessageId && !e.target.closest('.message-actions-menu-container') && !e.target.closest('.mobile-actions-menu-container')) {
        setActiveMenuMessageId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeMenuMessageId]);

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
    const container = chatContainerRef.current;
    if (container) {
      const currentSelectedId = activeGroup?._id || selectedUser?._id;
      const isSameChat = lastSelectedIdRef.current === currentSelectedId;

      const doScroll = () => {
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: isSameChat ? "smooth" : "auto"
          });
        }
      };

      // Scroll immediately
      doScroll();

      // Scroll with a slight delay to allow rendering/paint to adjust the height
      const timeoutId = setTimeout(doScroll, 50);

      lastSelectedIdRef.current = currentSelectedId;

      return () => clearTimeout(timeoutId);
    }
  }, [messages, activeGroup?._id, selectedUser?._id, isTyping, groupTypingUsers, isMessagesLoading]);

  const handleScroll = async (e) => {
    const container = e.currentTarget;

    const isScrolledUp = container.scrollHeight - container.scrollTop - container.clientHeight > 450;
    if (isScrolledUp !== showScrollButton) {
      setShowScrollButton(isScrolledUp);
    }

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

  const scrollToBottom = () => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
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

    // Final pass: Highlight search query if active
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const escapedQuery = searchQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      const highlightedParts = [];
      
      currentParts.forEach(part => {
        if (typeof part !== 'string') {
          highlightedParts.push(part);
          return;
        }
        
        if (!part.toLowerCase().includes(q)) {
          highlightedParts.push(part);
          return;
        }
        
        const splitText = part.split(regex);
        splitText.forEach((chunk, index) => {
          if (index % 2 === 1) {
            highlightedParts.push(
              <mark 
                key={`highlight-${index}-${Math.random()}`} 
                className="bg-yellow-400/40 text-white rounded px-0.5 font-semibold shadow-[0_0_8px_rgba(250,204,21,0.3)]"
              >
                {chunk}
              </mark>
            );
          } else if (chunk) {
            highlightedParts.push(chunk);
          }
        });
      });
      currentParts = highlightedParts;
    }

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

  const scrollToElementInContainer = (container, targetElement) => {
    if (!container || !targetElement) return;
    const containerRect = container.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();
    const relativeTop = targetRect.top - containerRect.top + container.scrollTop;
    const targetScrollTop = relativeTop - (containerRect.height / 2) + (targetRect.height / 2);
    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  };

  const handleJumpToMessage = async (messageId) => {
    // On mobile devices, the info panel overlays the entire screen.
    // Close the info panel so the user can see the jumped/scrolled message in the chat feed.
    if (window.innerWidth < 640) {
      setShowInfoPanel(false);
    }

    // Set match index if it's a search match
    const matchIdx = matchIds.indexOf(messageId);
    if (matchIdx >= 0) {
      setCurrentMatchIndex(matchIdx);
    }

    let element = document.getElementById(`msg-${messageId}`);
    let bubble = document.getElementById(`msg-bubble-${messageId}`);
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
            bubble = document.getElementById(`msg-bubble-${messageId}`);
            if (element && chatContainerRef.current) {
              scrollToElementInContainer(chatContainerRef.current, element);
              const target = bubble || element;
              target.classList.add('highlight-message');
              setTimeout(() => target.classList.remove('highlight-message'), 1600);
            }
          }, 150);
        } else {
          toast.error("Message could not be located in chat history");
        }
      }
    } else if (chatContainerRef.current) {
      scrollToElementInContainer(chatContainerRef.current, element);
      const target = bubble || element;
      target.classList.add('highlight-message');
      setTimeout(() => target.classList.remove('highlight-message'), 1600);
    }
  };


  return (
    <div className="flex-1 flex overflow-hidden relative h-full animate-fade-in">
      {/* ── MAIN CHAT COLUMN ── */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        <ChatHeader />

        {/* ── SEARCH NAVIGATOR BAR ── */}
        {searchQuery && searchQuery.trim() && (
          <div 
            className="flex items-center justify-between px-4 py-2.5 border-b animate-fade-in flex-shrink-0 z-30"
            style={{
              background: theme === 'amethyst' 
                ? 'rgba(255, 255, 255, 0.92)' 
                : theme === 'midnight'
                  ? 'rgba(10, 10, 10, 0.95)'
                  : 'rgba(18, 18, 38, 0.95)',
              borderColor: 'var(--border-subtle)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search size={14} className="text-[var(--accent-primary)] shrink-0 animate-pulse" />
              <div className="text-xs truncate font-semibold" style={{ color: 'var(--text-primary)' }}>
                <span>Search results for: </span>
                <span className="text-[var(--accent-hover)] font-bold italic">"{searchQuery}"</span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-[10px] font-extrabold opacity-60 tabular-nums uppercase tracking-wider">
                {matchIds.length > 0 ? `${currentMatchIndex >= 0 ? currentMatchIndex + 1 : 0} of ${matchIds.length}` : 'No matches'}
              </span>
              
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-0.5">
                <button
                  onClick={() => handleNavigateMatch('up')}
                  disabled={matchIds.length === 0}
                  className="p-1 hover:bg-white/10 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all border-none bg-transparent cursor-pointer flex items-center justify-center"
                  title="Previous match"
                  style={{ width: '22px', height: '22px' }}
                >
                  <ChevronUp size={15} className="stroke-[2.5]" />
                </button>
                <button
                  onClick={() => handleNavigateMatch('down')}
                  disabled={matchIds.length === 0}
                  className="p-1 hover:bg-white/10 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-all border-none bg-transparent cursor-pointer flex items-center justify-center"
                  title="Next match"
                  style={{ width: '22px', height: '22px' }}
                >
                  <ChevronDown size={15} className="stroke-[2.5]" />
                </button>
              </div>

              <button
                onClick={() => {
                  setSearchQuery("");
                  setCurrentMatchIndex(-1);
                }}
                className="p-1 hover:bg-white/10 rounded-xl text-[var(--text-secondary)] hover:text-red-400 transition-all border-none bg-transparent cursor-pointer flex items-center justify-center"
                title="Close search"
                style={{ width: '24px', height: '24px' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── KEY RECOVERY WARNING BANNER ── */}
        {needsRecovery && dismissedRecovery && (
          <div
            className="px-4 py-2 flex items-center justify-between border-b z-10 animate-fade-in"
            style={{
              background: theme === 'amethyst'
                ? 'linear-gradient(90deg, rgba(239,68,68,0.08) 0%, rgba(245,158,11,0.08) 100%)'
                : 'linear-gradient(90deg, rgba(239,68,68,0.06) 0%, rgba(245,158,11,0.06) 100%)',
              borderColor: theme === 'amethyst'
                ? 'rgba(239,68,68,0.18)'
                : 'rgba(239,68,68,0.12)'
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <LockIcon size={14} className="text-amber-500 flex-shrink-0 animate-pulse" />
              <div className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                <span className="font-semibold">
                  E2EE Key Recovery Pending:{" "}
                </span>
                <span className="text-[var(--text-secondary)]">
                  Chat history cannot be decrypted.
                </span>
              </div>
            </div>
            <button
              onClick={() => userAuthStore.setState({ dismissedRecovery: false })}
              className="text-[10px] uppercase font-bold px-2.5 py-1 rounded transition-all active:scale-95 flex-shrink-0"
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--accent-hover)',
                border: '1px solid rgba(245, 158, 11, 0.25)'
              }}
            >
              Restore Keys
            </button>
          </div>
        )}

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

        {/* ── MESSAGES VIEWPORT CONTAINER ── */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          {/* ── MESSAGES AREA ── */}
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className={`flex-1 overflow-y-auto custom-scrollbar relative ${quantumMode ? 'vault-active' : ''}`}
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

                // Calculate stagger delay for bottom-up entry animation
                const distanceFromBottom = sortedMessages.length - 1 - index;
                const staggerDelay = distanceFromBottom < 10 ? `${distanceFromBottom * 40}ms` : '0ms';

                const isFirstUnread = initialUnreadCount > 0 && index === sortedMessages.length - initialUnreadCount;

                return (
                  <div key={msg._id}>
                    {isFirstUnread && (
                      <div className="flex items-center justify-center my-6 animate-fade-in select-none w-full">
                        <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-red-500/30 to-red-500/30" />
                        <span 
                          className="px-3.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider uppercase shadow-sm border border-red-500/20 backdrop-blur-md"
                          style={{
                            background: theme === 'amethyst' ? '#fef2f2' : 'rgba(239, 68, 68, 0.12)',
                            color: theme === 'amethyst' ? '#dc2626' : '#fca5a5',
                          }}
                        >
                          New Messages
                        </span>
                        <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-red-500/30 to-red-500/30" />
                      </div>
                    )}
                    {/* Date Separator */}
                    {shouldShowDateSeparator(msg, sortedMessages[index - 1]) && (
                      <div className="date-separator my-4">
                        <div className="date-separator-pill">{formatDateSeparator(msg.createdAt)}</div>
                      </div>
                    )}

                    <div
                      className="grid-collapse-wrapper"
                      style={{
                        display: 'grid',
                        gridTemplateRows: msg.isDeleting ? '0fr' : '1fr',
                        transition: 'grid-template-rows 350ms cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      <div style={{ minHeight: 0, overflow: msg.isDeleting ? 'hidden' : 'visible' }}>
                        {/* Message Row */}
                        <div
                          id={`msg-${msg._id}`}
                          className={`flex items-end gap-1.5 transition-all duration-300 rounded-lg group relative
                            ${isOwn ? 'flex-row-reverse' : 'flex-row'}
                            ${isLastInGroup ? 'mb-3' : 'mb-0.5'}
                            ${msg.isDeleting ? 'message-deleting' : ''}
                            message-entering
                          `}
                          style={{
                            animationDelay: staggerDelay,
                          }}
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
                        {(() => {
                          const renderBubbleContent = (isEvaporating, isScrambling) => (
                            <div
                              onTouchStart={(e) => {
                                if (msg.isQuantum) return;
                                setTouchStartX(e.touches[0].clientX);
                                setTouchStartY(e.touches[0].clientY);
                                setSwipeMsgId(msg._id);
                                setSwipeDelta(0);
                              }}
                              onTouchMove={(e) => {
                                if (touchStartX === null || touchStartY === null || swipeMsgId !== msg._id) return;
                                const currentX = e.touches[0].clientX;
                                const currentY = e.touches[0].clientY;
                                const deltaX = currentX - touchStartX;
                                const deltaY = currentY - touchStartY;
                                
                                // Guard against vertical scroll interference:
                                // If vertical movement is dominant, do not start horizontal swipe.
                                if (Math.abs(deltaY) > Math.abs(deltaX) * 0.8) {
                                  return;
                                }
                                
                                if (Math.abs(deltaX) > 10) {
                                  if (e.cancelable) e.preventDefault();
                                  setSwipeDelta(Math.max(0, Math.min(deltaX, 80)));
                                }
                              }}
                              onTouchEnd={() => {
                                if (swipeMsgId === msg._id) {
                                  if (swipeDelta > 55) {
                                    setReplyingTo({
                                      _id: msg._id,
                                      text: msg.text,
                                      image: msg.image,
                                      audioUrl: msg.audioUrl,
                                      fileUrl: msg.fileUrl,
                                      fileName: msg.fileName,
                                      senderId: msg.senderId,
                                    });
                                    const inputEl = document.querySelector('.message-input-bar input');
                                    if (inputEl) inputEl.focus();
                                  }
                                }
                                setTouchStartX(null);
                                setTouchStartY(null);
                                setSwipeMsgId(null);
                                setSwipeDelta(0);
                              }}
                              onClick={(e) => {
                                if (e.target.closest('a, button, img, svg, audio, video, input, textarea')) return;
                                if (msg.isQuantum) return; // Prevent menu on quantum messages
                                setActiveMenuMessageId(activeMenuMessageId === msg._id ? null : msg._id);
                              }}
                              onContextMenu={(e) => {
                                if (msg.isQuantum) e.preventDefault(); // Prevent copy/right-click options on quantum bubbles
                              }}
                              id={`msg-bubble-${msg._id}`}
                              className={`relative cursor-pointer ${isOwn ? 'bubble-own' : 'bubble-other'} ${activeMenuMessageId === msg._id ? 'z-40' : 'z-10'} ${msg.isQuantum ? 'bubble-quantum' : ''} ${isEvaporating ? 'quantum-evaporating' : ''}`}
                              style={{
                                touchAction: 'pan-y',
                                transform: swipeMsgId === msg._id ? `translate3d(${swipeDelta}px, 0, 0)` : 'translate3d(0, 0, 0)',
                                transition: swipeMsgId === msg._id ? 'none' : 'transform 250ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                willChange: swipeMsgId === msg._id ? 'transform' : 'auto',
                                ...(isUserTagged(msg) ? {
                                  border: '1px solid rgba(236,72,153,0.4)',
                                  boxShadow: '0 0 12px rgba(236,72,153,0.15)',
                                  backgroundImage: 'linear-gradient(to bottom right, rgba(236,72,153,0.05), transparent)'
                                } : {}),
                                ...(msg.isAnnouncement ? {
                                   border: theme === 'amethyst' ? '1.5px solid #f59e0b' : '1.5px solid rgba(245, 158, 11, 0.45)',
                                   boxShadow: theme === 'amethyst' ? '0 3px 12px rgba(245, 158, 11, 0.2)' : '0 0 16px rgba(245, 158, 11, 0.25)',
                                   background: theme === 'amethyst'
                                     ? '#fffbeb'
                                     : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(18, 18, 38, 0.95))',
                                   color: theme === 'amethyst' ? '#78350f' : 'inherit'
                                 } : {}),
                                ...(msg.isQuantum ? {
                                  border: theme === 'amethyst'
                                    ? (isOwn ? '1.5px dashed rgba(255, 255, 255, 0.6)' : '1.5px dashed var(--accent-primary, #4338ca)')
                                    : '1.5px dashed var(--accent-primary, #6366f1)',
                                  background: theme === 'amethyst'
                                    ? (isOwn
                                        ? 'linear-gradient(135deg, rgba(67, 56, 202, 0.90), rgba(109, 40, 217, 0.90))'
                                        : 'linear-gradient(135deg, rgba(238, 242, 255, 0.92), rgba(224, 231, 255, 0.92))')
                                    : (isOwn
                                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(124, 58, 237, 0.22))'
                                        : 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(167, 139, 250, 0.12))'),
                                  color: theme === 'amethyst'
                                    ? (isOwn ? '#ffffff' : 'var(--text-primary, #1e1b4b)')
                                    : (isOwn ? '#ffffff' : 'var(--text-primary, #ffffff)'),
                                  animation: isEvaporating
                                    ? 'quantum-evaporate 800ms forwards cubic-bezier(0.4, 0, 0.2, 1)'
                                    : 'quantum-pulse-glow 2.5s infinite ease-in-out',
                                  backdropFilter: 'blur(8px)',
                                  WebkitBackdropFilter: 'blur(8px)',
                                  transformOrigin: isOwn ? 'right bottom' : 'left bottom',
                                } : {})
                              }}
                            >
                              {msg.isQuantum && (
                                <div
                                  className="flex items-center gap-1 mb-1.5"
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: 800,
                                    color: theme === 'amethyst'
                                      ? (isOwn ? '#c7d2fe' : 'var(--accent-primary, #4338ca)')
                                      : (isOwn ? '#a5b4fc' : 'var(--accent-hover, #818cf8)'),
                                    letterSpacing: '0.05em',
                                    fontFamily: 'var(--font-display)'
                                  }}
                                >
                                  <Orbit size={10} className="animate-spin" style={{ animationDuration: '4s' }} />
                                  <span>CO-PRESENCE VAULT</span>
                                </div>
                              )}
                              {msg.isAnnouncement && (
                                <div className="flex items-center gap-1 mb-1.5" style={{ fontSize: '9px', fontWeight: 800, color: '#f59e0b', letterSpacing: '0.05em', fontFamily: 'var(--font-display)' }}>
                                  <Megaphone size={10} className="stroke-[2.5]" />
                                  <span>ANNOUNCEMENT</span>
                                </div>
                              )}

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
                                  onJumpToMessage={async () => {
                                    const replyGroupId = msg.replyTo.groupId;
                                    const currentGroupId = activeGroup?._id;
                                    // Cross-chat jump: if the quoted msg is from a different group, switch first
                                    if (replyGroupId && replyGroupId.toString() !== currentGroupId?.toString()) {
                                      const { groups, setSelectedGroup } = userChatStore.getState();
                                      const targetGroup = groups.find(g => g._id?.toString() === replyGroupId.toString());
                                      if (targetGroup) {
                                        setSelectedGroup(targetGroup);
                                        // Wait for group messages to load, then jump
                                        setTimeout(() => {
                                          if (window.jumpToMessage) window.jumpToMessage(msg.replyTo._id);
                                        }, 600);
                                      }
                                    } else {
                                      handleJumpToMessage(msg.replyTo._id);
                                    }
                                  }}
                                />
                              )}

                              {/* Floating Actions Trigger (Three dots + Quick Forward) */}
                              {!msg.isQuantum && (
                                <div
                                  className={`absolute top-1/2 -translate-y-1/2 z-30 transition-all duration-200 flex items-center gap-1.5
                                    ${isOwn ? 'left-[-62px]' : 'right-[-62px]'} 
                                    ${activeMenuMessageId === msg._id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                >
                                  {/* Quick Forward Button (excluding polls and call info) */}
                                  {!(msg.poll && msg.poll.question) && !msg.callInfo && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openForwardModal(msg, "message");
                                      }}
                                      className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg border border-[var(--border-subtle)] bg-[var(--bg-glass-panel)] text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)] transition-all active:scale-90"
                                      style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                                      title="Share Message"
                                    >
                                      <Send size={11} className="stroke-[2.5]" />
                                    </button>
                                  )}

                                  <div className="relative message-actions-menu-container">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuMessageId(activeMenuMessageId === msg._id ? null : msg._id);
                                      }}
                                      className="w-6 h-6 rounded-full flex items-center justify-center shadow-lg border border-[var(--border-subtle)] bg-[var(--bg-glass-panel)] text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)] transition-all active:scale-90"
                                      style={{ backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
                                      title="Message Actions"
                                    >
                                      <MoreHorizontal size={13} className="stroke-[2.5]" />
                                    </button>

                                    {activeMenuMessageId === msg._id && (
                                      <div
                                        className={`hidden sm:block sm:absolute sm:inset-auto sm:top-full sm:z-50 sm:min-w-[150px] sm:rounded-2xl sm:p-1.5 sm:border sm:shadow-xl sm:pb-1.5 sm:mt-1.5 sm:animate-fade-in
                                          ${isOwn ? 'sm:right-0 sm:left-auto sm:origin-top-right' : 'sm:left-0 sm:right-auto sm:origin-top-left'}`}
                                        style={{
                                          background: theme === 'amethyst'
                                            ? 'rgba(255, 255, 255, 0.98)'
                                            : theme === 'midnight'
                                              ? 'rgba(10, 10, 10, 0.97)'
                                              : 'rgba(18, 18, 38, 0.97)',
                                          borderColor: 'var(--border-medium)',
                                          backdropFilter: 'blur(24px)',
                                          WebkitBackdropFilter: 'blur(24px)',
                                        }}
                                      >
                                        {/* Quick Reaction Emojis bar */}
                                        <div className="flex items-center justify-around border-b border-[var(--border-subtle)] pb-2 mb-1.5 px-1 pt-0.5">
                                          {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                                            <button
                                              key={emoji}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                addReaction(msg._id, emoji);
                                                setActiveMenuMessageId(null);
                                              }}
                                              className="hover:scale-135 active:scale-95 transition-transform text-sm px-1.5 py-0.5"
                                            >
                                              {emoji}
                                            </button>
                                          ))}
                                        </div>

                                        {/* Reply Option */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuMessageId(null);
                                            setReplyingTo({
                                              _id: msg._id,
                                              text: msg.text,
                                              image: msg.image,
                                              audioUrl: msg.audioUrl,
                                              fileUrl: msg.fileUrl,
                                              fileName: msg.fileName,
                                              senderId: msg.senderId,
                                            });
                                          }}
                                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors text-left"
                                        >
                                          <ReplyIcon size={12} className="text-indigo-400" />
                                          <span>Reply</span>
                                        </button>

                                        {/* Reply Privately — only in group chats, only for other people's messages */}
                                        {activeGroup && !isOwn && (() => {
                                          const senderId = msg.senderId?._id || msg.senderId;
                                          const senderContact = allContacts?.find(c => (c._id || c).toString() === senderId?.toString());
                                          if (!senderContact) return null;
                                          return (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveMenuMessageId(null);
                                                // Switch to the sender's DM and pre-fill the message as a reply quote
                                                setSelectedUser(senderContact);
                                                setReplyingTo({
                                                  _id: msg._id,
                                                  text: msg.text,
                                                  image: msg.image,
                                                  audioUrl: msg.audioUrl,
                                                  fileUrl: msg.fileUrl,
                                                  fileName: msg.fileName,
                                                  senderId: msg.senderId,
                                                });
                                              }}
                                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors text-left"
                                              title={`Reply privately to ${senderContact.fullName}`}
                                            >
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="m9 10 3-3 3 3"/><path d="M12 7v6"/></svg>
                                              <span className="text-emerald-400">Reply Privately</span>
                                            </button>
                                          );
                                        })()}

                                        {/* Star Option */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuMessageId(null);
                                            toggleStarMessage(msg._id);
                                          }}
                                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors text-left"
                                        >
                                          <StarIcon
                                            size={12}
                                            className={msg.starredBy?.includes(authUser._id) ? "text-amber-500 fill-amber-500" : "text-amber-400"}
                                          />
                                          <span>{msg.starredBy?.includes(authUser._id) ? "Unstar" : "Star"}</span>
                                        </button>

                                        {/* Pin Option */}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuMessageId(null);
                                            togglePinMessage(msg._id);
                                          }}
                                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors text-left"
                                        >
                                          <PinIcon
                                            size={12}
                                            className={msg.isPinned ? "text-indigo-400" : "text-slate-400"}
                                            style={{ transform: msg.isPinned ? 'rotate(45deg)' : 'none' }}
                                          />
                                          <span>{msg.isPinned ? "Unpin" : "Pin"}</span>
                                        </button>

                                        {/* Forward/Share Option (excluding polls) */}
                                        {!(msg.poll && msg.poll.question) && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveMenuMessageId(null);
                                              openForwardModal(msg, "message");
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors text-left"
                                          >
                                            <CornerUpRight size={12} className="text-slate-400" />
                                            <span>Share</span>
                                          </button>
                                        )}

                                        {/* Edit Option (if own text message) */}
                                        {isOwn && msg.text && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveMenuMessageId(null);
                                              setEditingMessageId(msg._id);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors text-left"
                                          >
                                            <EditIcon size={12} className="text-blue-400" />
                                            <span>Edit</span>
                                          </button>
                                        )}

                                        {/* Message Info Option (only in group chats) */}
                                        {activeGroup && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveMenuMessageId(null);
                                              setSelectedInfoMessage(msg);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors text-left border-b border-white/5 pb-1.5 mb-1"
                                          >
                                            <InfoIcon size={12} className="text-indigo-400" />
                                            <span>Message Info</span>
                                          </button>
                                        )}

                                        {/* Delete Option (if own message) */}
                                        {isOwn && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveMenuMessageId(null);
                                              deleteMessage(msg._id);
                                            }}
                                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-left border-t border-white/5 mt-1 pt-1.5"
                                          >
                                            <Trash2Icon size={12} className="text-red-400" />
                                            <span>Delete</span>
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {msg.callInfo ? (
                                <CallLogCard msg={msg} isOwn={isOwn} />
                              ) : (msg.contentType === "contact" || msg.sharedContact) ? (
                                <ContactCardBubble msg={msg} isOwn={isOwn} />
                              ) : (
                                <>
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
                                            onClick={(e) => handleImageClick(msg._id, e, url)}
                                            className="mb-1.5 cursor-pointer hover:opacity-90 transition-opacity"
                                            style={{
                                              borderRadius: '20px',
                                              padding: '8px',
                                              background: isOwn ? 'rgba(0,0,0,0.15)' : 'var(--bg-bubble-other)',
                                              border: `1px solid ${isOwn ? 'rgba(255,255,255,0.1)' : 'var(--border-bubble-other)'}`,
                                              boxShadow: isOwn ? 'none' : 'var(--shadow-bubble-other)',
                                              opacity: (morphingState.active && morphingState.msgId === msg._id) ? 0 : 1,
                                            }}
                                          >
                                            <img
                                              src={url}
                                              alt="Attachment"
                                              className="block object-cover"
                                              style={{
                                                maxWidth: '220px',
                                                maxHeight: '280px',
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
                                              onClick={() => setActiveMediaMsgId(msg._id)}
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
                                            onClick={(e) => {
                                              if (isImg) {
                                                handleImageClick(msg._id, e, url);
                                              } else {
                                                setActivePreviewFile({
                                                  url,
                                                  name: msg.fileName || 'Document',
                                                  type: isPdf ? 'pdf' : 'other'
                                                });
                                              }
                                            }}
                                            className="mb-1.5 flex items-center gap-2.5 p-3 cursor-pointer hover:opacity-90 transition-all duration-200"
                                            style={{
                                              borderRadius: '16px',
                                              background: isOwn ? 'rgba(0,0,0,0.18)' : 'var(--bg-bubble-other)',
                                              border: `1px solid ${isOwn ? 'rgba(255,255,255,0.1)' : 'var(--border-bubble-other)'}`,
                                              boxShadow: isOwn ? 'none' : 'var(--shadow-bubble-other)',
                                              opacity: (morphingState.active && morphingState.msgId === msg._id) ? 0 : 1,
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
                                                <p style={{ fontSize: '9px', opacity: 0.5, fontVariantNumeric: 'tabular-nums', marginTop: '1px' }}>
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
                                      {msg.isQuantum ? <DecryptText text={msg.text} isScrambling={isScrambling} /> : renderMessageText(msg.text)}
                                    </p>
                                  )}

                                  {msg.isQuantum && (
                                    <QuantumProgressBar expiresAt={msg.expiresAt} isOwn={isOwn} />
                                  )}

                                  {/* Poll Card */}
                                  {msg.poll && msg.poll.question && (
                                    <PollCard msg={msg} isOwn={isOwn} />
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
                                </>
                              )}

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
                                  <LockIcon size={9} className="opacity-40 hover:opacity-85 transition-opacity cursor-help mr-0.5 select-none text-zinc-550 inline" title="End-to-End Encrypted" />
                                )}
                                {msg.isEdited && (
                                  <span style={{ fontSize: '9px', opacity: 0.45 }}>edited ·</span>
                                )}
                                <span
                                   className="relative group/time cursor-default"
                                   style={{ fontSize: '9px', opacity: 0.5, fontVariantNumeric: 'tabular-nums' }}
                                 >
                                   {formatMessageTimestamp(msg.createdAt)}
                                   <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/time:opacity-100 transition-opacity text-[10px] py-1 px-2 rounded-lg whitespace-nowrap shadow-xl z-50 font-semibold backdrop-blur-md border"
                                         style={{
                                           background: theme === 'amethyst' ? '#ffffff' : 'rgba(18, 18, 38, 0.95)',
                                           color: theme === 'amethyst' ? '#312e81' : '#ffffff',
                                           borderColor: theme === 'amethyst' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                         }}>
                                     {formatFullDateTime(msg.createdAt)}
                                   </span>
                                 </span>
                                {isOwn && (
                                  msg.isPending && !msg.isFailed ? (
                                    <span className="inline-block animate-spin text-slate-400 mr-0.5" title="Sending...">
                                      <Loader2Icon size={10} className="stroke-[2.5]" />
                                    </span>
                                  ) : msg.isFailed ? (
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        retryQueuedMessage(msg._id);
                                      }}
                                      className="inline-block text-red-500 font-extrabold cursor-pointer select-none hover:scale-115 transition-transform active:scale-95 mr-0.5"
                                      title="Failed to send. Click to retry."
                                    >
                                      (!)
                                    </span>
                                  ) : !activeGroup ? (
                                    <span
                                      className="transition-all duration-300 ease-out inline-flex"
                                      style={{
                                        color: isMessageRead(msg) 
                                          ? (isOwn ? 'rgba(255,255,255,0.8)' : 'var(--accent-primary)') 
                                          : 'rgba(255, 255, 255, 0.45)',
                                        opacity: isMessageRead(msg) ? 0.9 : 0.45
                                      }}
                                    >
                                      {isMessageRead(msg) ? (
                                        <CheckCheckIcon size={11} title="Read" />
                                      ) : (
                                        <CheckIcon size={11} title="Sent" />
                                      )}
                                    </span>
                                  ) : null
                                )}
                              </div>

                              {/* Reactions */}
                              <MessageReactions
                                message={msg}
                                onAddReaction={addReaction}
                                authUserId={authUser._id}
                              />
                            </div>
                          );

                          const bubbleElement = editingMessageId === msg._id ? (
                            <MessageEditor
                              message={msg}
                              onSave={handleEditMessage}
                              onCancel={() => setEditingMessageId(null)}
                            />
                          ) : msg.isQuantum ? (
                            <QuantumBubbleWrapper msg={msg}>
                              {(isEvaporating, isScrambling) => renderBubbleContent(isEvaporating, isScrambling)}
                            </QuantumBubbleWrapper>
                          ) : (
                            renderBubbleContent(false, false)
                          );

                          return (
                            <div className="relative w-full flex items-center">
                              {swipeMsgId === msg._id && swipeDelta > 15 && (
                                <div 
                                  className="absolute flex items-center justify-center transition-all z-0"
                                  style={{
                                    left: '-32px',
                                    opacity: Math.min(1, (swipeDelta - 15) / 40),
                                    transform: `scale(${Math.min(1.15, 0.7 + (swipeDelta / 130))})`,
                                    color: 'var(--accent-primary)',
                                  }}
                                >
                                  <ReplyIcon size={16} className="animate-pulse" />
                                </div>
                              )}
                              {bubbleElement}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
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

        {quantumMode && (
          <>
            {/* HUD Corner Brackets */}
            <div className="vault-hud-corner absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-indigo-500/40 pointer-events-none z-20 animate-pulse" />
            <div className="vault-hud-corner absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-indigo-500/40 pointer-events-none z-20 animate-pulse" />
            <div className="vault-hud-corner absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-indigo-500/40 pointer-events-none z-20 animate-pulse" />
            <div className="vault-hud-corner absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-indigo-500/40 pointer-events-none z-20 animate-pulse" />

            {/* Secure HUD status indicator */}
            <div className="vault-hud-badge absolute top-4 left-10 text-[9px] font-mono tracking-widest pointer-events-none z-20 select-none flex items-center gap-1.5 px-2.5 py-0.5 rounded border backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
              <span>CO-PRESENCE VAULT MODE : SECURE SYSTEM CHANNEL</span>
            </div>
          </>
        )}

        {showScrollButton && (
          <div className="absolute bottom-5 right-5 z-30">
            <button
              onClick={scrollToBottom}
              className="scroll-bottom-btn w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 border"
              style={{
                background: theme === 'amethyst'
                  ? 'linear-gradient(135deg, #4338ca, #6d28d9)'
                  : 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                borderColor: 'var(--border-accent)',
                boxShadow: theme === 'amethyst'
                  ? '0 4px 14px rgba(67, 56, 202, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                  : '0 4px 14px rgba(99, 102, 241, 0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
              }}
              title="Scroll to bottom"
            >
              <ArrowDown size={18} className="stroke-[2.5]" />
            </button>
            {unreadBelowCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center border-2 border-[var(--bg-surface)] shadow-md select-none animate-bounce">
                {unreadBelowCount}
              </span>
            )}
          </div>
        )}
      </div>

        {/* ── INPUT ── */}
        {(() => {
          const isBlockedByThem = !activeGroup && (selectedUser?.blockedByThem || selectedUser?.blockedUsers?.includes(authUser?._id));
          const isBlockedByMe = !activeGroup && blockedUsers?.some(u => (u._id || u) === selectedUser?._id);

          if (isBlockedByMe) {
            return (
              <div className="p-4 border-t flex items-center justify-center text-xs font-semibold text-red-500/80 bg-red-500/5 backdrop-blur-sm select-none gap-1.5" style={{ borderColor: 'var(--border-subtle)', fontFamily: 'var(--font-body)' }}>
                <LockIcon size={12} className="text-red-500" />
                <span>You have blocked this user. Unblock them to send messages.</span>
              </div>
            );
          }

          if (isBlockedByThem) {
            return (
              <div className="p-4 border-t flex items-center justify-center text-xs font-semibold text-red-500/80 bg-red-500/5 backdrop-blur-sm select-none gap-1.5" style={{ borderColor: 'var(--border-subtle)', fontFamily: 'var(--font-body)' }}>
                <LockIcon size={12} className="text-red-500" />
                <span>You have been blocked by this user.</span>
              </div>
            );
          }

          return <MessageInput />;
        })()}
      </div>

      {/* ── SEARCH SIDEBAR ── */}
      {showSearch && (
        <div
          className="w-full sm:w-[320px] md:w-[340px] border-l flex flex-col flex-shrink-0 animate-slide-in absolute sm:relative inset-0 sm:inset-auto z-40 sm:z-auto"
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

      {/* ── MEDIA GALLERY LIGHTBOX ── */}
      {activeMediaMsgId && (
        <MediaGalleryLightbox
          mediaMessages={mediaMessages}
          activeMessageId={activeMediaMsgId}
          onClose={() => setActiveMediaMsgId(null)}
        />
      )}



      {/* ── IMAGE LIGHTBOX FLIP MORPH CLONE ── */}
      {morphingState.active && (
        <div
          className="fixed inset-0 z-[9998] pointer-events-none flex items-center justify-center bg-black/0 transition-all duration-350 ease-out"
          style={{
            backgroundColor: morphingState.phase === 'animating' ? 'rgba(0, 0, 0, 0.75)' : 'rgba(0, 0, 0, 0)',
            backdropFilter: morphingState.phase === 'animating' ? 'blur(10px)' : 'blur(0px)',
            WebkitBackdropFilter: morphingState.phase === 'animating' ? 'blur(10px)' : 'blur(0px)',
          }}
        >
          <img
            src={morphingState.src}
            className="fixed transition-all duration-350 ease-out object-contain"
            style={
              morphingState.phase === 'entering'
                ? {
                    left: `${morphingState.startRect.left}px`,
                    top: `${morphingState.startRect.top}px`,
                    width: `${morphingState.startRect.width}px`,
                    height: `${morphingState.startRect.height}px`,
                    borderRadius: '20px',
                    transform: 'translate3d(0, 0, 0)',
                  }
                : {
                    left: '50%',
                    top: '50%',
                    width: '100vw',
                    height: '74vh',
                    transform: 'translate3d(-50%, -50%, 0) scale(1)',
                    borderRadius: '0px',
                  }
            }
          />
        </div>
      )}

      {/* ── BIRTHDAY CELEBRATION PAGE OVERLAY ── */}
      {showBirthdayPage && (
        <BirthdayPage
          user={selectedUser}
          onClose={() => setShowBirthdayPage(false)}
          onSendWish={handleSendWish}
        />
      )}

      {/* ── GROUP MESSAGE INFO OVERLAY ── */}
      {selectedInfoMessage && (
        <GroupMessageInfoModal
          message={selectedInfoMessage}
          group={activeGroup}
          onClose={() => setSelectedInfoMessage(null)}
        />
      )}

      {/* ── MOBILE ACTIONS BOTTOM SHEET ── */}
      {activeMenuMessageId && activeMenuMessage && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div
            className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-[2px] block sm:hidden"
            onClick={(e) => {
              e.stopPropagation();
              setActiveMenuMessageId(null);
            }}
          />

          {/* Bottom Sheet */}
          <div
            className="fixed inset-x-0 bottom-0 z-[1000] p-4 pb-6 rounded-t-3xl border-t border-[var(--border-medium)] shadow-2xl animate-slide-up block sm:hidden mobile-actions-menu-container"
            style={{
              background: theme === 'amethyst'
                ? 'rgba(255, 255, 255, 0.98)'
                : theme === 'midnight'
                  ? 'rgba(10, 10, 10, 0.97)'
                  : 'rgba(18, 18, 38, 0.97)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            {/* Mobile Grab Handle */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />

            {/* Quick Reaction Emojis bar for Mobile */}
            <div className="flex items-center justify-around border-b border-[var(--border-subtle)] pb-3 mb-3 px-2">
              {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    addReaction(activeMenuMessage._id, emoji);
                    setActiveMenuMessageId(null);
                  }}
                  className="active:scale-75 transition-transform text-2xl px-1.5 py-0.5"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Reply Option */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuMessageId(null);
                setReplyingTo({
                  _id: activeMenuMessage._id,
                  text: activeMenuMessage.text,
                  image: activeMenuMessage.image,
                  audioUrl: activeMenuMessage.audioUrl,
                  fileUrl: activeMenuMessage.fileUrl,
                  fileName: activeMenuMessage.fileName,
                  senderId: activeMenuMessage.senderId,
                });
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors text-left"
            >
              <ReplyIcon size={16} className="text-indigo-400" />
              <span>Reply</span>
            </button>

            {/* Star Option */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuMessageId(null);
                toggleStarMessage(activeMenuMessage._id);
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors text-left"
            >
              <StarIcon
                size={16}
                className={activeMenuMessage.starredBy?.includes(authUser._id) ? "text-amber-500 fill-amber-500" : "text-amber-400"}
              />
              <span>{activeMenuMessage.starredBy?.includes(authUser._id) ? "Unstar" : "Star"}</span>
            </button>

            {/* Pin Option */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuMessageId(null);
                togglePinMessage(activeMenuMessage._id);
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors text-left"
            >
              <PinIcon
                size={16}
                className={activeMenuMessage.isPinned ? "text-indigo-400" : "text-slate-400"}
                style={{ transform: activeMenuMessage.isPinned ? 'rotate(45deg)' : 'none' }}
              />
              <span>{activeMenuMessage.isPinned ? "Unpin" : "Pin"}</span>
            </button>

            {/* Forward/Share Option */}
            {!(activeMenuMessage.poll && activeMenuMessage.poll.question) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuMessageId(null);
                  openForwardModal(activeMenuMessage, "message");
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors text-left"
              >
                <CornerUpRight size={16} className="text-slate-400" />
                <span>Share</span>
              </button>
            )}

            {/* Edit Option */}
            {activeMenuMessageIsOwn && activeMenuMessage.text && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuMessageId(null);
                  setEditingMessageId(activeMenuMessage._id);
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors text-left"
              >
                <EditIcon size={16} className="text-blue-400" />
                <span>Edit</span>
              </button>
            )}

            {/* Message Info Option */}
            {activeGroup && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuMessageId(null);
                  setSelectedInfoMessage(activeMenuMessage);
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-colors text-left"
              >
                <InfoIcon size={16} className="text-indigo-400" />
                <span>Message Info</span>
              </button>
            )}

            {/* Delete Option */}
            {activeMenuMessageIsOwn && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuMessageId(null);
                  deleteMessage(activeMenuMessage._id);
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-left border-t border-white/5 mt-1 pt-2"
              >
                <Trash2Icon size={16} className="text-red-400" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ChatContainer;