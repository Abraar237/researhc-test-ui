'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { TRACKS, bootcamps, type Track } from './bootcamp-data';
import { VIEWS, type ViewId } from './bootcamp-views';

const counts = bootcamps.reduce((total, bootcamp) => ({ ...total, [bootcamp.track]: (total[bootcamp.track] ?? 0) + 1 }), {} as Partial<Record<Track, number>>);

// Navbar dropdown for choosing which figure the hero animates, so the scene itself stays uncluttered.
export default function BootcampViewMenu({ view, onView }: { view: ViewId; onView: (view: ViewId) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const index = VIEWS.findIndex(v => v.id === view);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape); };
  }, [open]);

  return <div ref={root} className={`bc-menu ${open ? 'is-open' : ''}`}>
    <button type="button" className="bc-menu-trigger" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true"><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></svg>
      Figures
      <svg className="bc-menu-chevron" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    {open && <div className="bc-menu-panel" role="group" aria-label="Choose the hero figure">
      <header>
        <span className="bc-kicker"><span aria-hidden="true">✦</span> {bootcamps.length} bootcamps · 3 tracks</span>
        <ul className="bc-legend" aria-label="Tracks">
          {(Object.keys(TRACKS) as Track[]).map(track => <li key={track} style={{ '--track': TRACKS[track].color } as CSSProperties}><i aria-hidden="true" />{TRACKS[track].label}<span>{counts[track]}</span></li>)}
        </ul>
      </header>
      <div className="bc-menu-grid">
        {VIEWS.map((v, i) => <button key={v.id} type="button" aria-pressed={v.id === view} onClick={() => { onView(v.id); setOpen(false); }}>
          <span>{i + 1}</span>{v.label}
        </button>)}
      </div>
      <p className="bc-menu-caption"><em>Fig. {index + 1}.</em> {VIEWS[index].caption}</p>
    </div>}
  </div>;
}
