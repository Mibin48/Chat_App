import { MessageCircleIcon } from 'lucide-react';

function NoChatHistoryPlaceholder({ name }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--accent-muted)', border: '1px solid var(--border-accent)' }}
      >
        <MessageCircleIcon className="w-7 h-7" style={{ color: 'var(--accent-primary)' }} />
      </div>
      <h3
        className="font-semibold text-base mb-1"
        style={{ color: 'var(--text-primary)' }}
      >
        No messages yet
      </h3>
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        Say hello to <span style={{ color: 'var(--text-accent)', fontWeight: 600 }}>{name}</span> 👋
      </p>
    </div>
  );
}

export default NoChatHistoryPlaceholder;