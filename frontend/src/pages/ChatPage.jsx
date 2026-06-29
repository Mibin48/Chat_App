import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { userChatStore } from '../store/userChatStore';
import { userAuthStore } from '../store/userAuthStore';
import ActiveTabSwitch from '../components/ActiveTabSwitch';
import ChatContainer from '../components/ChatContainer';
import ChatList from '../components/ChatList';
import ContactList from '../components/ContactList';
import RecentCallsList from '../components/RecentCallsList';
import NoConversationPlaceHolder from '../components/NoConversationPlaceHolder';
import CreateGroupModal from '../components/CreateGroupModal';
import InfoPanel from '../components/InfoPanel';
import { MenuIcon, XIcon, SearchIcon, MessageSquareIcon, UsersIcon, SettingsIcon, LogOutIcon, ArrowLeftIcon, UserPlusIcon, PhoneIcon, Star as StarIcon } from 'lucide-react';
import ThemePicker from "../components/ThemePicker";
import FriendRequestManager from '../components/FriendRequestManager';
import StarredMessages from '../components/StarredMessages';

function ChatPage() {
  const {
    activeTab, setActiveTab,
    selectedUser, activeGroup,
    subscribeToMessages, unsubscribeFromMessages,
    sidebarSearchQuery, setSidebarSearchQuery,
    theme, setTheme,
    showInfoPanel, setShowInfoPanel,
    allContacts, getAllContacts, setSelectedUser,
    pendingRequests, getPendingRequests
  } = userChatStore();
  const { authUser, logout, onlineUsers } = userAuthStore();
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isFriendManagerOpen, setIsFriendManagerOpen] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showMobileRail, setShowMobileRail] = useState(false);
  const createMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    getAllContacts();
    getPendingRequests();
  }, [getAllContacts, getPendingRequests]);

  /* Apply theme to html element */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme || 'dark');
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showCreateMenu && createMenuRef.current && !createMenuRef.current.contains(event.target)) {
        setShowCreateMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCreateMenu]);

  const hasActiveChat = !!(selectedUser || activeGroup);

  /* Icon button style helper */
  const railIconStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: isActive ? 'var(--accent-primary)' : 'transparent',
    color: isActive ? '#ffffff' : 'var(--text-muted)',
    boxShadow: isActive ? '0 2px 12px var(--accent-glow)' : 'none',
    flexShrink: 0,
  });

  return (
    <div
      className="fixed inset-0 flex w-full h-full overflow-hidden"
      style={{ background: 'transparent' }}
    >


      {/* ─────────────────────────────────────────────────────────────
          INNER WRAPPER — padding creates the floating gap in Amethyst
          (never use margin on panels; it would overflow h-screen)
          ───────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-1 overflow-hidden chat-page-wrapper"
        style={{
          paddingTop: 'var(--panel-margin-v)',
          paddingBottom: 'var(--panel-margin-v)',
          paddingLeft: 'var(--panel-margin-h)',
          paddingRight: 'var(--panel-margin-h)',
          gap: 'var(--panel-margin-h)',
        }}
      >
        {/* ── UNIFIED SIDEBAR (Rail + Content) ── */}
        <div
          className={`
            flex-row flex-shrink-0 border-none md:border sidebar-container
            ${hasActiveChat ? 'hidden md:flex md:w-[344px] lg:w-[376px]' : 'flex w-full md:w-[344px] lg:w-[376px]'}
          `}
          style={{
            background: 'var(--bg-rail)',
            borderColor: 'var(--border-medium)',
            boxShadow: 'var(--shadow-sidebar)',
            borderRadius: 'var(--panel-radius)',
            overflow: 'hidden',
            alignSelf: 'stretch',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* ICON RAIL — 56px, transparent to blend with unified card background */}
          <div
            className="hidden md:flex flex-col items-center justify-between flex-shrink-0"
            style={{
              width: '64px',
              padding: '24px 8px',
              background: 'transparent',
              borderRight: 'none',
            }}
          >
            {/* Top: avatar + nav */}
            <div className="flex flex-col items-center gap-5 w-full">
              {/* Logo */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md animate-bounce overflow-hidden"
                style={{
                  background: 'var(--accent-muted)',
                  border: '1.5px solid var(--border-accent)',
                  boxShadow: '0 0 10px var(--accent-glow)'
                }}
              >
                <img src="/logo.png" alt="Aether Chat Logo" className="w-10 h-10 object-contain" />
              </div>

              {/* Avatar */}
              <div
                className="relative cursor-pointer group flex-shrink-0"
                title={authUser?.fullName}
                onClick={() => navigate('/settings')}
              >
                <div
                  className="rounded-full overflow-hidden transition-all duration-300 group-hover:scale-105"
                  style={{
                    width: '36px', height: '36px',
                    border: '2px solid var(--accent-primary)',
                    boxShadow: '0 0 0 3px rgba(99,102,241,0.25)',
                  }}
                >
                  <img src={authUser?.profilePic || '/avatar.png'} alt={authUser?.fullName} className="w-full h-full object-cover" />
                </div>
                <span
                  className="absolute bottom-0 right-0 w-2 h-2 rounded-full"
                  style={{ background: 'var(--online-color)', border: '2px solid var(--bg-rail)', boxShadow: '0 0 5px var(--online-color)' }}
                />
              </div>

              {/* Nav icons */}
              <div className="flex flex-col items-center gap-2 w-full">
                <button
                  onClick={() => setActiveTab('chats')}
                  style={railIconStyle(activeTab === 'chats')}
                  title="Chats"
                  onMouseEnter={e => { if (activeTab !== 'chats') { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                  onMouseLeave={e => { if (activeTab !== 'chats') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
                >
                  <MessageSquareIcon size={18} />
                </button>
                <button
                  onClick={() => setActiveTab('contacts')}
                  style={railIconStyle(activeTab === 'contacts')}
                  title="Contacts"
                  onMouseEnter={e => { if (activeTab !== 'contacts') { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                  onMouseLeave={e => { if (activeTab !== 'contacts') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
                >
                  <UsersIcon size={18} />
                </button>
                <button
                  onClick={() => setActiveTab('recents')}
                  style={railIconStyle(activeTab === 'recents')}
                  title="Recents"
                  onMouseEnter={e => { if (activeTab !== 'recents') { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                  onMouseLeave={e => { if (activeTab !== 'recents') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
                >
                  <PhoneIcon size={18} />
                </button>
                <button
                  onClick={() => setActiveTab('starred')}
                  style={railIconStyle(activeTab === 'starred')}
                  title="Starred Messages"
                  onMouseEnter={e => { if (activeTab !== 'starred') { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
                  onMouseLeave={e => { if (activeTab !== 'starred') { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
                >
                  <StarIcon size={18} />
                </button>
                <button
                  onClick={() => setIsFriendManagerOpen(true)}
                  style={railIconStyle(false)}
                  title="Find Friends & Requests"
                  className="relative"
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <UserPlusIcon size={18} />
                  {pendingRequests.length > 0 && (
                    <span
                      className="absolute -top-1 -right-1 rounded-full flex items-center justify-center font-bold text-white animate-pulse"
                      style={{ 
                        background: 'var(--danger-color, #ef4444)',
                        width: '18px',
                        height: '18px',
                        fontSize: '10px',
                        lineHeight: '1'
                      }}
                    >
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom: swatches + settings + logout */}
            <div className="flex flex-col items-center gap-4 w-full">
              <ThemePicker />

              <button
                style={railIconStyle(false)}
                onClick={() => navigate('/settings')}
                title="Settings"
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <SettingsIcon size={18} />
              </button>

              <button
                style={railIconStyle(false)}
                onClick={logout}
                title="Logout"
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = 'var(--danger-color)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <LogOutIcon size={18} />
              </button>
            </div>
          </div>

          {/* SIDEBAR CONTENT COLUMN (FLOATING CARD INSIDE SIDEBAR PANEL) */}
          <div
            className="flex-1 flex flex-col min-w-0 overflow-hidden relative border-none md:border"
            style={{
              background: 'var(--bg-glass-panel)',
              borderColor: 'var(--border-subtle)',
              borderRadius: 'var(--panel-radius)',
              margin: 'var(--panel-margin-v) var(--panel-margin-h) var(--panel-margin-v) 0px',
              boxShadow: 'var(--shadow-card)',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
            }}
          >
            {/* Sidebar Header Row (Branding & Mobile Hamburger) */}
            <div
              className="px-4 pb-1.5 flex items-center justify-between flex-shrink-0"
              style={{ paddingTop: 'calc(16px + var(--safe-top-padding))' }}
            >
              <div className="flex items-center gap-2">
                {/* Hamburger button on mobile */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMobileRail(true);
                  }}
                  className="md:hidden p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-glass-hover)]"
                  style={{ color: 'var(--text-primary)' }}
                  aria-label="Open sidebar menu"
                >
                  <MenuIcon size={20} />
                </button>
                <h1
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-display)',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em',
                    background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--accent-hover) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Aether Chat
                </h1>
              </div>
            </div>

            {/* Search - Icon on the Right */}
            <div className="px-4 pb-2.5 pt-1 flex-shrink-0">
              <div className="relative w-full">
                <input
                  type="text"
                  value={sidebarSearchQuery}
                  onChange={(e) => setSidebarSearchQuery(e.target.value)}
                  placeholder="Search your friend name, or chat"
                  className="aether-input w-full"
                  style={{
                    paddingRight: '2.5rem',
                    paddingLeft: '1.125rem',
                  }}
                />
                <SearchIcon
                  size={14}
                  className="absolute"
                  style={{ right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', opacity: 0.5 }}
                />
              </div>
            </div>

            {/* Active Tab Switcher */}
            <div className="pt-2 flex-shrink-0">
              <ActiveTabSwitch />
            </div>

            {/* Chat List/Contact List container with scroll padding */}
            <div className="flex-1 overflow-y-auto py-1 pb-16 custom-scrollbar">
              {activeTab === 'chats' && <ChatList onSelectChat={() => setShowMobileRail(false)} />}
              {activeTab === 'contacts' && <ContactList onOpenFriendManager={() => setIsFriendManagerOpen(true)} />}
              {activeTab === 'recents' && <RecentCallsList onSelectCall={() => setShowMobileRail(false)} />}
              {activeTab === 'starred' && <StarredMessages />}
            </div>

            {/* Create New floating button container */}
            <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end" ref={createMenuRef}>
              {/* Popover Options Menu */}
              {showCreateMenu && (
                <div
                  className="mb-2 w-44 rounded-2xl border p-1.5 shadow-2xl flex flex-col gap-1 z-20 animate-fade-in"
                  style={{
                    background: 'var(--bg-glass-panel)',
                    borderColor: 'var(--border-medium)',
                    boxShadow: 'var(--shadow-glass)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('contacts');
                      setShowCreateMenu(false);
                    }}
                    className="w-full py-2.5 px-3.5 text-left rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-zinc-300 hover:bg-[var(--bg-glass-hover)] hover:text-white"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <MessageSquareIcon size={14} className="text-[var(--accent-primary)]" />
                    <span>Start New Chat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateGroupOpen(true);
                      setShowCreateMenu(false);
                    }}
                    className="w-full py-2.5 px-3.5 text-left rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all text-zinc-300 hover:bg-[var(--bg-glass-hover)] hover:text-white"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <UsersIcon size={14} className="text-[var(--accent-primary)]" />
                    <span>Create Group</span>
                  </button>
                </div>
              )}

              {/* Main FAB Trigger Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCreateMenu(!showCreateMenu);
                }}
                className="px-4 py-2 text-white text-xs font-bold rounded-full shadow-lg hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-1.5 border border-white/10"
                style={{
                  background: 'var(--accent-primary)',
                  boxShadow: '0 4px 14px var(--accent-glow)',
                }}
              >
                <span className={`text-sm font-bold leading-none transition-transform duration-250 ${showCreateMenu ? 'rotate-45' : ''}`}>+</span> Create New
              </button>
            </div>
          </div>
        </div>

        {/* ── MAIN CHAT AREA ── */}
        <div
          className={`flex-1 flex flex-col overflow-hidden border-none md:border main-chat-container ${hasActiveChat ? 'flex' : 'hidden md:flex'}`}
          style={{
            background: hasActiveChat ? 'var(--bg-glass-panel)' : 'var(--bg-glass)',
            borderColor: 'var(--border-subtle)',
            borderRadius: 'var(--panel-radius)',
            margin: 'var(--panel-margin-v) 0px var(--panel-margin-v) 0px',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
            alignSelf: 'stretch',
            backdropFilter: hasActiveChat ? 'blur(24px)' : 'blur(12px)',
            WebkitBackdropFilter: hasActiveChat ? 'blur(24px)' : 'blur(12px)',
          }}
        >
          {hasActiveChat
            ? <ChatContainer />
            : <NoConversationPlaceHolder />
          }
        </div>

        {/* ── INFO PANEL SIDEBAR ── */}
        {hasActiveChat && showInfoPanel && (
          <div
            className="w-full sm:w-[320px] md:w-[360px] flex flex-col flex-shrink-0 animate-slide-in absolute sm:relative inset-y-0 right-0 sm:inset-auto z-40 sm:z-auto border-none md:border info-panel-container"
            style={{
              background: 'var(--bg-glass-panel)',
              borderColor: 'var(--border-subtle)',
              borderRadius: 'var(--panel-radius)',
              margin: 'var(--panel-margin-v) 0px var(--panel-margin-v) 0px',
              boxShadow: 'var(--shadow-card)',
              overflow: 'hidden',
              alignSelf: 'stretch',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            <InfoPanel onClose={() => setShowInfoPanel(false)} />
          </div>
        )}
      </div>

      {isCreateGroupOpen && <CreateGroupModal onClose={() => setIsCreateGroupOpen(false)} />}
      {isFriendManagerOpen && <FriendRequestManager onClose={() => setIsFriendManagerOpen(false)} />}

      {/* ── MOBILE RAIL DRAWER ── */}
      {showMobileRail && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40 animate-fade-in"
            onClick={() => setShowMobileRail(false)}
          />
          {/* Drawer containing the Icon Rail */}
          <div
            className="md:hidden fixed inset-y-0 left-0 z-50 flex flex-col items-center justify-between w-[64px] shadow-2xl animate-slide-in-left"
            style={{
              background: 'var(--bg-glass-panel)',
              borderRight: '1px solid var(--border-medium)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              paddingTop: 'calc(24px + var(--safe-top-padding))',
              paddingBottom: 'calc(24px + var(--safe-bottom-padding))',
            }}
          >
            {/* Top: close button + avatar + nav */}
            <div className="flex flex-col items-center gap-6 w-full">
              {/* Logo */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden"
                style={{
                  background: 'var(--accent-muted)',
                  border: '1.5px solid var(--border-accent)',
                  boxShadow: '0 0 10px var(--accent-glow)'
                }}
              >
                <img src="/logo.png" alt="Aether Chat Logo" className="w-6 h-6 object-contain" />
              </div>

              {/* Close arrow */}
              <button
                onClick={() => setShowMobileRail(false)}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-glass-hover)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ArrowLeftIcon size={18} />
              </button>

              {/* Avatar */}
              <div
                className="relative cursor-pointer group flex-shrink-0"
                title={authUser?.fullName}
                onClick={() => {
                  navigate('/settings');
                  setShowMobileRail(false);
                }}
              >
                <div
                  className="rounded-full overflow-hidden transition-all duration-300"
                  style={{
                    width: '38px', height: '38px',
                    border: '2px solid var(--accent-primary)',
                    boxShadow: '0 0 0 3px rgba(99,102,241,0.25)',
                  }}
                >
                  <img src={authUser?.profilePic || '/avatar.png'} alt={authUser?.fullName} className="w-full h-full object-cover" />
                </div>
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full"
                  style={{ background: 'var(--online-color)', border: '2px solid var(--bg-rail)', boxShadow: '0 0 5px var(--online-color)' }}
                />
              </div>

              {/* Nav icons */}
              <div className="flex flex-col items-center gap-3 w-full">
                <button
                  onClick={() => {
                    setActiveTab('chats');
                    setShowMobileRail(false);
                  }}
                  style={railIconStyle(activeTab === 'chats')}
                  title="Chats"
                >
                  <MessageSquareIcon size={18} />
                </button>
                <button
                  onClick={() => {
                    setActiveTab('contacts');
                    setShowMobileRail(false);
                  }}
                  style={railIconStyle(activeTab === 'contacts')}
                  title="Contacts"
                >
                  <UsersIcon size={18} />
                </button>
                <button
                  onClick={() => {
                    setActiveTab('recents');
                    setShowMobileRail(false);
                  }}
                  style={railIconStyle(activeTab === 'recents')}
                  title="Recents"
                >
                  <PhoneIcon size={18} />
                </button>
                <button
                  onClick={() => {
                    setActiveTab('starred');
                    setShowMobileRail(false);
                  }}
                  style={railIconStyle(activeTab === 'starred')}
                  title="Starred Messages"
                >
                  <StarIcon size={18} />
                </button>
                <button
                  onClick={() => {
                    setIsFriendManagerOpen(true);
                    setShowMobileRail(false);
                  }}
                  style={railIconStyle(false)}
                  title="Find Friends & Requests"
                  className="relative animate-fade-in"
                >
                  <UserPlusIcon size={18} />
                  {pendingRequests.length > 0 && (
                    <span
                      className="absolute -top-1 -right-1 rounded-full flex items-center justify-center font-bold text-white animate-pulse"
                      style={{ 
                        background: 'var(--danger-color, #ef4444)',
                        width: '18px',
                        height: '18px',
                        fontSize: '10px',
                        lineHeight: '1'
                      }}
                    >
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Bottom: swatches + settings + logout */}
            <div className="flex flex-col items-center gap-5 w-full">
              {/* Theme picker */}
              <ThemePicker />

              <button
                style={railIconStyle(false)}
                onClick={() => {
                  navigate('/settings');
                  setShowMobileRail(false);
                }}
                title="Settings"
              >
                <SettingsIcon size={18} />
              </button>

              <button
                style={railIconStyle(false)}
                onClick={() => {
                  logout();
                  setShowMobileRail(false);
                }}
                title="Logout"
              >
                <LogOutIcon size={18} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatPage;