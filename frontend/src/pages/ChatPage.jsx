import React from 'react'
import { userChatStore } from '../store/userChatStore';
import BorderAnimatedContainer from '../components/BorderAnimatedContainer';
import { Contact } from 'lucide-react';
import ActiveTabSwitch from '../components/ActiveTabSwitch';
import ChatContainer from '../components/ChatContainer';
import ChatList from '../components/ChatList';
import ContactList from '../components/ContactList';
import NoConversationPlaceHolder from '../components/NoConversationPlaceHolder';
import ProfileHeader from '../components/ProfileHeader';

function ChatPage() {
  const { activeTab, selectedUser } = userChatStore();
  return (
    <div className="flex items-center justify-center p-4 min-h-screen">
      <BorderAnimatedContainer className="relative w-full max-w-6xl h-[calc(100vh-8rem)]">
        {/* LEFT SIDE - Sidebar */}
        <div className="w-80 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col">
          <ProfileHeader />
          <ActiveTabSwitch />

          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {activeTab === "chats" ? <ChatList /> : <ContactList />}
          </div>
        </div>

        {/* RIGHT SIDE - Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-900/30 backdrop-blur-xl relative">
          {/* Decorative background for empty state or subtle texture */}
          {!selectedUser && (
            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-900/20 to-slate-950/20"></div>
          )}

          {selectedUser ? <ChatContainer /> : <NoConversationPlaceHolder />}
        </div>
      </BorderAnimatedContainer>
    </div>
  );
}


export default ChatPage