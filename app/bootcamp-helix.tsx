'use client';

import { useRef, useState, type CSSProperties } from 'react';
import BootcampGlyph from './bootcamp-glyph';
import { TRACKS, bootcamps } from './bootcamp-data';
import { STAGE, trackStyle, useAutoAdvance, useFrame, type VariantProps } from './bootcamp-shared';

const N = bootcamps.length;
const AXIS = STAGE.width / 2;
const TOP = 44, BOTTOM = 596;
const RADIUS = 74;
const TWIST = 2.35 / N;
const FOCAL = 700;
const PITCH = .14;
const rungY = (index: number) => TOP + (BOTTOM - TOP) * (index + .5) / N;

// A point on strand `phase` (0 or π) at height y, seen with a slight downward camera pitch.
function strand(y: number, phase: number, spin: number) {
  const angle = (y - TOP) / (BOTTOM - TOP) * N * TWIST * Math.PI * 2 + spin + phase;
  const z = Math.sin(angle) * RADIUS;
  const scale = FOCAL / (FOCAL - z);
  return { x: AXIS + Math.cos(angle) * RADIUS * scale, y: y + z * PITCH, z, scale };
}

export default function BootcampHelix({ active, onActive }: VariantProps) {
  const stage = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [time, setTime] = useState(0);
  useFrame(stage, (_, now) => setTime(now));
  useAutoAdvance(active, onActive, N, hovering, 3800);

  const spin = time * .42;
  const segments: { d: string; z: number; phase: number }[] = [];
  for (const phase of [0, Math.PI]) {
    for (let i = 0; i < 90; i++) {
      const a = strand(TOP - 18 + (BOTTOM - TOP + 36) * i / 90, phase, spin), b = strand(TOP - 18 + (BOTTOM - TOP + 36) * (i + 1) / 90, phase, spin);
      segments.push({ d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`, z: (a.z + b.z) / 2, phase });
    }
  }
  const rungs = bootcamps.map((bootcamp, index) => {
    const y = rungY(index), a = strand(y, 0, spin), b = strand(y, Math.PI, spin);
    const left = index % 2 === 0;
    const end = left ? (a.x < b.x ? a : b) : (a.x > b.x ? a : b);
    return { bootcamp, index, a, b, end, left, y };
  });
  const strandPaint = (z: number, phase: number) => ({ stroke: phase ? '#6f59b8' : '#2446e0', strokeOpacity: .18 + (z + RADIUS) / (RADIUS * 2) * .62, strokeWidth: 1 + (z + RADIUS) / (RADIUS * 2) * 1.8 });

  return <div ref={stage} className="bc-helix" onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
    onFocusCapture={() => setHovering(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setHovering(false); }}>
    <svg className="bc-layer" viewBox={`0 0 ${STAGE.width} ${STAGE.height}`} aria-hidden="true">
      <defs><linearGradient id="bc-helix-glow" x1="0" x2="1"><stop stopColor="#5c7bff" stopOpacity="0" /><stop offset=".5" stopColor="#5c7bff" stopOpacity=".13" /><stop offset="1" stopColor="#5c7bff" stopOpacity="0" /></linearGradient></defs>
      <rect x={AXIS - 150} y={TOP - 30} width="300" height={BOTTOM - TOP + 60} rx="150" fill="url(#bc-helix-glow)" />
      <path d={`M${AXIS} ${TOP - 26}V${BOTTOM + 26}`} stroke="#aebbe0" strokeWidth=".7" strokeDasharray="2 6" />
      {segments.filter(s => s.z < 0).map((s, i) => <path key={`b${i}`} d={s.d} strokeLinecap="round" {...strandPaint(s.z, s.phase)} />)}
      {rungs.map(({ bootcamp, index, a, b, end, left, y }) => {
        const color = TRACKS[bootcamp.track].color, on = index === active;
        const labelX = left ? AXIS - 150 : AXIS + 150;
        const pulse = (time * .8) % 1;
        return <g key={bootcamp.id}>
          <path d={`M${a.x} ${a.y}L${b.x} ${b.y}`} stroke={on ? color : '#9fb0de'} strokeOpacity={on ? .9 : .45} strokeWidth={on ? 2.2 : 1.1} />
          <path d={`M${end.x} ${end.y}C${(end.x + labelX) / 2} ${end.y} ${(end.x + labelX) / 2} ${y} ${labelX} ${y}`} stroke={color} strokeOpacity={on ? .7 : .2} strokeWidth=".9" fill="none" strokeDasharray={on ? undefined : '2 4'} />
          {on && <circle cx={a.x + (b.x - a.x) * pulse} cy={a.y + (b.y - a.y) * pulse} r="3" fill={color} />}
          <circle cx={labelX} cy={y} r={on ? 3.2 : 2} fill={color} fillOpacity={on ? 1 : .5} />
        </g>;
      })}
      {segments.filter(s => s.z >= 0).map((s, i) => <path key={`f${i}`} d={s.d} strokeLinecap="round" {...strandPaint(s.z, s.phase)} />)}
      {rungs.map(({ bootcamp, index, a, b }) => [a, b].map((p, k) => <circle key={`${bootcamp.id}${k}`} cx={p.x} cy={p.y} r={(index === active ? 4.2 : 3) * p.scale} fill={p.z >= 0 ? '#fff' : '#eef1fb'} stroke={TRACKS[bootcamp.track].color} strokeOpacity={p.z >= 0 ? .9 : .35} strokeWidth="1.2" />))}
    </svg>

    <div className="bc-helix-labels">
      {rungs.map(({ bootcamp, index, left, y }) => {
        const on = index === active;
        return <div key={bootcamp.id} className={`bc-helix-label ${left ? 'is-left' : 'is-right'} ${on ? 'is-active' : ''}`} style={{ ...trackStyle(bootcamp), top: `${y / STAGE.height * 100}%` } as CSSProperties} onMouseEnter={() => onActive(index)}>
          <button type="button" aria-expanded={on} onClick={() => onActive(index)} onFocus={() => onActive(index)}>
            <span className="bc-helix-glyph"><BootcampGlyph id={bootcamp.id} size={15} /></span>
            <span className="bc-helix-name">{bootcamp.short}</span>
            <span className="bc-helix-sub">{bootcamp.duration}</span>
          </button>
        </div>;
      })}
    </div>
  </div>;
}
