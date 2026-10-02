'use client';

import { type CSSProperties } from 'react';
import { bootcamps } from './bootcamp-data';
import { STAGE, pad, trackStyle } from './bootcamp-shared';
import { HeroTile2 } from './hero-tiles-2';

type Placement = 'right' | 'left' | 'above' | 'below';
export type LabelPoint = { x: number; y: number; depth: number; side?: Placement };

// Figures show one program at a time: the active program's live animation, pinned to its point in the scene.
// The card is kept inside the stage so it never spills past an edge.
export function SceneLabels({ points, active, onActive, placement = 'right' }: { points: (LabelPoint | null)[]; active: number; onActive: (index: number) => void; placement?: Placement; compact?: boolean; emphasis?: boolean }) {
  const point = points[active], bootcamp = bootcamps[active];
  if (!point) return null;
  const side = point.side ?? placement;
  const x = point.x / STAGE.width * 100, y = point.y / STAGE.height * 100;
  const left = side === 'left' ? `max(${x}%, 25%)` : side === 'right' ? `min(${x}%, 75%)` : `clamp(13%, ${x}%, 87%)`;
  const top = side === 'above' ? `max(${y}%, 30%)` : side === 'below' ? `min(${y}%, 70%)` : `clamp(16%, ${y}%, 84%)`;
  return <div className="bc-scene-labels">
    <button key={bootcamp.id} type="button" className={`bc-scene-card is-${side}`} aria-label={bootcamp.name}
      style={{ ...trackStyle(bootcamp), left, top } as CSSProperties} onClick={() => onActive((active + 1) % bootcamps.length)}>
      <span className="bc-scene-art"><HeroTile2 id={bootcamp.id} /></span>
      <span className="bc-scene-caption"><span className="bc-scene-num">{pad(active)}</span>{bootcamp.short}</span>
    </button>
  </div>;
}
