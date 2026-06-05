import { useEffect, useRef, useState } from "react";
import { userAuthStore } from "../store/userAuthStore";
import { userChatStore } from "../store/userChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageReactions from "./MessageReactions";
import MessageEditor from "./MessageEditor";
import SearchBar from "./SearchBar";
import { Trash2Icon, EditIcon, DownloadIcon, PlayIcon, PauseIcon, CheckCheckIcon, CheckIcon } from "lucide-react";
import { formatMessageTime, formatFullDateTime, formatDateSeparator, isSameDay } from "../lib/timeUtils";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToTypingEvents,
    unsubscribeFromTypingEvents,
    deleteMessage,
    subscribeToDeleteEvents,
    unsubscribeFromDeleteEvents,
    addReaction,
    subscribeToReactionEvents,
    unsubscribeFromReactionEvents,
    markMessagesAsRead,
    subscribeToReadEvents,
    unsubscribeFromReadEvents,
    editMessage,
    subscribeToEditEvents,
    unsubscribeFromEditEvents,
    showSearch,
    setShowSearch,
  } = userChatStore();
  const { authUser } = userAuthStore();
  const messageEndRef = useRef(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [playbackProgress, setPlaybackProgress] = useState({});
 
  useEffect(() => {
    getMessagesByUserId(selectedUser._id);
    subscribeToTypingEvents();
    subscribeToDeleteEvents();
    subscribeToReactionEvents();
    subscribeToReadEvents();
    subscribeToEditEvents();
    markMessagesAsRead(selectedUser._id);
 
    return () => {
      unsubscribeFromTypingEvents();
      unsubscribeFromDeleteEvents();
      unsubscribeFromReactionEvents();
      unsubscribeFromReadEvents();
      unsubscribeFromEditEvents();
    };
  }, [selectedUser._id]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleEditMessage = (messageId, newText) => {
    editMessage(messageId, newText);
    setEditingMessageId(null);
  };

  const isMessageRead = (msg) => {
    if (msg.senderId !== authUser._id) return false;
    return msg.readBy?.some(r => r.userId === selectedUser._id);
  };

  const toggleAudioPlayback = (audioId, audioRef) => {
    if (!audioRef) {
      console.error(`Audio element with ID audio-${audioId} not found.`);
      return;
    }
    if (playingAudio === audioId) {
      audioRef.pause();
      setPlayingAudio(null);
    } else {
      if (playingAudio) {
        document.querySelectorAll('audio').forEach(a => {
          a.pause();
        });
      }
      audioRef.muted = false;
      audioRef.volume = 1.0;
      audioRef.play()
        .then(() => {
          setPlayingAudio(audioId);
        })
        .catch(err => {
          console.error("Audio playback failed:", err);
          setPlayingAudio(null);
        });
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

  return (
    <div className="flex-1 flex overflow-hidden relative h-full">
      {/* Left/Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        <ChatHeader />
        <div className="flex-1 px-6 overflow-y-auto py-8 custom-scrollbar">
          {messages.length > 0 && !isMessagesLoading ?
            (<div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, index) => (
                <div key={msg._id}>
                  {/* Date Separator */}
                  {shouldShowDateSeparator(msg, messages[index - 1]) && (
                    <div className="flex items-center justify-center my-4">
                      <div className="bg-slate-800/50 backdrop-blur-sm px-4 py-1.5 rounded-full border border-slate-700/50">
                        <span className="text-xs font-medium text-slate-400">
                          {formatDateSeparator(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div 
                    id={`msg-${msg._id}`}
                    className={`chat ${msg.senderId === authUser._id ? "chat-end" : "chat-start"} mb-4 transition-all duration-300 rounded-lg p-1`}
                  >
                    <div className="chat-image avatar">
                      <div className="size-10 rounded-full border border-white/10">
                        <img
                          src={msg.senderId === authUser._id ? authUser.profilePic || "/avatar.png" : selectedUser.profilePic || "/avatar.png"}
                          alt="avatar"
                        />
                      </div>
                    </div>

                    <div className={`chat-header mb-1 opacity-70 text-xs flex items-center gap-2`}>
                      <span
                        className="cursor-help"
                        title={formatFullDateTime(msg.createdAt)}
                      >
                        {formatMessageTime(msg.createdAt)}
                      </span>
                      {msg.isEdited && <span className="text-slate-500">(edited)</span>}
                      {msg.senderId === authUser._id && (
                        isMessageRead(msg) ?
                          <CheckCheckIcon size={14} className="text-cyan-400" title="Read" /> :
                          <CheckIcon size={14} className="text-slate-500" title="Sent" />
                      )}
                    </div>

                    {editingMessageId === msg._id ? (
                      <MessageEditor
                        message={msg}
                        onSave={handleEditMessage}
                        onCancel={() => setEditingMessageId(null)}
                      />
                    ) : (
                      <div className={`chat-bubble relative p-3 shadow-lg group ${msg.senderId === authUser._id
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none border border-cyan-500/20"
                        : "bg-slate-800/80 backdrop-blur-sm text-slate-100 rounded-bl-none border border-slate-700/50"
                        }`}>

                        {/* Action Buttons (Only for own messages) */}
                        {msg.senderId === authUser._id && (
                          <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {msg.text && (
                              <button
                                onClick={() => setEditingMessageId(msg._id)}
                                className="bg-blue-500 text-white rounded-full p-1 shadow-sm hover:bg-blue-600"
                                title="Edit message"
                              >
                                <EditIcon size={12} />
                              </button>
                            )}
                            <button
                              onClick={() => deleteMessage(msg._id)}
                              className="bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600"
                              title="Delete message"
                            >
                              <Trash2Icon size={12} />
                            </button>
                          </div>
                        )}

                        {/* Image */}
                        {msg.image && (
                          <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                            <img src={msg.image} alt="Attachment" className="max-w-[250px] max-h-[250px] object-cover" />
                          </div>
                        )}

                        {/* File Attachment */}
                        {msg.fileUrl && (
                          <div className="mb-2 bg-slate-900/50 rounded-lg p-3 border border-white/10">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{msg.fileName || 'File'}</p>
                                <p className="text-xs opacity-70">{msg.fileType?.toUpperCase()} • {(msg.fileSize / 1024).toFixed(1)} KB</p>
                              </div>
                              <a
                                href={msg.fileUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
                                title="Download file"
                              >
                                <DownloadIcon size={16} />
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Audio Message */}
                        {msg.audioUrl && (
                          <div className="mb-2 bg-slate-900/50 rounded-lg p-3 border border-white/10 min-w-[240px]">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  const audio = document.getElementById(`audio-${msg._id}`);
                                  toggleAudioPlayback(msg._id, audio);
                                }}
                                className="p-2 bg-cyan-600 hover:bg-cyan-700 rounded-full transition-colors text-white"
                              >
                                {playingAudio === msg._id ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
                              </button>
                              <audio
                                id={`audio-${msg._id}`}
                                src={msg.audioUrl}
                                preload="auto"
                                controls={false}
                                onTimeUpdate={(e) => {
                                  const audio = e.currentTarget;
                                  const progress = (audio.currentTime / (audio.duration || 1)) * 100;
                                  setPlaybackProgress(prev => ({
                                    ...prev,
                                    [msg._id]: progress
                                  }));
                                }}
                                onEnded={() => {
                                  setPlayingAudio(null);
                                  setPlaybackProgress(prev => ({
                                    ...prev,
                                    [msg._id]: 0
                                  }));
                                }}
                                className="sr-only"
                              />
                              <div className="flex-1 min-w-0">
                                {/* Waveform Design Seekbar (Interactive) */}
                                <div 
                                  className="flex items-center gap-0.5 h-6 mb-1 cursor-pointer select-none"
                                  onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const clickX = e.clientX - rect.left;
                                    const percent = clickX / rect.width;
                                    const audio = document.getElementById(`audio-${msg._id}`);
                                    if (audio && audio.duration && isFinite(audio.duration)) {
                                      audio.currentTime = percent * audio.duration;
                                      setPlaybackProgress(prev => ({
                                        ...prev,
                                        [msg._id]: percent * 100
                                      }));
                                    }
                                  }}
                                >
                                  {[10, 20, 16, 28, 12, 22, 18, 30, 24, 10, 22, 14, 28, 16, 20, 12, 18, 10].map((h, i) => {
                                    const barProgress = (i / 18) * 100;
                                    const isActive = (playbackProgress[msg._id] || 0) >= barProgress;
                                    return (
                                      <div
                                        key={i}
                                        className={`w-[3px] rounded-full transition-all duration-100 ${
                                          isActive ? "bg-cyan-400" : "bg-slate-600"
                                        }`}
                                        style={{ height: `${h}px` }}
                                      />
                                    );
                                  })}
                                </div>
                                <p className="text-[10px] opacity-70 font-mono">
                                  {msg.audioDuration ? formatDuration(msg.audioDuration) : '0:00'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Text */}
                        {msg.text && <p className="leading-relaxed">{msg.text}</p>}

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
              ))}
              <div ref={messageEndRef} className="h-4" />
            </div>) : isMessagesLoading ? (<MessagesLoadingSkeleton />) :
              (<NoChatHistoryPlaceholder name={selectedUser.fullName} />)}

        </div>
        <MessageInput />
      </div>

      {/* Right Search Sidebar (WhatsApp Style) */}
      {showSearch && (
        <div className="w-[340px] border-l border-white/5 bg-slate-900/50 backdrop-blur-xl h-full flex flex-col flex-shrink-0 animate-slide-in relative z-20">
          <SearchBar onClose={() => setShowSearch(false)} />
        </div>
      )}
    </div>
  )
}

export default ChatContainer