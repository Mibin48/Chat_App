import { ZapIcon, LockIcon, ActivityIcon, MicIcon, PaperclipIcon } from 'lucide-react';
import { userChatStore } from '../store/userChatStore';

function NoConversationPlaceHolder() {
  const { chats } = userChatStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div
        className="absolute rounded-full animate-pulse-glow pointer-events-none"
        style={{ width: '360px', height: '360px', background: 'var(--accent-primary)', filter: 'blur(120px)', opacity: 0.1, top: '15%', left: '20%' }}
      />
      <div
        className="absolute rounded-full animate-pulse-glow pointer-events-none"
        style={{ width: '260px', height: '260px', background: '#8b5cf6', filter: 'blur(100px)', opacity: 0.08, bottom: '15%', right: '18%', animationDelay: '-3s' }}
      />

      <div className="relative z-10 text-center max-w-xs">
        {/* Logo container with radial gradient behind + ambient glow */}
        <div className="relative inline-flex items-center justify-center mb-7">
          {/* Radial gradient behind logo */}
          <div
            className="absolute pointer-events-none"
            style={{
              inset: '-40px',
              background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.12) 0%, transparent 70%)',
            }}
          />
          {/* Pulsing outer ring */}
          <div
            className="absolute animate-pulse pointer-events-none"
            style={{
              inset: '-8px',
              borderRadius: 'calc(var(--radius-logo) + 8px)',
              border: '1.5px solid var(--border-accent)',
              opacity: 0.3,
            }}
          />
          {/* Pulsing inner ring */}
          <div
            className="absolute animate-pulse pointer-events-none"
            style={{
              inset: '-2px',
              borderRadius: 'calc(var(--radius-logo) + 2px)',
              border: '1px solid var(--border-accent)',
              opacity: 0.5,
              animationDelay: '-0.5s',
            }}
          />
          {/* Logo box */}
          <div
            className="relative flex items-center justify-center animate-float"
            style={{
              width: '88px',
              height: '88px',
              borderRadius: 'var(--radius-logo)',
              background: 'var(--accent-muted)',
              border: '1.5px solid var(--border-accent)',
              boxShadow: '0 0 40px rgba(99,102,241,0.35)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <ZapIcon className="w-10 h-10" style={{ color: 'var(--accent-hover)' }} />
          </div>
        </div>

        {/* Title */}
        <h2
          className="text-2xl sm:text-3xl font-extrabold mb-2 gradient-text"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}
        >
          Aether Chat
        </h2>

        {/* Subtitle */}
        <p
          className="text-sm sm:text-base leading-relaxed mb-6"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
        >
          {chats.length > 0
            ? 'Select a conversation from the sidebar to begin messaging'
            : 'Your conversations will appear here. Start by messaging a contact.'
          }
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { icon: <LockIcon size={11} />, text: 'Private' },
            { icon: <ActivityIcon size={11} />, text: 'Real-time' },
            { icon: <MicIcon size={11} />, text: 'Voice Notes' },
            { icon: <PaperclipIcon size={11} />, text: 'Files' },
          ].map((item, idx) => (
            <span
              key={idx}
              className="auth-badge flex items-center gap-1.5 cursor-default select-none"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {item.icon}
              <span>{item.text}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NoConversationPlaceHolder;