import React, { useEffect } from 'react'
import { userChatStore } from '../store/userChatStore';
import UsersLoadingSkeleton from './UserLoadingSkeleton';
import NoChatsFound from './NoChatsFound';
import { userAuthStore } from '../store/userAuthStore';

function ChatList() {
  const { getMyChatPartners, chats, isUserLoading, setSelectedUser } = userChatStore();
  const { onlineUsers } = userAuthStore();
  useEffect(() => { getMyChatPartners() }, [getMyChatPartners]);

    if(isUserLoading){
        return <UsersLoadingSkeleton />;
    } 
    if(chats.length === 0) return <NoChatsFound/>;

  return (
    <>
    {chats.map(chat =>{
        <div
          key={chat._id}
          className={`
            group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300
            hover:bg-cyan-500/10 hover:shadow-lg hover:shadow-cyan-500/5 hover:-translate-y-0.5
            border border-transparent hover:border-cyan-500/20
          `}
          onClick={() => setSelectedUser(chat)}
        >
          <div className="relative">
            <div className="size-12 rounded-full overflow-hidden border-2 border-slate-700 group-hover:border-cyan-500/50 transition-colors">
              <img src={chat.profilePic || "/avatar.png"} alt={chat.fullName} className="w-full h-full object-cover" />
            </div>
            {onlineUsers?.includes(chat._id) && (
              <span className="absolute bottom-0 right-0 size-3 bg-cyan-500 rounded-full ring-2 ring-slate-900 animate-pulse"></span>
            )}
          </div>

          <div className="flex flex-col flex-1 min-w-0">
            <h4 className="text-slate-200 font-medium truncate group-hover:text-cyan-400 transition-colors">{chat.fullName}</h4>
            <p className="text-slate-500 text-xs truncate group-hover:text-slate-400">Click to chat</p>
          </div>
        </div>
    })}
    </>
  )
}

export default ChatList