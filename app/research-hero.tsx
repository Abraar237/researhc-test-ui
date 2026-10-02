'use client';

import Image from 'next/image';
import { useState } from 'react';
import BootcampShowcase from './bootcamp-showcase';
import BootcampViewMenu from './bootcamp-view-menu';
import type { ViewId } from './bootcamp-views';
import HeroCentered from './hero-centered';
import { HeroTile2 } from './hero-tiles-2';
import { HeroTile3D } from './hero-tiles-3d';
import ThemeToggle from './theme-toggle';

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'arrow' && <path d="M5 12h14m-5-5 5 5-5 5" />}
    {name === 'external' && <path d="M6 18 18 6M6 6h12v12" />}
    {name === 'book' && <><path d="M12 5v15M3 4c4-1 6 0 9 2 3-2 5-3 9-2v14c-4-1-6 0-9 2-3-2-5-3-9-2Z" /></>}
    {name === 'pause' && <><path d="M8 5v14M16 5v14" /></>}
    {name === 'play' && <path d="m8 5 11 7-11 7Z" />}
    {name === 'chevron' && <path d="m9 5 7 7-7 7" />}
    {name === 'chevron-left' && <path d="m15 5-7 7 7 7" />}
    {name === 'network' && <><circle cx="12" cy="12" r="3" /><circle cx="4" cy="5" r="2" /><circle cx="20" cy="5" r="2" /><circle cx="4" cy="20" r="2" /><circle cx="20" cy="20" r="2" /><path d="m6 7 4 3m4 0 4-3M6 18l4-4m4 0 4 4" /></>}
    {name === 'menu' && <path d="M4 7h16M4 12h16M4 17h16" />}
    {name === 'close' && <path d="m6 6 12 12M6 18 18 6" />}
  </svg>;
}

// Hero layouts: two centred galleries of live bootcamp tiles (simulations, then real-world scenes) and the split atlas.
const LAYOUTS = [{ id: 'gallery', label: 'Gallery' }, { id: 'gallery2', label: 'Gallery 2' }, { id: 'gallery3d', label: 'Gallery 3D' }, { id: 'atlas', label: 'Atlas' }] as const;

const navLinks = [['Team', '/team'], ['Programs', '/#programs'], ['Publications', '/publications'], ['Upcoming Venues', '/upcoming-venues'], ['FAQ', '/faq']];


export default function ResearchHero() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<ViewId>('landscape');
  const [layout, setLayout] = useState(0);
  const shift = (step: number) => setLayout(l => (l + step + LAYOUTS.length) % LAYOUTS.length);
  const actions = <>
    <a className="button button-primary" href="https://research.vizuara.ai/#programs">Explore Programs <Icon name="arrow" /></a>
    <a className="button button-secondary" href="https://research.vizuara.ai/publications"><Icon name="book" /> Read Our Research</a>
  </>;

  return <main className="page">
    <div className="ambient" aria-hidden="true" />
    <div className="floor-grid" aria-hidden="true" />
    <div className="hero-stage">
    <header className="site-header">
      <a className="brand" href="https://research.vizuara.ai/" aria-label="Vizuara Research home"><Image src="/brand/vizuara.png" width={30} height={30} priority alt="" /><span className="brand-name">Vizuara</span></a>
      <nav aria-label="Main navigation" className={menuOpen ? 'navigation open' : 'navigation'}>
        {navLinks.map(([label, path]) => <a key={label} href={`https://research.vizuara.ai${path}`}>{label}</a>)}
        <div className="hero-toggle" role="group" aria-label="Hero layout">
          <button type="button" aria-label="Previous hero layout" onClick={() => shift(-1)}><Icon name="chevron-left" size={14} /></button>
          <span aria-live="polite">{LAYOUTS[layout].label}</span>
          <button type="button" aria-label="Next hero layout" onClick={() => shift(1)}><Icon name="chevron" size={14} /></button>
        </div>
        {LAYOUTS[layout].id === 'atlas' && <BootcampViewMenu view={view} onView={setView} />}
        <span className="nav-divider" /><ThemeToggle />
      </nav>
      <button className="mobile-menu icon-button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button>
    </header>

    {LAYOUTS[layout].id === 'gallery' ? <HeroCentered actions={actions} /> : LAYOUTS[layout].id === 'gallery2' ? <HeroCentered key="gallery2" actions={actions} Tile={HeroTile2} /> : LAYOUTS[layout].id === 'gallery3d' ? <HeroCentered key="gallery3d" actions={actions} Tile={HeroTile3D} bare /> : <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <div className="eyebrow"><span className="little-star">✦</span> TOP-TIER RESEARCH PROGRAMS</div>
        <h1 id="hero-title">Vizuara<br />Research<span className="title-period">.</span></h1>
        <p className="hero-description">From foundations to publishing at top-tier venues. We run intensive AI &amp; ML research bootcamps that prepare you to write and submit original research papers.</p>
        <div className="hero-actions">{actions}</div>
        <div className="hero-footnote"><span className="status-dot" /><span>Real questions. Rigorous research. <strong>Your contribution.</strong></span></div>
        <div className="explore-note"><svg width="48" height="30" viewBox="0 0 48 30" fill="none" aria-hidden="true"><path d="M2 8c18 22 28 16 41-3m-12 2L44 3l-1 13" stroke="currentColor" strokeWidth="1.2" /></svg><span>A little window into what we’re building</span></div>
      </div>

      <div className="research-atlas" id="research-atlas" aria-label="Research bootcamps">
        <BootcampShowcase view={view} />
      </div>
    </section>}
    </div>


  </main>;
}
