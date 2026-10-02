'use client';

import { useRef, useState } from 'react';
import { bootcamps } from './bootcamp-data';
import { trackInk, isDark, approach, beginFrame, clamp, mix, perspective, rgba, rotate, useFrame, usePrefersReducedMotion, useOrbitControls, type V3, type VariantProps } from './bootcamp-shared';
import { SceneLabels, type LabelPoint } from './scene-labels';

const N = bootcamps.length;
const GRID = 46;
const SPAN = 235, LIFT = 200, BASE = -118, FLOOR = -140;
const CENTER = { x: 380, y: 352 };
// The active program's card rides well above the highest ridge so it never sits inside the surface.
const ACTIVE_HEIGHT = 214;
const TRAVEL = 2.6, DWELL = 6;
const SIGMA = .15;
// Ten minima laid out on a golden-angle spiral so none shadow each other.
const WELLS = bootcamps.map((_, i) => { const r = .22 + .62 * Math.sqrt((i + .5) / N), a = i * 2.39996 + .6; return { x: Math.cos(a) * r, y: Math.sin(a) * r }; });

function loss(x: number, y: number, time: number, deepen: number[]) {
  let h = .56 + .2 * (x * x + y * y) + .05 * Math.sin(3.1 * x + time * .5) * Math.cos(2.7 * y - time * .3);
  for (let i = 0; i < N; i++) {
    const dx = x - WELLS[i].x, dy = y - WELLS[i].y;
    h -= (.3 + deepen[i] * .14) * Math.exp(-(dx * dx + dy * dy) / (2 * SIGMA * SIGMA));
  }
  return h;
}
const world = (x: number, y: number, h: number): V3 => ({ x: x * SPAN, y: BASE + h * LIFT, z: y * SPAN });
const STOPS = ['#1a33c7', '#4c55d6', '#7d63c4', '#b7b2e8', '#e4e8fb'];
const ramp = (t: number) => { const s = clamp(t) * (STOPS.length - 1), i = Math.min(STOPS.length - 2, Math.floor(s)); return mix(STOPS[i], STOPS[i + 1], s - i); };

export default function BootcampLandscape({ active, onActive }: VariantProps) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const deepen = useRef(bootcamps.map(() => 0));
  const ball = useRef({ to: -1, from: { x: 0, y: 0 }, u: 1, dwell: 0, arrived: true, trail: [] as V3[] });
  const request = useRef<number | null>(null);
  const [labels, setLabels] = useState<(LabelPoint | null)[]>([]);
  // A low, almost side-on camera that sways gently instead of spinning away.
  const controls = useOrbitControls({ yaw: -.32, pitch: .3 }, { min: .12, max: .95 });

  const reduced = usePrefersReducedMotion();
  useFrame(stage, (dt, time) => {
    const ctx = canvas.current && beginFrame(canvas.current);
    if (!ctx) return;
    const v = controls.step(Math.cos(time * .14) * .042 * dt);
    const project = (p: V3) => perspective(rotate(p, v.yaw, v.pitch), 1150, CENTER, 1.08);

    // The optimiser decides the tour: it rests in a minimum, then rolls to the next one on its own,
    // and a program is only highlighted once the ball has settled into its basin.
    const b = ball.current;
    const position = () => { const e = b.u < 1 ? .5 - .5 * Math.cos(Math.PI * b.u) : 1, to = WELLS[b.to]; const nx = -(to.y - b.from.y), ny = to.x - b.from.x; const bulge = Math.sin(Math.PI * e) * .2; return { x: b.from.x + (to.x - b.from.x) * e + nx * bulge, y: b.from.y + (to.y - b.from.y) * e + ny * bulge }; };
    const roll = (to: number) => { b.from = position(); b.to = to; b.u = 0; b.arrived = false; b.dwell = 0; };
    if (b.to < 0) { b.to = active; b.from = { ...WELLS[active] }; }
    if (request.current !== null) { if (request.current !== b.to) roll(request.current); request.current = null; }
    b.u = Math.min(1, b.u + dt / TRAVEL);
    if (b.u >= 1 && !b.arrived) { b.arrived = true; b.dwell = 0; if (b.to !== active) onActive(b.to); }
    if (b.arrived && !reduced) { b.dwell += dt; if (b.dwell > DWELL) roll((b.to + 1) % N); }
    deepen.current = deepen.current.map((d, i) => approach(d, i === b.to ? 1 : 0, dt, 1.6));

    // Sample the surface once per frame.
    const heights: number[][] = [];
    for (let i = 0; i <= GRID; i++) {
      heights.push([]);
      for (let j = 0; j <= GRID; j++) heights[i].push(loss(i / GRID * 2 - 1, j / GRID * 2 - 1, time, deepen.current));
    }
    const at = (i: number, j: number) => world(i / GRID * 2 - 1, j / GRID * 2 - 1, heights[i][j]);
    const norm = (h: number) => clamp((h - .2) / .75);

    // Heat-map shadow on the floor, like a contour plot under a surface plot.
    const cell = 2;
    for (let i = 0; i < GRID; i += cell) for (let j = 0; j < GRID; j += cell) {
      const corners = [[i, j], [i + cell, j], [i + cell, j + cell], [i, j + cell]].map(([a, b]) => project({ ...at(a, b), y: FLOOR }));
      ctx.fillStyle = rgba(ramp(norm(heights[i][j])), .12);
      ctx.beginPath(); corners.forEach((c, k) => k ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y)); ctx.fill();
    }

    // Wireframe, batched into colour bands by height.
    const bands = 12, paths = Array.from({ length: bands }, () => new Path2D());
    const screen = heights.map((row, i) => row.map((_, j) => project(at(i, j))));
    for (let i = 0; i <= GRID; i++) for (let j = 0; j <= GRID; j++) {
      const a = screen[i][j];
      if (i < GRID) { const b = screen[i + 1][j], band = Math.min(bands - 1, Math.floor(norm((heights[i][j] + heights[i + 1][j]) / 2) * bands)); paths[band].moveTo(a.x, a.y); paths[band].lineTo(b.x, b.y); }
      if (j < GRID) { const b = screen[i][j + 1], band = Math.min(bands - 1, Math.floor(norm((heights[i][j] + heights[i][j + 1]) / 2) * bands)); paths[band].moveTo(a.x, a.y); paths[band].lineTo(b.x, b.y); }
    }
    ctx.lineWidth = .75;
    paths.forEach((path, band) => { ctx.strokeStyle = rgba(ramp((band + .5) / bands), .62 - band * .025); ctx.stroke(path); });

    const xy = position();
    const jitter = { x: xy.x + Math.sin(time * 6.3) * .008, y: xy.y + Math.cos(time * 4.9) * .008 };
    const ballWorld = world(jitter.x, jitter.y, loss(jitter.x, jitter.y, time, deepen.current));
    const lifted = { ...ballWorld, y: ballWorld.y + 7 };
    b.trail.push(lifted); if (b.trail.length > 80) b.trail.shift();
    const dark = isDark();
    const color = trackInk(bootcamps[b.to], dark);

    const floorShadow = project({ ...ballWorld, y: FLOOR });
    ctx.fillStyle = dark ? 'rgba(0,0,0,.35)' : 'rgba(26,43,100,.18)'; ctx.beginPath(); ctx.ellipse(floorShadow.x, floorShadow.y, 9 * floorShadow.scale, 4 * floorShadow.scale, 0, 0, Math.PI * 2); ctx.fill();

    // Minima: a pole rises from each basin to carry its label.
    const poles = WELLS.map((w, i) => {
      const bottom = world(w.x, w.y, loss(w.x, w.y, time, deepen.current));
      const top = { ...bottom, y: i === active ? ACTIVE_HEIGHT : bottom.y + 16 };
      return { bottom: project(bottom), top: project(top), i };
    });
    poles.forEach(({ bottom, top, i }) => {
      const on = i === active, next = i === b.to && !b.arrived, c = trackInk(bootcamps[i], dark);
      ctx.strokeStyle = rgba(c, on ? .75 : next ? .35 + .3 * Math.sin(time * 8) : .28); ctx.lineWidth = on ? 1.6 : next ? 1.2 : .8; ctx.setLineDash(on ? [] : [2, 3]);
      ctx.beginPath(); ctx.moveTo(bottom.x, bottom.y); ctx.lineTo(top.x, top.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = on ? c : dark ? '#0b1030' : '#fff'; ctx.strokeStyle = c; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(bottom.x, bottom.y, 3.2 * bottom.scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (next) { const ring = 6 + (time * 14) % 14; ctx.strokeStyle = rgba(c, .6 * (1 - (ring - 6) / 14)); ctx.beginPath(); ctx.ellipse(bottom.x, bottom.y, ring, ring * .45, 0, 0, Math.PI * 2); ctx.stroke(); }
    });

    b.trail.forEach((p, k) => {
      if (k % 2) return;
      const s = project(p);
      ctx.fillStyle = rgba(color, k / b.trail.length * .7);
      ctx.beginPath(); ctx.arc(s.x, s.y, 1 + k / b.trail.length * 2.2, 0, Math.PI * 2); ctx.fill();
    });
    const s = project(lifted), r = 9.5 * s.scale;
    const glow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 3.2);
    glow.addColorStop(0, rgba(color, .3)); glow.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(s.x, s.y, r * 3.2, 0, Math.PI * 2); ctx.fill();
    const shade = ctx.createRadialGradient(s.x - r * .35, s.y - r * .4, r * .1, s.x, s.y, r);
    shade.addColorStop(0, '#ffffff'); shade.addColorStop(.35, mix(color, '#ffffff', .35)); shade.addColorStop(1, color);
    ctx.fillStyle = shade; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();


    setLabels(poles.map(({ top }) => ({ x: top.x, y: top.y, depth: clamp((top.z + 220) / 440) })));
  });

  return <div ref={stage} className="bc-figure bc-draggable" {...controls.handlers}>
    <canvas ref={canvas} className="bc-canvas" aria-hidden="true" />
    <SceneLabels points={labels} active={active} onActive={index => { request.current = index; }} compact emphasis placement="above" />
  </div>;
}
