import { ZapIcon } from 'lucide-react';

function PageLoader({ transparent = false }) {
  return (
    <div
      className="w-full h-screen flex flex-col items-center justify-center gap-6"
      style={{ background: transparent ? 'transparent' : 'var(--bg-base)' }}
    >
      <div className="relative flex items-center justify-center">
        {/* Central glassmorphic icon card */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl z-10"
          style={{
            background: 'var(--accent-muted)',
            border: '2px solid var(--border-accent)',
            boxShadow: '0 0 40px var(--accent-glow)',
          }}
        >
          <ZapIcon className="w-8 h-8 animate-pulse" style={{ color: 'var(--accent-hover)' }} />
        </div>

        {/* Outer Premium Spinner Ring - Rounded corner square profile */}
        <div
          className="absolute rounded-2xl"
          style={{
            width: '80px',
            height: '80px',
            border: '2px solid transparent',
            borderTopColor: 'var(--accent-primary)',
            borderBottomColor: 'var(--accent-hover)',
            animation: 'premiumSpinOuter 1.5s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite',
          }}
        />

        {/* Inner Premium Spinner Ring - Circular profile rotating reverse */}
        <div
          className="absolute rounded-full"
          style={{
            width: '94px',
            height: '94px',
            border: '1.5px solid transparent',
            borderRightColor: 'var(--accent-hover)',
            borderLeftColor: 'var(--accent-primary)',
            opacity: 0.65,
            animation: 'premiumSpinInner 1.8s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite reverse',
          }}
        />
      </div>

      <div className="text-center mt-1">
        <h2 className="text-xl font-black gradient-text tracking-wide" style={{ letterSpacing: '0.04em' }}>
          Aether Chat
        </h2>
        <p className="text-xs mt-1 font-semibold animate-pulse" style={{ color: 'var(--text-muted)' }}>
          Loading resources...
        </p>
      </div>

      <style>{`
        @keyframes premiumSpinOuter {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.05); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes premiumSpinInner {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default PageLoader;