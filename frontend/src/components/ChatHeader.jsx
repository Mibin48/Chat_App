import React, { useEffect, useState } from 'react'
import { userChatStore } from '../store/userChatStore'
import { XIcon, SearchIcon } from 'lucide-react';
import { userAuthStore } from '../store/userAuthStore';
import SearchBar from './SearchBar';

function ChatHeader() {
    const { selectedUser, setSelectedUser, isTyping, showSearch, setShowSearch } = userChatStore();
    const { onlineUsers } = userAuthStore();
    const isOnline = onlineUsers.includes(selectedUser._id);

    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === "Escape" && showSearch) {
                setShowSearch(false);
            }
        }
        window.addEventListener("keydown", handleEscKey);
        return () => window.removeEventListener("keydown", handleEscKey);
    }, [showSearch, setShowSearch])

    return (
        <div className='flex justify-between items-center bg-slate-900/30 backdrop-blur-md border-b border-white/5 h-16 px-6 relative z-10'>
            <div className='flex items-center space-x-3'>
                <div className="relative">
                    <div className='size-10 rounded-full overflow-hidden border border-white/10'>
                        <img src={selectedUser.profilePic || "/avatar.png"} alt={selectedUser.fullName} className="w-full h-full object-cover" />
                    </div>
                    {isOnline && <span className="absolute bottom-0 right-0 size-2.5 bg-green-500 rounded-full ring-2 ring-slate-900"></span>}
                </div>

                <div>
                    <h3 className='text-slate-100 font-medium text-sm'>{selectedUser.fullName}</h3>
                    <div className='flex items-center gap-2'>
                        <p className='text-xs'>
                            {isTyping ?
                                <span className='text-cyan-400 font-medium animate-pulse'>Typing...</span> :
                                (isOnline ? <span className="text-green-500">Online</span> : <span className="text-slate-500">Offline</span>)
                            }
                        </p>
                        {selectedUser.customStatus && (
                            <>
                                <span className="text-slate-600">•</span>
                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                    {selectedUser.statusEmoji && <span>{selectedUser.statusEmoji}</span>}
                                    <span className="truncate max-w-[150px]">{selectedUser.customStatus}</span>
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowSearch(true)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                    title="Search messages"
                >
                    <SearchIcon size={20} />
                </button>
                <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                >
                    <XIcon size={20} />
                </button>
            </div>
        </div>
    )
}

export default ChatHeader