import { useEffect, useRef, useState } from "react";
import { userAuthStore } from "../store/userAuthStore";
import { userChatStore } from "../store/userChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";


import { Trash2Icon } from "lucide-react";

function ChatContainer() {
    const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    subscribeToTypingEvents,
    unsubscribeFromTypingEvents,
    deleteMessage,
    subscribeToDeleteEvents,
    unsubscribeFromDeleteEvents,
  } = userChatStore();
  const { authUser } = userAuthStore();
  const messageEndRef = useRef(null);

  const [selectedImg, setSelectedImg] = useState(null);

  useEffect(()=> {
    getMessagesByUserId(selectedUser._id);
    subscribeToMessages();
    subscribeToTypingEvents();
    subscribeToDeleteEvents();

    return () => {
      unsubscribeFromMessages();
      unsubscribeFromTypingEvents();
      unsubscribeFromDeleteEvents();
    };
  }, [selectedUser._id, getMessagesByUserId, subscribeToMessages, unsubscribeFromMessages, subscribeToTypingEvents, unsubscribeFromTypingEvents, subscribeToDeleteEvents, unsubscribeFromDeleteEvents]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);
  return (
    <>
      <ChatHeader />
      <div className="flex-1 px-6 overflow-y-auto py-8">
        {messages.length > 0 && !isMessagesLoading ?
          (<div className="max-w-3xl mx-auto space-y-6">
            {messages.map(msg => (
              <div key={msg._id} className={`chat ${msg.senderId === authUser._id ? "chat-end" : "chat-start"} mb-4`}>
                <div className="chat-image avatar">
                  <div className="size-10 rounded-full border border-white/10">
                    <img
                      src={msg.senderId === authUser._id ? authUser.profilePic || "/avatar.png" : selectedUser.profilePic || "/avatar.png"}
                      alt="avatar"
                    />
                  </div>
                </div>

                <div className={`chat-header mb-1 opacity-70 text-xs`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                <div className={`chat-bubble relative p-3 shadow-lg group ${msg.senderId === authUser._id
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none border border-cyan-500/20"
                  : "bg-slate-800/80 backdrop-blur-sm text-slate-100 rounded-bl-none border border-slate-700/50"
                  }`}>

                  {/* Delete Button (Only for own messages) */}
                  {msg.senderId === authUser._id && (
                    <button
                      onClick={() => deleteMessage(msg._id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-600"
                      title="Delete message"
                    >
                      <Trash2Icon size={12} />
                    </button>
                  )}

                  {msg.image && (
                    <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                      <img src={msg.image} alt="Attachment" className="max-w-[250px] max-h-[250px] object-cover" />
                    </div>
                  )}

                  {msg.text && <p className="leading-relaxed">{msg.text}</p>}
                </div>
              </div>
            ))}
            <div ref={messageEndRef} className="h-4" />
          </div>) : isMessagesLoading ? (<MessagesLoadingSkeleton />) :
            (<NoChatHistoryPlaceholder name={selectedUser.fullName} />)}

      </div>
      <MessageInput />
    </>
  )
}

export default ChatContainer