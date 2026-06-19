import React from 'react';
import { MessageSquareIcon, SparklesIcon, Lock } from 'lucide-react';
import { userChatStore } from '../store/userChatStore';

const GREETINGS = [
  "Hey there! 👋",
  "How's it going? 😊",
  "Let's connect! 🚀",
  "Hello! What's up? 💬"
];

function NoChatHistoryPlaceholder({ name }) {
  const { sendMessage, sendGroupMessage, activeGroup, selectedUser } = userChatStore();

  const handleSendGreeting = (text) => {
    if (activeGroup) {
      sendGroupMessage({ text });
    } else if (selectedUser) {
      sendMessage({ text });
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none max-w-sm mx-auto h-full justify-self-center">
      <div 
        className="glass-panel p-8 rounded-3xl flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden w-full border"
        style={{
          background: 'var(--bg-glass-panel)',
          borderColor: 'var(--border-subtle)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Glow ambient background effect */}
        <div 
          className="absolute w-24 h-24 rounded-full blur-[40px] opacity-20 pointer-events-none"
          style={{
            background: 'var(--accent-primary)',
            top: '5%',
            left: '35%',
          }}
        />

        {/* Icon with float animation */}
        <div className="relative">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center relative z-10"
            style={{ 
              background: 'var(--accent-muted)', 
              border: '2px solid var(--border-accent)',
              boxShadow: '0 0 30px var(--accent-glow)'
            }}
          >
            <MessageSquareIcon className="w-8 h-8 animate-float" style={{ color: 'var(--accent-primary)' }} />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center shadow-lg animate-pulse z-20">
            <SparklesIcon className="w-2.5 h-2.5 text-white" />
          </div>
        </div>

        {/* Text descriptions */}
        <div className="flex flex-col gap-2">
          <h3
            className="text-lg font-black tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            No Messages Yet
          </h3>
          <p
            className="text-xs leading-relaxed max-w-[280px] mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            Start the conversation with <span className="font-bold" style={{ color: 'var(--accent-hover)' }}>{name}</span> by typing a message or selecting an icebreaker below:
          </p>
        </div>

        {/* E2EE notice */}
        <div className="flex items-center gap-1.5 justify-center opacity-70 select-none text-[10px] font-mono border border-emerald-500/15 bg-emerald-500/5 px-3 py-1 rounded-xl" style={{ color: 'var(--online-color)' }}>
          <Lock size={10} className="text-emerald-500" />
          <span>Messages are secured with E2EE</span>
        </div>

        {/* Action greeting chips */}
        <div className="grid grid-cols-2 gap-2.5 w-full mt-2">
          {GREETINGS.map((greet, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendGreeting(greet)}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all duration-300 active:scale-95 text-center flex items-center justify-center hover:scale-[1.03] select-none cursor-pointer"
              style={{
                background: 'var(--bg-glass)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                e.currentTarget.style.boxShadow = '0 0 12px var(--accent-glow)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              {greet}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes floatEffect {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(2deg); }
        }
        .animate-float {
          animation: floatEffect 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default NoChatHistoryPlaceholder;