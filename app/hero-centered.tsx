'use client';

import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { bootcamps } from './bootcamp-data';
import { pad, usePrefersReducedMotion } from './bootcamp-shared';
import { HeroTile } from './hero-tiles';

const SLOTS = 6;

// The hero copy centred and surrounded by one live illustration per bootcamp.
// Six tiles are on show at a time and swap in turn; hovering pauses the rotation.
export default function HeroCentered({ actions, Tile = HeroTile, bare = false }: { actions: ReactNode; Tile?: ComponentType<{ id: string }>; bare?: boolean }) {
  // Six positions around the copy, like a gallery wall; the ten bootcamps rotate through them.
  const [wall, setWall] = useState({ slots: [0, 1, 2, 3, 4, 5], next: 6, turn: 0, focus: 0 });
  const [hovering, setHovering] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (hovering || reduced) return;
    const timer = window.setTimeout(() => setWall(({ slots, next, turn }) => {
      // Swap the next position in turn for the next bootcamp that is not already on the wall.
      let candidate = next % bootcamps.length;
      while (slots.includes(candidate)) candidate = (candidate + 1) % bootcamps.length;
      const slot = turn % SLOTS;
      return { slots: slots.map((b, k) => k === slot ? candidate : b), next: candidate + 1, turn: turn + 1, focus: slot };
    }), 3200);
    return () => window.clearTimeout(timer);
  }, [wall, hovering, reduced]);

  return <section className={`hc ${bare ? 'hc-bare' : ''}`} aria-labelledby="hero-title">
    <div className="hc-dots" aria-hidden="true" />
    <div className="hc-tiles">
      {wall.slots.map((index, slot) => {
        const bootcamp = bootcamps[index];
        return <a key={`${slot}-${bootcamp.id}`} href={bootcamp.url} className={`hc-tile hc-slot-${slot} ${slot === wall.focus ? 'is-focus' : ''}`} aria-label={bootcamp.name}
          onMouseEnter={() => { setWall(w => ({ ...w, focus: slot })); setHovering(true); }} onMouseLeave={() => setHovering(false)}
          onFocus={() => { setWall(w => ({ ...w, focus: slot })); setHovering(true); }} onBlur={() => setHovering(false)}>
          <Tile id={bootcamp.id} />
          <span className="hc-caption">{pad(index)} · {bootcamp.short}</span>
        </a>;
      })}
    </div>

    <div className="hc-copy">
      <h1 id="hero-title">Vizuara Research<span className="title-period">.</span></h1>
      <p className="hc-description">From foundations to publishing at top-tier venues. We run intensive AI &amp; ML research bootcamps that prepare you to write and submit original research papers.</p>
      <div className="hero-actions hc-actions">{actions}</div>
    </div>
  </section>;
}
