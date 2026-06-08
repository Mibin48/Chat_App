import { userChatStore } from "../store/userChatStore";

function NoChatsFound() {
  const { setActiveTab } = userChatStore();

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

        {/* Brand Logo Container with float animation */}
        <div className="relative">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center relative z-10 animate-float overflow-hidden"
            style={{ 
              background: 'var(--accent-muted)', 
              border: '1.5px solid var(--border-accent)',
              boxShadow: '0 0 24px var(--accent-glow)'
            }}
          >
            <img src="/logo.png" alt="Aether Chat Logo" className="w-8 h-8 object-contain" />
          </div>
        </div>

        {/* Text descriptions */}
        <div className="flex flex-col gap-1.5 z-10">
          <h4
            className="text-sm font-black tracking-tight"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
          >
            No Conversations Yet
          </h4>
          <p
            className="text-[11px] leading-relaxed max-w-[220px] mx-auto"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
          >
            Your active chats will appear here. Start a secure connection by finding a contact.
          </p>
        </div>

        {/* Modern Button */}
        <button
          onClick={() => setActiveTab("contacts")}
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
          <span>Find Contacts</span>
        </button>
      </div>
    </div>
  );
}

export default NoChatsFound;