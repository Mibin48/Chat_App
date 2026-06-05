import { MoonIcon, ZapIcon, SunIcon } from 'lucide-react';
import { userChatStore } from '../store/userChatStore';
import { useEffect, useState } from 'react';

const THEME_CONFIG = {
  dark: {
    icon: MoonIcon,
    label: 'Dark',
    next: 'midnight',
    color: '#818cf8',
  },
  midnight: {
    icon: ZapIcon,
    label: 'OLED',
    next: 'amethyst',
    color: '#c4b5fd',
  },
  amethyst: {
    icon: SunIcon,
    label: 'Light',
    next: 'dark',
    color: '#4338ca',
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
    // Compact icon-only version for tight spaces
    return (
      <button
        onClick={handleToggle}
        className="btn-icon"
        title={`Theme: ${config.label} — click to switch`}
        style={{ color: config.color }}
        aria-label="Switch theme"
      >
        <span
          className={animating ? 'animate-theme-swap' : ''}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon size={18} />
        </span>
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
      <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.03em' }}>
        {config.label}
      </span>
    </button>
  );
}

export default ThemeToggle;
