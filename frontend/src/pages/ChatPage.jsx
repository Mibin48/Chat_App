import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { userChatStore } from '../store/userChatStore';
import { userAuthStore } from '../store/userAuthStore';
import ActiveTabSwitch from '../components/ActiveTabSwitch';
import ChatContainer from '../components/ChatContainer';
import ChatList from '../components/ChatList';
import ContactList from '../components/ContactList';
import NoConversationPlaceHolder from '../components/NoConversationPlaceHolder';
import ProfileHeader from '../components/ProfileHeader';
import ThemeToggle from '../components/ThemeToggle';
import { MenuIcon, XIcon, SearchIcon, MessageSquareIcon, UsersIcon, SettingsIcon, LogOutIcon } from 'lucide-react';

function ChatPage() {
  const { activeTab, setActiveTab, selectedUser, activeGroup, subscribeToMessages, unsubscribeFromMessages, sidebarSearchQuery, setSidebarSearchQuery } = userChatStore();
  const { authUser, logout } = userAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (selectedUser || activeGroup) setSidebarOpen(false);
  }, [selectedUser, activeGroup]);

  const hasActiveChat = !!(selectedUser || activeGroup);

  return (
    <div
      className="flex w-full h-screen overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* ── LEFT NAVIGATION SIDEBAR (WhatsApp Style) ── */}
      <div
        className="hidden md:flex flex-col items-center justify-between py-5 w-16 flex-shrink-0 border-r"
        style={{
          background: 'var(--bg-sidebar)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Avatar */}
          <div
            className="relative cursor-pointer group"
            title={authUser?.fullName}
          >
            <div
              className="w-10 h-10 rounded-full overflow-hidden transition-all duration-200 hover:scale-105"
              style={{ border: '2px solid var(--border-medium)', background: 'var(--bg-input)' }}
            >
              <img
                src={authUser?.profilePic || "/avatar.png"}
                alt={authUser?.fullName}
                className="w-full h-full object-cover"
              />
            </div>
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2"
              style={{ background: 'var(--online-color)', ringColor: 'var(--bg-sidebar)' }}
            />
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-col gap-4 w-full px-2">
            <button
              onClick={() => setActiveTab("chats")}
              className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center ${activeTab === "chats" ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"}`}
              title="Chats"
            >
              <MessageSquareIcon size={20} />
            </button>
            <button
              onClick={() => setActiveTab("contacts")}
              className={`p-2 rounded-xl transition-all duration-200 flex items-center justify-center ${activeTab === "contacts" ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"}`}
              title="Contacts"
            >
              <UsersIcon size={20} />
            </button>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col items-center gap-4 w-full px-2">
          <ThemeToggle compact />
          
          <button
            className="p-2 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-all duration-200 flex items-center justify-center"
            onClick={() => navigate("/settings")}
            title="Settings"
          >
            <SettingsIcon size={20} />
          </button>

          <button
            className="p-2 rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 flex items-center justify-center"
            onClick={logout}
            title="Logout"
          >
            <LogOutIcon size={20} />
          </button>
        </div>
      </div>

      {/* ── MOBILE HAMBURGER ── */}
      {!hasActiveChat && (
        <button
          className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-xl btn-icon"
          style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)' }}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <XIcon size={20} /> : <MenuIcon size={20} />}
        </button>
      )}

      {/* ── SIDEBAR ── */}
      <div
        className={`
          flex flex-col flex-shrink-0 h-full
          w-full md:w-72 lg:w-80
          absolute md:relative inset-y-0 left-0 z-40 md:z-auto
          transition-transform duration-250 ease-in-out
          ${hasActiveChat
            ? '-translate-x-full md:translate-x-0'
            : sidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full md:translate-x-0'
          }
        `}
        style={{
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <ProfileHeader />
        
        {/* Search Chat Input Above Chats */}
        <div className="px-3 pb-2 pt-2.5 relative">
          <input
            type="text"
            value={sidebarSearchQuery}
            onChange={(e) => setSidebarSearchQuery(e.target.value)}
            placeholder="Search or start a new chat..."
            className="aether-input pl-9 pr-4 py-1.5 text-xs"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '9999px',
            }}
          />
          <SearchIcon size={14} className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" style={{ pointerEvents: 'none' }} />
        </div>

        <ActiveTabSwitch />
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
          {activeTab === "chats"
            ? <ChatList onSelectChat={() => setSidebarOpen(false)} />
            : <ContactList />
          }
        </div>
      </div>

      {/* ── MOBILE OVERLAY BACKDROP ── */}
      {sidebarOpen && !hasActiveChat && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── MAIN CHAT AREA ── */}
      <div
        className="flex-1 flex flex-col overflow-hidden h-full"
        style={{ background: 'var(--bg-chat)' }}
      >
        {hasActiveChat
          ? <ChatContainer onOpenSidebar={() => setSidebarOpen(true)} />
          : <NoConversationPlaceHolder />
        }
      </div>
    </div>
  );
}

export default ChatPage;