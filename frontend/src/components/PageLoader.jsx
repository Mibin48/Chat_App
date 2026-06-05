import { ZapIcon } from 'lucide-react';

function PageLoader() {
  return (
    <div
      className="w-full h-screen flex flex-col items-center justify-center gap-5"
      style={{ background: 'var(--bg-base)' }}
    >
      <div className="relative">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl"
          style={{
            background: 'var(--accent-muted)',
            border: '2px solid var(--border-accent)',
            boxShadow: '0 0 40px var(--accent-glow)',
          }}
        >
          <ZapIcon className="w-8 h-8" style={{ color: 'var(--accent-hover)' }} />
        </div>
        <div
          className="absolute inset-0 rounded-2xl animate-spin"
          style={{
            border: '2px solid transparent',
            borderTopColor: 'var(--accent-primary)',
            borderRightColor: 'var(--accent-hover)',
            animationDuration: '1.2s',
          }}
        />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-bold gradient-text">Aether Chat</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    </div>
  );
}

export default PageLoader;