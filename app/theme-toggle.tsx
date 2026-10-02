'use client';

import { useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';
const KEY = 'vizuara-theme';

// The theme lives on <html data-theme>, set before paint by the script in layout.tsx.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}
const read = (): Theme => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => 'light' as Theme);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  return <button type="button" className="theme-toggle icon-button" aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}
    onClick={() => { document.documentElement.dataset.theme = next; try { localStorage.setItem(KEY, next); } catch {} }}>
    {theme === 'dark'
      ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
      : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>}
  </button>;
}
