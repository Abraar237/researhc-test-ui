'use client';

import { useRef, useState } from 'react';
import { bootcamps } from './bootcamp-data';
import { beginFrame, clamp, isDark, mix, perspective, rgba, rotate, trackInk, useAutoAdvance, useFrame, useOrbitControls, type V3, type VariantProps } from './bootcamp-shared';
import { SceneLabels, type LabelPoint } from './scene-labels';

const N = bootcamps.length;
const GRID = 64, SPAN = 240, LIFT = 52;
const CENTER = { x: 380, y: 372 };
const K = 15, OMEGA = 2.1;
// Programs sit on a ring between the two sources, where the fringes are most legible.
const SPOTS = bootcamps.map((_, i) => { const a = i / N * Math.PI * 2 + Math.PI / N; return { x: Math.cos(a) * .72, y: Math.sin(a) * .62 }; });

function sources(time: number) {
  return [{ x: -.42, y: -.08 + Math.sin(time * .21) * .12 }, { x: .42, y: .1 + Math.cos(time * .17) * .12 }];
}
// Superposed circular waves with 1/(1+r) spreading loss, normalised to roughly [-1, 1].
function height(x: number, y: number, time: number, src: { x: number; y: number }[]) {
  let h = 0;
  for (const s of src) { const r = Math.hypot(x - s.x, y - s.y); h += Math.sin(K * r - OMEGA * time) / (1 + 2.4 * r); }
  return h * .62;
}

export default function BootcampInterference({ active, onActive }: VariantProps) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [labels, setLabels] = useState<(LabelPoint | null)[]>([]);
  const controls = useOrbitControls({ yaw: -.28, pitch: .36 }, { min: .14, max: .95 });
  useAutoAdvance(active, onActive, N, false, 6000);

  useFrame(stage, (dt, time) => {
    const ctx = canvas.current && beginFrame(canvas.current);
    if (!ctx) return;
    const dark = isDark();
    const v = controls.step(Math.cos(time * .13) * .04 * dt);
    const project = (p: V3) => perspective(rotate(p, v.yaw, v.pitch), 1150, CENTER, 1.06);
    const world = (x: number, y: number, h: number): V3 => ({ x: x * SPAN, y: h * LIFT, z: y * SPAN });
    const src = sources(time);
    const trough = dark ? '#6f86ff' : '#2446e0', crest = dark ? '#f59ac8' : '#d6589a', calm = dark ? '#8d96c4' : '#9aa3c2';
    const colour = (h: number) => h < 0 ? mix(calm, trough, clamp(-h * 1.4)) : mix(calm, crest, clamp(h * 1.4));

    const heights: number[][] = [], screen: ReturnType<typeof project>[][] = [];
    for (let j = 0; j <= GRID; j++) {
      heights.push([]); screen.push([]);
      for (let i = 0; i <= GRID; i++) {
        const x = i / GRID * 2 - 1, y = j / GRID * 2 - 1, h = height(x, y, time, src);
        heights[j].push(h); screen[j].push(project(world(x, y, h)));
      }
    }

    // Shadow plane.
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => project(world(x, y, -1.9)));
    ctx.beginPath(); corners.forEach((c, k) => k ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y)); ctx.closePath();
    ctx.fillStyle = dark ? 'rgba(120,140,255,.05)' : 'rgba(36,70,224,.035)'; ctx.fill();

    // Scanlines along x read like a stack of waveforms; sparse cross lines keep the surface legible.
    const bands = 14, paths = Array.from({ length: bands }, () => new Path2D());
    const band = (h: number) => Math.min(bands - 1, Math.max(0, Math.floor((h + 1) / 2 * bands)));
    for (let j = 0; j <= GRID; j++) for (let i = 0; i < GRID; i++) {
      const a = screen[j][i], b = screen[j][i + 1], p = paths[band((heights[j][i] + heights[j][i + 1]) / 2)];
      p.moveTo(a.x, a.y); p.lineTo(b.x, b.y);
      if (i % 4 === 0 && j < GRID) { const c = screen[j + 1][i]; p.moveTo(a.x, a.y); p.lineTo(c.x, c.y); }
    }
    ctx.lineWidth = .8;
    paths.forEach((path, k) => { const h = (k + .5) / bands * 2 - 1; ctx.strokeStyle = rgba(colour(h), .32 + Math.abs(h) * .5); ctx.stroke(path); });

    // Sources: pins with outgoing wavefront rings.
    src.forEach(s => {
      const base = project(world(s.x, s.y, height(s.x, s.y, time, src))), top = project(world(s.x, s.y, 1.9));
      ctx.strokeStyle = dark ? 'rgba(223,228,255,.55)' : 'rgba(27,37,89,.5)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      ctx.fillStyle = dark ? '#dfe4ff' : '#1b2559'; ctx.beginPath(); ctx.arc(top.x, top.y, 3, 0, Math.PI * 2); ctx.fill();
    });

    // Programs ride the surface; the active one gets a pole, a ring and the label.
    const markers = SPOTS.map((s, i) => {
      const h = height(s.x, s.y, time, src), on = i === active, c = trackInk(bootcamps[i], dark);
      const base = project(world(s.x, s.y, h)), top = project(world(s.x, s.y, on ? 3.6 : h + .9));
      if (on) {
        ctx.beginPath();
        for (let k = 0; k <= 40; k++) { const a = k / 40 * Math.PI * 2, x = s.x + Math.cos(a) * .07, y = s.y + Math.sin(a) * .07, p = project(world(x, y, height(x, y, time, src))); if (k) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }
        ctx.strokeStyle = c; ctx.lineWidth = 1.6; ctx.stroke();
      }
      ctx.strokeStyle = rgba(c, on ? .8 : .45); ctx.lineWidth = on ? 1.4 : .8; ctx.setLineDash(on ? [] : [2, 3]);
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = on ? c : dark ? '#0b1030' : '#fff'; ctx.strokeStyle = c; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(base.x, base.y, on ? 4.2 : 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      return { x: top.x, y: top.y, depth: clamp((top.z + 240) / 480) };
    });
    setLabels(markers);
  });

  return <div ref={stage} className="bc-figure bc-draggable" {...controls.handlers}>
    <canvas ref={canvas} className="bc-canvas" aria-hidden="true" />
    <SceneLabels points={labels} active={active} onActive={onActive} emphasis placement="above" />
  </div>;
}
