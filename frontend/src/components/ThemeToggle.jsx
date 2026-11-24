import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const KEY = 'saffron-table:theme';
const current = () => document.documentElement.dataset.theme || 'light';

/** Switches between light and dark mode; the choice is remembered in localStorage. */
export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(current);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#14110e' : '#c2410c');
  }, [theme]);

  // Keep every tab in sync.
  useEffect(() => {
    const onStorage = (e) => { if (e.key === KEY && e.newValue) setTheme(e.newValue); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
  };

  const dark = theme === 'dark';
  return (
    <button
      type="button" className={`icon-btn theme-toggle ${className}`} onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
