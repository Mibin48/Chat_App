import { useEffect } from "react";
import { userChatStore } from "../store/userChatStore";
import UserLoadingSkeleton from "./UserLoadingSkeleton";
import { userAuthStore } from "../store/userAuthStore";
import { UserPlusIcon } from "lucide-react";

function ContactList({ onOpenFriendManager }) {
  const { getAllContacts, allContacts, setSelectedUser, selectedUser, isUsersLoading, sidebarSearchQuery } = userChatStore();
  const { onlineUsers } = userAuthStore();

  useEffect(() => {
    getAllContacts();
  }, [getAllContacts]);

  if (isUsersLoading) return <UserLoadingSkeleton />;

  if (!allContacts || allContacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center select-none w-full animate-fade-in my-6">
        <div 
          className="glass-panel p-7 rounded-3xl flex flex-col items-center gap-5 shadow-xl relative overflow-hidden w-full max-w-[290px] border"
          style={{
            background: 'var(--bg-glass-panel)',
            borderColor: 'var(--border-subtle)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Glow ambient background effect */}
          <div 
            className="absolute w-20 h-20 rounded-full blur-[35px] opacity-15 pointer-events-none"
            style={{
              background: 'var(--accent-primary)',
              top: '5%',
              left: '30%',
            }}
          />

          {/* Logo Container */}
          <div className="relative">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center relative z-10 animate-float overflow-hidden"
              style={{ 
                background: 'var(--accent-muted)', 
                border: '1.5px solid var(--border-accent)',
                boxShadow: '0 0 24px var(--accent-glow)'
              }}
            >
              <UserPlusIcon size={24} className="text-[var(--accent-primary)]" />
            </div>
          </div>

          {/* Text descriptions */}
          <div className="flex flex-col gap-1.5 z-10">
            <h4
              className="text-sm font-black tracking-tight"
              style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
            >
              No Contacts Yet
            </h4>
            <p
              className="text-[11px] leading-relaxed max-w-[220px] mx-auto"
              style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
            >
              Add friends to start sharing messages securely. Find new people or check requests.
            </p>
          </div>

          {/* Modern Button */}
          <button
            onClick={onOpenFriendManager}
            className="w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 border select-none cursor-pointer z-10 flex items-center justify-center gap-1.5"
            style={{
              background: 'var(--accent-primary)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              boxShadow: '0 4px 12px var(--accent-glow)',
              fontFamily: 'var(--font-body)'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-primary)'}
          >
            <span>Open Friend Manager</span>
          </button>
        </div>
      </div>
    );
  }

  const filteredContacts = allContacts.filter(contact =>
    contact.fullName?.toLowerCase().includes(sidebarSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-0.5">
      {filteredContacts.map((contact) => {
        const isOnline = onlineUsers?.includes(contact._id);
        const isActive = selectedUser?._id === contact._id;

        return (
          <div
            key={contact._id}
            className="chat-item"
            style={isActive ? {
              background: 'var(--accent-muted)',
              borderColor: 'var(--border-accent)',
            } : {}}
            onClick={() => setSelectedUser(contact)}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-11 h-11 rounded-full overflow-hidden transition-all duration-200"
                style={{ border: `2px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-subtle)'}` }}
              >
                <img
                  src={contact.profilePic || "/avatar.png"}
                  alt={contact.fullName}
                  className="w-full h-full object-cover"
                />
              </div>
              {isOnline && (
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full"
                  style={{ background: 'var(--online-color)', border: '2px solid var(--bg-surface)', boxShadow: '0 0 5px var(--online-color)' }}
                />
              )}
            </div>

            {/* Info */}
            <div className="flex flex-col flex-1 min-w-0">
              <h4
                className="font-semibold text-sm truncate leading-tight tracking-tight"
                style={{ color: isActive ? 'var(--text-accent)' : 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}
              >
                {contact.fullName}
              </h4>
              <p 
                className="text-xs truncate leading-tight mt-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                {isOnline ? "Online" : "Offline"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ContactList;