'use client';

import { useRef, useState } from 'react';
import { bootcamps } from './bootcamp-data';
import { approach, beginFrame, clamp, isDark, mix, perspective, rgba, rotate, trackInk, useAutoAdvance, useFrame, useOrbitControls, type V3, type VariantProps } from './bootcamp-shared';
import { SceneLabels, type LabelPoint } from './scene-labels';

const N = bootcamps.length;
const RINGS = 28, SPOKES = 96, RADIUS = 200, LIFT = 110, FLOOR = -125;
const CENTER = { x: 396, y: 330 };
// One normal mode of a clamped circular membrane per program: (m, n) and the n-th zero of J_m.
const MODES: [number, number, number][] = [[0, 1, 2.4048], [1, 1, 3.8317], [2, 1, 5.1356], [0, 2, 5.5201], [3, 1, 6.3802], [1, 2, 7.0156], [4, 1, 7.5883], [2, 2, 8.4172], [0, 3, 8.6537], [5, 1, 8.7715]];
const ZEROS: Record<number, number[]> = { 0: [2.4048, 5.5201, 8.6537], 1: [3.8317, 7.0156], 2: [5.1356, 8.4172], 3: [6.3802], 4: [7.5883], 5: [8.7715] };

// Bessel function of the first kind from its integral form, J_m(x) = 1/π ∫₀^π cos(mτ − x sin τ) dτ (Simpson's rule).
function besselJ(m: number, x: number) {
  const n = 60; let sum = 0;
  for (let i = 0; i <= n; i++) { const t = Math.PI * i / n, w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2; sum += w * Math.cos(m * t - x * Math.sin(t)); }
  return sum * (Math.PI / n) / 3 / Math.PI;
}
const PROFILES = MODES.map(([m, , z]) => {
  const p = Array.from({ length: RINGS + 1 }, (_, i) => besselJ(m, z * i / RINGS));
  const peak = Math.max(...p.map(Math.abs));
  return p.map(v => v / peak);
});

export default function BootcampMembrane({ active, onActive }: VariantProps) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const amps = useRef<number[]>(MODES.map((_, i) => i === 0 ? 1 : 0));
  const [labels, setLabels] = useState<(LabelPoint | null)[]>([]);
  const controls = useOrbitControls({ yaw: -.2, pitch: .36 }, { min: .15, max: 1.1 });
  useAutoAdvance(active, onActive, N, false, 6000);

  useFrame(stage, (dt, time) => {
    const ctx = canvas.current && beginFrame(canvas.current);
    if (!ctx) return;
    const dark = isDark();
    const v = controls.step(dt * .06);
    const project = (p: V3) => perspective(rotate(p, v.yaw, v.pitch), 1200, CENTER, 1.02);
    amps.current = amps.current.map((a, k) => approach(a, k === active ? 1 : 0, dt, 1.8));
    const live = MODES.map((mode, k) => ({ mode, k, a: amps.current[k] })).filter(x => x.a > .01);
    const disp = (i: number, theta: number) => live.reduce((s, { mode: [m, , z], k, a }) => s + a * PROFILES[k][i] * Math.cos(m * theta + .35 * k) * Math.cos(z * .62 * time), 0);
    const point = (r: number, theta: number, y: number): V3 => ({ x: Math.cos(theta) * r * RADIUS, y, z: Math.sin(theta) * r * RADIUS });

    const d: number[][] = [], s: ReturnType<typeof project>[][] = [];
    for (let i = 0; i <= RINGS; i++) {
      d.push([]); s.push([]);
      for (let j = 0; j <= SPOKES; j++) { const th = j / SPOKES * Math.PI * 2, h = disp(i, th); d[i].push(h); s[i].push(project(point(i / RINGS, th, h * LIFT))); }
    }

    // Base plane with the active mode's nodal lines: nodal circles at inner zeros, m nodal diameters.
    const ink = dark ? '#dfe4ff' : '#1b2559', colour = trackInk(bootcamps[active], dark);
    const [m, n] = MODES[active];
    ctx.beginPath();
    for (let j = 0; j <= 64; j++) { const p = project(point(1.04, j / 64 * Math.PI * 2, FLOOR)); if (j) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
    ctx.fillStyle = dark ? 'rgba(120,140,255,.05)' : 'rgba(36,70,224,.04)'; ctx.fill(); ctx.strokeStyle = rgba(ink, .18); ctx.lineWidth = .8; ctx.stroke();
    ctx.setLineDash([3, 4]); ctx.strokeStyle = rgba(colour, .7); ctx.lineWidth = 1;
    ZEROS[m].slice(0, n - 1).forEach(z0 => { const r = z0 / MODES[active][2]; ctx.beginPath(); for (let j = 0; j <= 64; j++) { const p = project(point(r, j / 64 * Math.PI * 2, FLOOR)); if (j) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); } ctx.stroke(); });
    for (let k = 0; k < m; k++) { const th = (Math.PI / 2 + k * Math.PI - .35 * active) / m, a = project(point(1, th, FLOOR)), b = project(point(1, th + Math.PI, FLOOR)); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    ctx.setLineDash([]);

    // Membrane: rings and spokes, coloured by displacement (pink up, blue down).
    const up = dark ? '#f59ac8' : '#d6589a', down = dark ? '#6f86ff' : '#2446e0', calm = dark ? '#8d96c4' : '#9aa3c2';
    const bands = 14, paths = Array.from({ length: bands }, () => new Path2D());
    const band = (h: number) => Math.min(bands - 1, Math.max(0, Math.floor((clamp(h, -1, 1) + 1) / 2 * bands)));
    for (let i = 1; i <= RINGS; i++) for (let j = 0; j < SPOKES; j++) { const p = paths[band((d[i][j] + d[i][j + 1]) / 2)]; p.moveTo(s[i][j].x, s[i][j].y); p.lineTo(s[i][j + 1].x, s[i][j + 1].y); }
    for (let j = 0; j < SPOKES; j += 4) for (let i = 0; i < RINGS; i++) { const p = paths[band((d[i][j] + d[i + 1][j]) / 2)]; p.moveTo(s[i][j].x, s[i][j].y); p.lineTo(s[i + 1][j].x, s[i + 1][j].y); }
    ctx.lineWidth = .8;
    paths.forEach((path, k) => { const h = (k + .5) / bands * 2 - 1; ctx.strokeStyle = rgba(h > 0 ? mix(calm, up, h * 1.3) : mix(calm, down, -h * 1.3), .3 + Math.abs(h) * .55); ctx.stroke(path); });
    // The clamped rim.
    ctx.beginPath(); s[RINGS].forEach((p, j) => j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.strokeStyle = rgba(ink, .7); ctx.lineWidth = 1.6; ctx.stroke();

    // Program chips around the rim; the active mode's chip is raised.
    setLabels(bootcamps.map((_, k) => {
      const th = k / N * Math.PI * 2 + Math.PI / 2, on = k === active;
      const p = project(point(on ? 1 : 1.13, th, on ? 150 : 0));
      if (on) { const a = project(point(1, th, 0)); ctx.strokeStyle = colour; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
      return { x: p.x, y: p.y, depth: clamp((p.z + RADIUS) / (2 * RADIUS)), side: on ? 'above' : p.x < CENTER.x ? 'left' : 'right' };
    }));
  });

  return <div ref={stage} className="bc-figure bc-draggable" {...controls.handlers}>
    <canvas ref={canvas} className="bc-canvas" aria-hidden="true" />
    <SceneLabels points={labels} active={active} onActive={onActive} emphasis />
  </div>;
}
