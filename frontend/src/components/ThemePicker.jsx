// src/components/ThemePicker.jsx
import { useEffect } from 'react';
import { userChatStore } from '../store/userChatStore';

// Define theme swatches (same as previous config)
const SWATCHES = [
  { id: 'dark', bg: '#6366f1', label: 'Aether Dark' },
  { id: 'midnight', bg: '#7c3aed', label: 'Midnight' },
  { id: 'amethyst', bg: '#f4f4fa', border: '#4338ca', label: 'Amethyst' },
];

/**
 * ThemePicker – a premium glass‑morphed theme selector used in the sidebar and settings.
 * It reads the current theme from the global store and updates it on click.
 */
export default function ThemePicker() {
  const { theme, setTheme } = userChatStore();

  // Ensure the HTML element reflects the selected theme (in case the picker is the first UI that changes it).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
