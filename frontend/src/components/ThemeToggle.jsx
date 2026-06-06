import { MoonIcon, ZapIcon, SunIcon } from 'lucide-react';
import { userChatStore } from '../store/userChatStore';
import { useEffect, useState } from 'react';

const THEME_CONFIG = {
  dark: {
    icon: MoonIcon,
    label: 'Dark',
    next: 'midnight',
    color: '#818cf8',
    dotColor: '#c4b5fd',
  },
  midnight: {
    icon: ZapIcon,
    label: 'OLED',
    next: 'amethyst',
    color: '#c4b5fd',
    dotColor: '#f4f4fa',
  },
  amethyst: {
    icon: SunIcon,
    label: 'Light',
    next: 'dark',
    color: '#4338ca',
    dotColor: '#6366f1',
  },
};

function ThemeToggle({ compact = false }) {
  const { theme, cycleTheme } = userChatStore();
  const [animating, setAnimating] = useState(false);

  // Apply theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const config = THEME_CONFIG[theme] || THEME_CONFIG.dark;
  const Icon = config.icon;

  const handleToggle = () => {
    setAnimating(true);
    cycleTheme();
    setTimeout(() => setAnimating(false), 380);
  };

  if (compact) {
    // Compact icon-only version with subtle glass container
    return (
      <button
        onClick={handleToggle}
        title={`Theme: ${config.label} — click to switch`}
        aria-label="Switch theme"
        className="flex items-center justify-center w-full relative transition-all duration-200"
        style={{
          padding: '0.5rem',
          borderRadius: 'var(--radius-icon)',
          color: config.color,
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--accent-muted)';
          e.currentTarget.style.borderColor = 'var(--border-accent)';
          e.currentTarget.style.boxShadow = '0 0 12px var(--accent-glow)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--bg-glass)';
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <span
          className={animating ? 'animate-theme-swap' : ''}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon size={18} />
        </span>
        {/* Next-theme indicator dot */}
        <span
          className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full"
          style={{ background: config.dotColor, boxShadow: `0 0 4px ${config.dotColor}` }}
        />
      </button>
    );
  }

  // Full pill version
  return (
    <button
      onClick={handleToggle}
      className="theme-toggle"
      title={`Theme: ${config.label} — click to switch`}
      aria-label="Switch theme"
    >
      <span
        className={animating ? 'animate-theme-swap' : ''}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: config.color,
          transition: 'color 0.3s ease',
        }}
      >
        <Icon size={14} />
      </span>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', fontFamily: 'var(--font-body)' }}>
        {config.label}
      </span>
    </button>
  );
}

export default ThemeToggle;
