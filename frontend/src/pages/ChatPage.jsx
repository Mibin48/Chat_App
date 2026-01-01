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
      <div className="relative w-full max-w-6xl h-[calc(100vh-8rem)]">
        <BorderAnimatedContainer>
          {/* LEFT SIDE */}
          <div className="w-80 bg-slate-800/50 backdrop-blur-sm flex flex-col">
            <ProfileHeader />
            <ActiveTabSwitch />

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {activeTab === "chats" ? <ChatList /> : <ContactList />}
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-sm">
            {selectedUser ? <ChatContainer /> : <NoConversationPlaceHolder />}
          </div>
        </BorderAnimatedContainer>
      </div>
    </div>
  );
}


export default ChatPage