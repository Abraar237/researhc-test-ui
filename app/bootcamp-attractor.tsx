'use client';

import { useRef, useState } from 'react';
import { bootcamps } from './bootcamp-data';
import { trackInk, isDark, beginFrame, clamp, mix, perspective, rgba, rotate, useAutoAdvance, useFrame, useHoverPause, useOrbitControls, wrap, type V3, type VariantProps } from './bootcamp-shared';
import { SceneLabels, type LabelPoint } from './scene-labels';

const N = bootcamps.length;
const CENTER = { x: 380, y: 305 };
const SCALE = 7.6;
// Integrate the Lorenz system once (σ = 10, ρ = 28, β = 8/3) with RK4.
const TRAJECTORY: V3[] = (() => {
  const f = (p: V3): V3 => ({ x: 10 * (p.y - p.x), y: p.x * (28 - p.z) - p.y, z: p.x * p.y - 8 / 3 * p.z });
  const add = (p: V3, q: V3, k: number): V3 => ({ x: p.x + q.x * k, y: p.y + q.y * k, z: p.z + q.z * k });
  let p: V3 = { x: .1, y: 0, z: 0 };
  const out: V3[] = [], h = .0055;
  for (let i = 0; i < 7800; i++) {
    const k1 = f(p), k2 = f(add(p, k1, h / 2)), k3 = f(add(p, k2, h / 2)), k4 = f(add(p, k3, h));
    p = { x: p.x + h / 6 * (k1.x + 2 * k2.x + 2 * k3.x + k4.x), y: p.y + h / 6 * (k1.y + 2 * k2.y + 2 * k3.y + k4.y), z: p.z + h / 6 * (k1.z + 2 * k2.z + 2 * k3.z + k4.z) };
    if (i >= 800) out.push({ x: p.x * SCALE, y: (p.z - 24) * SCALE, z: p.y * SCALE });
  }
  return out;
})();
const L = TRAJECTORY.length;
// Spread markers along the flow, alternating between the two lobes.
const MARKERS = bootcamps.map((_, i) => {
  const start = Math.floor((i + .2) * L / N), side = i % 2 ? 1 : -1;
  for (let k = start; k < start + L / N; k++) if (Math.sign(TRAJECTORY[k % L].x) === side && Math.abs(TRAJECTORY[k % L].x) > 55) return k % L;
  return start;
});
const CHUNK = 24;

export default function BootcampAttractor({ active, onActive }: VariantProps) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const head = useRef(MARKERS[0]);
  const [labels, setLabels] = useState<(LabelPoint | null)[]>([]);
  const [paused, hover] = useHoverPause();
  const controls = useOrbitControls({ yaw: .5, pitch: .18 }, { min: -.5, max: .7 });
  useAutoAdvance(active, onActive, N, paused, 4400);

  useFrame(stage, (dt, time) => {
    const ctx = canvas.current && beginFrame(canvas.current);
    if (!ctx) return;
    const v = controls.step(dt * .11);
    const project = (p: V3) => perspective(rotate(p, v.yaw, v.pitch), 1000, CENTER);
    const depth = (z: number) => clamp((z + 160) / 320);

    // The tracer only ever moves forward along the flow, fast when far and easing into the marker.
    const remaining = wrap(MARKERS[active] - head.current, L);
    if (remaining > 2) {
      const next = head.current + Math.min(remaining, clamp(remaining * 2.4, 240, 4200) * dt);
      head.current = wrap(next, L);
    }
    const dark = isDark(), paper = dark ? '#0b1030' : '#fff';
    const color = trackInk(bootcamps[active], dark);
    const screen = TRAJECTORY.map(project);

    for (let i = 0; i < L - 1; i += CHUNK) {
      const end = Math.min(L - 1, i + CHUNK), mid = screen[(i + end) >> 1];
      ctx.beginPath(); ctx.moveTo(screen[i].x, screen[i].y);
      for (let k = i + 1; k <= end; k++) ctx.lineTo(screen[k].x, screen[k].y);
      const hue = .5 + .5 * Math.sin(i / L * Math.PI * 4);
      ctx.strokeStyle = rgba(dark ? mix('#7c94ff', '#b3a3f5', hue) : mix('#2446e0', '#6f59b8', hue), .12 + depth(mid.z) * .4); ctx.lineWidth = .5 + depth(mid.z) * .7; ctx.stroke();
    }

    // Particles drifting along the flow, so the attractor always feels alive.
    for (let k = 0; k < 46; k++) {
      const p = screen[Math.floor(wrap(time * 260 + k * (L / 46), L))];
      ctx.fillStyle = rgba(dark ? '#9fb0ff' : '#4f6cf0', .2 + depth(p.z) * .5); ctx.beginPath(); ctx.arc(p.x, p.y, 1.2 * p.scale, 0, Math.PI * 2); ctx.fill();
    }

    // Comet tail behind the tracer.
    const h = Math.floor(head.current), tail = 320;
    for (let k = tail; k > 0; k -= 2) {
      const a = screen[wrap(h - k, L)], b = screen[wrap(h - k + 2, L)], t = 1 - k / tail;
      ctx.strokeStyle = rgba(color, t * .9); ctx.lineWidth = .6 + t * 3.2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }

    const markers = MARKERS.map(m => screen[m]);
    markers.forEach((p, i) => {
      const on = i === active, c = trackInk(bootcamps[i], dark);
      ctx.fillStyle = on ? c : paper; ctx.strokeStyle = c; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(p.x, p.y, (on ? 5.5 : 3.8) * p.scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    });

    const tip = screen[h], pulse = .5 + .5 * Math.sin(time * 5);
    const glow = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 22);
    glow.addColorStop(0, rgba(color, .45)); glow.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(tip.x, tip.y, 22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = paper; ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tip.x, tip.y, 4 + pulse, 0, Math.PI * 2); ctx.fill(); ctx.stroke();


    setLabels(markers.map(p => ({ x: p.x, y: p.y, depth: depth(p.z), side: p.x < CENTER.x ? 'left' : 'right' })));
  });

  return <div ref={stage} className="bc-figure bc-draggable" {...hover} {...controls.handlers}>
    <canvas ref={canvas} className="bc-canvas" aria-hidden="true" />
    <SceneLabels points={labels} active={active} onActive={onActive} compact />
  </div>;
}
