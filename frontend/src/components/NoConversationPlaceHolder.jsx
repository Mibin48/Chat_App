import { ZapIcon, LockIcon, ShieldAlertIcon, MicIcon, PaperclipIcon, ActivityIcon } from 'lucide-react';
import { userChatStore } from '../store/userChatStore';

function NoConversationPlaceHolder() {
  const { chats } = userChatStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow orbs */}
      <div
        className="absolute w-72 h-72 rounded-full blur-[80px] opacity-20 animate-pulse-glow"
        style={{ background: 'var(--accent-primary)', top: '20%', left: '30%' }}
      />
      <div
        className="absolute w-48 h-48 rounded-full blur-[60px] opacity-15 animate-pulse-glow"
        style={{ background: '#8b5cf6', bottom: '20%', right: '25%', animationDelay: '-3s' }}
      />

      <div className="relative z-10 text-center max-w-xs">
        {/* Animated icon */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center"
            style={{
              background: 'var(--accent-muted)',
              border: '2px solid var(--border-accent)',
              boxShadow: '0 0 40px var(--accent-glow)',
            }}
          >
            <ZapIcon
              className="w-10 h-10 sm:w-12 sm:h-12"
              style={{ color: 'var(--accent-hover)' }}
            />
          </div>
          {/* Pulsing ring */}
          <div
            className="absolute inset-0 rounded-3xl animate-pulse"
            style={{ border: '2px solid var(--border-accent)', opacity: 0.4 }}
          />
        </div>

        <h2
          className="text-xl sm:text-2xl font-bold mb-2 gradient-text"
        >
          Aether Chat
        </h2>
        <p
          className="text-sm sm:text-base leading-relaxed mb-5"
          style={{ color: 'var(--text-secondary)' }}
        >
          {chats.length > 0
            ? 'Select a conversation from the sidebar to begin messaging'
            : 'Your conversations will appear here. Start by messaging a contact.'
          }
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { icon: <LockIcon size={12} />, text: 'Private' },
            { icon: <ActivityIcon size={12} />, text: 'Real-time' },
            { icon: <MicIcon size={12} />, text: 'Voice Notes' },
            { icon: <PaperclipIcon size={12} />, text: 'Files' }
          ].map((item, idx) => (
            <span
              key={idx}
              className="auth-badge text-xs flex items-center gap-1 px-2.5 py-1"
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