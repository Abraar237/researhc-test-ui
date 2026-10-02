'use client';

import { useRef, useState } from 'react';
import { bootcamps } from './bootcamp-data';
import { approach, beginFrame, clamp, isDark, perspective, rgba, rotate, seeded, trackInk, useAutoAdvance, useFrame, useOrbitControls, type V3, type VariantProps } from './bootcamp-shared';
import { SceneLabels, type LabelPoint } from './scene-labels';

const N = bootcamps.length;
const SAMPLES = 150, WIDTH = 270, DEPTH = 170, LIFT = 96;
const CENTER = { x: 390, y: 350 };
// Each ridge is a spectrum with a few drifting peaks, like one channel of a live signal.
const random = seeded(31);
const PEAKS = bootcamps.map(() => Array.from({ length: 4 }, () => ({ c: random() * 1.6 - .8, w: .025 + random() * .09, a: .25 + random() * .75, phase: random() * 6.28, drift: .08 + random() * .12 })));

function spectrum(i: number, x: number, time: number, gain: number) {
  let h = 0;
  for (const p of PEAKS[i]) {
    const c = p.c + Math.sin(time * .35 + p.phase) * p.drift, a = p.a * (.75 + .25 * Math.sin(time * 1.3 + p.phase * 2));
    h += a * Math.exp(-((x - c) ** 2) / (2 * p.w * p.w));
  }
  const noise = .035 * Math.sin(47 * x + time * 3.1 + i) * Math.sin(19 * x - time * 2.3 + i * 2);
  return Math.max(0, (h * .78 + noise + .02) * gain);
}

export default function BootcampSpectra({ active, onActive }: VariantProps) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const gains = useRef(bootcamps.map(() => 1));
  const [labels, setLabels] = useState<(LabelPoint | null)[]>([]);
  const controls = useOrbitControls({ yaw: -.16, pitch: .5 }, { min: .15, max: .95 });
  useAutoAdvance(active, onActive, N, false, 6000);

  useFrame(stage, (dt, time) => {
    const ctx = canvas.current && beginFrame(canvas.current);
    if (!ctx) return;
    const dark = isDark();
    const v = controls.step(Math.cos(time * .15) * .035 * dt);
    const project = (p: V3) => perspective(rotate(p, v.yaw, v.pitch), 1150, CENTER, 1.04);
    gains.current = gains.current.map((g, i) => approach(g, i === active ? 1.45 : .85, dt, 2.2));
    const paper = dark ? '#0b1030' : '#fdfdfb', ink = dark ? '#dfe4ff' : '#1b2559';
    const zOf = (i: number) => (i / (N - 1) - .5) * 2 * DEPTH;

    // Frequency grid on the floor.
    ctx.lineWidth = .6; ctx.strokeStyle = rgba(ink, .09);
    for (let k = 0; k <= 10; k++) { const x = (k / 10 * 2 - 1) * WIDTH, a = project({ x, y: 0, z: -DEPTH - 20 }), b = project({ x, y: 0, z: DEPTH + 20 }); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }

    // Draw back to front so nearer ridges occlude the ones behind, Joy Division style.
    const order = bootcamps.map((_, i) => ({ i, depth: rotate({ x: 0, y: 0, z: zOf(i) }, v.yaw, v.pitch).z })).sort((a, b) => a.depth - b.depth);
    const ends: LabelPoint[] = [];
    for (const { i } of order) {
      const on = i === active, colour = trackInk(bootcamps[i], dark), z = zOf(i);
      const pts = Array.from({ length: SAMPLES + 1 }, (_, k) => { const x = k / SAMPLES * 2 - 1; return project({ x: x * WIDTH, y: spectrum(i, x, time, gains.current[i]) * LIFT, z }); });
      const base0 = project({ x: -WIDTH, y: 0, z }), base1 = project({ x: WIDTH, y: 0, z });
      ctx.beginPath(); ctx.moveTo(base0.x, base0.y); pts.forEach(p => ctx.lineTo(p.x, p.y)); ctx.lineTo(base1.x, base1.y); ctx.closePath();
      if (on) {
        const top = Math.min(...pts.map(p => p.y));
        const fill = ctx.createLinearGradient(0, top, 0, base0.y);
        fill.addColorStop(0, rgba(colour, .34)); fill.addColorStop(1, rgba(colour, .04));
        ctx.fillStyle = paper; ctx.fill(); ctx.fillStyle = fill; ctx.fill();
      } else { ctx.fillStyle = paper; ctx.fill(); }
      ctx.beginPath(); pts.forEach((p, k) => k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
      ctx.strokeStyle = on ? colour : rgba(ink, .55); ctx.lineWidth = on ? 1.8 : 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(base0.x, base0.y); ctx.lineTo(base1.x, base1.y); ctx.strokeStyle = rgba(ink, on ? .3 : .12); ctx.lineWidth = .7; ctx.stroke();
      if (on) {
        // A read-head sweeps the active spectrum and marks its tallest peak.
        const k = Math.floor(((time * .22) % 1) * SAMPLES), head = pts[k];
        ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(head.x, head.y, 3.2, 0, Math.PI * 2); ctx.fill();
        const peak = pts.reduce((best, p) => p.y < best.y ? p : best, pts[0]);
        ctx.setLineDash([2, 3]); ctx.strokeStyle = rgba(colour, .7); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(peak.x, peak.y - 6); ctx.lineTo(peak.x, base0.y + (base1.y - base0.y) * ((peak.x - base0.x) / (base1.x - base0.x))); ctx.stroke(); ctx.setLineDash([]);
      }
      ends[i] = { x: base0.x - 4, y: base0.y, depth: clamp((base0.z + DEPTH) / (2 * DEPTH)), side: 'left' };
    }
    setLabels(ends);
  });

  return <div ref={stage} className="bc-figure bc-draggable" {...controls.handlers}>
    <canvas ref={canvas} className="bc-canvas" aria-hidden="true" />
    <SceneLabels points={labels} active={active} onActive={onActive} emphasis />
  </div>;
}
