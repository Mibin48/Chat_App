// src/components/ThemePicker.jsx
import { useEffect } from 'react';
import { userChatStore } from '../store/userChatStore';

// Define theme swatches (same as previous config)
const SWATCHES = [
  {
    id: 'dark',
    bg: '#6366f1',
    label: 'Aether Dark',
    desc: 'Futuristic neon indigo, sleek semi-transparent glass.',
    gradient: 'linear-gradient(135deg, #120e3d 0%, #251352 100%)'
  },
  {
    id: 'midnight',
    bg: '#7c3aed',
    label: 'Midnight',
    desc: 'Ultra-dark deep void, rich high-contrast purple details.',
    gradient: 'linear-gradient(135deg, #180539 0%, #2f015a 100%)'
  },
  {
    id: 'amethyst',
    bg: '#e0deffff',
    border: '#4338ca',
    label: 'Amethyst',
    desc: 'Crisp light pastel lavender, rich dark indigo text.',
    gradient: 'linear-gradient(135deg, #dedaf2 0%, #e7def7 100%)'
  },
];

/**
 * ThemePicker – a premium glass‑morphed theme selector used in the sidebar and settings.
 * It reads the current theme from the global store and updates it on click.
 */
export default function ThemePicker({ showLabels = false }) {
  const { theme, setTheme } = userChatStore();

  // Ensure the HTML element reflects the selected theme (in case the picker is the first UI that changes it).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (showLabels) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {SWATCHES.map((s) => {
          const isSelected = theme === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setTheme(s.id)}
              className="group flex flex-col w-full rounded-2xl border text-left overflow-hidden transition-all duration-300 active:scale-[0.98]"
              style={{
                background: isSelected ? 'var(--bg-glass-hover)' : 'var(--bg-input)',
                borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                boxShadow: isSelected ? 'var(--shadow-lift), 0 0 20px var(--accent-glow)' : 'none',
              }}
            >
              {/* Theme Mini Header Preview */}
              <div
                className="w-full h-14 relative flex-shrink-0 transition-transform duration-500 group-hover:scale-105"
                style={{ background: s.gradient }}
              >
                {/* Accent line */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-[3px]"
                  style={{ background: s.bg }}
                />
                {/* Floating Preview Bubble inside Header */}
                <div className="absolute right-3 top-3 flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                  <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <span className="w-2 h-2 rounded-full" style={{ background: s.bg, boxShadow: `0 0 8px ${s.bg}` }} />
                </div>
              </div>

              {/* Theme Metadata Info */}
              <div className="p-4 flex-1 flex flex-col justify-between gap-1 w-full relative">
                {/* Selection Ring/Checkmark Indicator */}
                {isSelected && (
                  <span
                    className="absolute -top-3.5 left-4 w-6 h-6 rounded-full flex items-center justify-center border text-white text-[9px] font-bold"
                    style={{
                      background: 'var(--accent-primary)',
                      borderColor: 'var(--bg-surface)',
                      boxShadow: '0 4px 10px var(--accent-glow)'
                    }}
                  >
                    ✓
                  </span>
                )}

                <div className="mt-1">
                  <h4
                    className="text-xs font-bold tracking-tight mb-1"
                    style={{ color: isSelected ? 'var(--text-accent)' : 'var(--text-primary)' }}
                  >
                    {s.label}
                  </h4>
                  <p className="text-[10px] leading-normal opacity-70" style={{ color: 'var(--text-secondary)' }}>
                    {s.desc}
                  </p>
                </div>

                {/* Footer preview colors */}
                <div className="flex items-center gap-1.5 mt-3 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span className="text-[9px] uppercase tracking-wider font-bold opacity-45" style={{ color: 'var(--text-muted)' }}>
                    Palette
                  </span>
                  <div className="flex gap-1 ml-auto">
                    <span className="w-3 h-3 rounded-full border" style={{ background: s.bg, borderColor: 'var(--border-subtle)' }} />
                    <span className="w-3 h-3 rounded-full border" style={{ background: s.id === 'amethyst' ? '#ffffff' : '#0d0d24', borderColor: 'var(--border-subtle)' }} />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="glass-panel p-3 rounded-2xl flex flex-col items-center gap-2"
      style={{ background: 'var(--bg-glass-panel)', borderColor: 'var(--border-subtle)' }}
    >
      {SWATCHES.map((s) => (
        <button
          key={s.id}
          onClick={() => setTheme(s.id)}
          className={`theme-swatch ${theme === s.id ? 'active' : ''}`}
          style={{
            background: s.bg,
            border: `2px solid ${s.border || 'transparent'}`,
            boxShadow: theme === s.id ? `0 0 0 2px var(--bg-rail), 0 0 0 4px ${s.border || s.bg}` : 'none',
          }}
          title={s.label}
          aria-label={`Switch to ${s.label} theme`}
        />
      ))}
    </div>
  );
}
