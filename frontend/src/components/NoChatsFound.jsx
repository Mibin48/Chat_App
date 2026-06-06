import { MessageSquareIcon } from "lucide-react";
import { userChatStore } from "../store/userChatStore";

function NoChatsFound() {
  const { setActiveTab } = userChatStore();

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-6 my-10 animate-fade-in">
      {/* Decorative Icon Container */}
      <div className="relative inline-flex items-center justify-center">
        {/* Glow backdrop */}
        <div
          className="absolute pointer-events-none rounded-full blur-xl opacity-20 animate-pulse-glow"
          style={{
            width: '80px',
            height: '80px',
            background: 'var(--accent-primary)',
          }}
        />
        {/* Icon box */}
        <div
          className="relative flex items-center justify-center w-16 h-16 rounded-2xl border shadow-md animate-float"
          style={{
            borderColor: 'var(--border-medium)',
            background: 'var(--bg-surface)',
          }}
        >
          <MessageSquareIcon className="w-7 h-7 text-[var(--accent-primary)]" />
        </div>
      </div>

      {/* Texts */}
      <div className="max-w-[240px] space-y-2">
        <h4 
          className="text-base font-extrabold tracking-tight"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          No conversations yet
        </h4>
        <p 
          className="text-xs leading-relaxed"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
        >
          Start a new chat by selecting a contact from the contacts tab.
        </p>
      </div>

      {/* Modern Button */}
      <button
        onClick={() => setActiveTab("contacts")}
        className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 border"
        style={{
          background: 'var(--accent-primary)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          color: '#ffffff',
          boxShadow: '0 4px 12px var(--accent-glow)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-primary)'}
      >
        Find contacts
      </button>
    </div>
  );
}

export default NoChatsFound;