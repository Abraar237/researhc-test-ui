'use client';

import { clamp, gaussian, rgba, seeded } from './bootcamp-shared';
import { SceneCanvas, driving, roundRect, type Pal, type Scene } from './hero-tiles';

// Gallery 2: each bootcamp as a real-world scene rather than a chart, without any words in the frame — a humanoid learning to walk,
// people tracked by pose estimation, airflow over a wing, a digit being read by a network, an 8-GPU node,
// a GPU die at work, a model running on a phone, semantic search in embedding space and an agent using tools.
const W = 240, H = 192;

export type Pal2 = Pal & { tint: string; rust: string; olive: string };
export const extend = (p: Pal): Pal2 => ({ ...p, tint: p.dark ? '#111a45' : '#edf3fd', rust: p.dark ? '#e39a86' : '#8e4636', olive: p.dark ? '#c6d27e' : '#8a9a42' });
const scene2 = (make: () => (ctx: CanvasRenderingContext2D, t: number, dt: number, p: Pal2) => void): (() => Scene) => () => { const s = make(); return (ctx, t, dt, p) => s(ctx, t, dt, extend(p)); };

// ——— Shared drawing: a room corner like a motion-capture stage, and a jointed skeleton.
function room(ctx: CanvasRenderingContext2D, p: Pal2) {
  ctx.fillStyle = p.tint; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = rgba(p.ink, .75); ctx.lineWidth = .9;
  ctx.beginPath(); ctx.moveTo(0, 92); ctx.lineTo(150, 80); ctx.lineTo(W, 124); ctx.moveTo(150, 80); ctx.lineTo(150, 0); ctx.stroke();
  ctx.strokeStyle = p.faint; ctx.lineWidth = .7;
  for (let k = 1; k < 7; k++) { ctx.beginPath(); ctx.moveTo(150 - k * 34, 80 + k * 2.9); ctx.lineTo(150 - k * 70, H); ctx.stroke(); }
}

type Joint = [number, number];
export type Pose = { head: Joint; neck: Joint; hip: Joint; elbowL: Joint; handL: Joint; elbowR: Joint; handR: Joint; kneeL: Joint; footL: Joint; kneeR: Joint; footR: Joint; r: number };
// A walking pose in local coordinates (x forward, y up, feet on y = 0) for gait phase φ and body height h.
export function gait(phase: number, h: number, stride = 1): Pose {
  const thigh = .25 * h, shin = .25 * h, torso = .3 * h, upper = .15 * h, fore = .14 * h;
  const aL = .45 * stride * Math.sin(phase), aR = -aL;
  const bL = .15 + .55 * Math.max(0, Math.cos(phase)) * stride, bR = .15 + .55 * Math.max(0, -Math.cos(phase)) * stride;
  const hip: Joint = [0, thigh + shin];
  const leg = (a: number, b: number): [Joint, Joint] => { const knee: Joint = [hip[0] + thigh * Math.sin(a), hip[1] - thigh * Math.cos(a)]; return [knee, [knee[0] + shin * Math.sin(a - b), knee[1] - shin * Math.cos(a - b)]]; };
  const [kneeL, footL] = leg(aL, bL), [kneeR, footR] = leg(aR, bR);
  const neck: Joint = [hip[0] + torso * Math.sin(.08), hip[1] + torso * Math.cos(.08)];
  const arm = (a: number): [Joint, Joint] => { const e: Joint = [neck[0] + upper * Math.sin(a), neck[1] - upper * Math.cos(a)]; return [e, [e[0] + fore * Math.sin(a + .45), e[1] - fore * Math.cos(a + .45)]]; };
  const [elbowL, handL] = arm(-.7 * aL * stride), [elbowR, handR] = arm(-.7 * aR * stride);
  const r = .065 * h, pose: Pose = { head: [neck[0] + .02 * h, neck[1] + r + 2], neck, hip, elbowL, handL, elbowR, handR, kneeL, footL, kneeR, footR, r };
  const ground = Math.min(footL[1], footR[1]);
  (Object.keys(pose) as (keyof Pose)[]).forEach(k => { if (k !== 'r') (pose[k] as Joint)[1] -= ground; });
  return pose;
}
// Rotate a pose about a pivot (used for falls), keeping joints above the floor.
function tip(pose: Pose, pivot: Joint, angle: number): Pose {
  const out = { ...pose } as Pose, c = Math.cos(angle), s = Math.sin(angle);
  (Object.keys(pose) as (keyof Pose)[]).forEach(k => { if (k === 'r') return; const [x, y] = pose[k] as Joint, dx = x - pivot[0], dy = y - pivot[1]; (out[k] as Joint) = [pivot[0] + dx * c + dy * s, Math.max(0, pivot[1] - dx * s + dy * c)]; });
  return out;
}
function skeleton(ctx: CanvasRenderingContext2D, p: Pal2, pose: Pose, x: number, ground: number, colour: string, face = 1, width = 2.3) {
  const P = (j: Joint): Joint => [x + j[0] * face, ground - j[1]];
  ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const chain = (...js: Joint[]) => { ctx.beginPath(); js.map(P).forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.stroke(); };
  chain(pose.handL, pose.elbowL, pose.neck, pose.elbowR, pose.handR); chain(pose.neck, pose.hip); chain(pose.footL, pose.kneeL, pose.hip, pose.kneeR, pose.footR);
  const [hx, hy] = P(pose.head); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(hx, hy, pose.r, 0, Math.PI * 2); ctx.stroke();
  [pose.neck, pose.hip, pose.elbowL, pose.handL, pose.elbowR, pose.handR, pose.kneeL, pose.footL, pose.kneeR, pose.footR].map(P).forEach(([a, b]) => { ctx.fillStyle = p.paper; ctx.beginPath(); ctx.arc(a, b, 1.7, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = .9; ctx.stroke(); });
  ctx.lineCap = 'butt';
}
const bounds = (pose: Pose, x: number, ground: number, face: number) => { const pts = (Object.keys(pose) as (keyof Pose)[]).filter(k => k !== 'r').map(k => pose[k] as Joint); const xs = pts.map(j => x + j[0] * face), ys = pts.map(j => ground - j[1]); return { x0: Math.min(...xs) - 4, x1: Math.max(...xs) + 4, y0: Math.min(...ys) - pose.r * 2 - 2, y1: Math.max(...ys) + 2 }; };

// ——— Reinforcement learning: a humanoid learning to walk. Failed episodes leave ghosts where they fell.
const walker = scene2(() => {
  const X0 = 22, X1 = 206, GROUND = 164, Hh = 50, REACH = [.2, .34, .5, .63, .8, 1];
  let episode = 0, x = 0, phase = 0, fall = 0, cheer = 0;
  const ghosts: { pose: Pose; x: number }[] = [];
  return (ctx, t, dt, p) => {
    room(ctx, p);
    const goal = REACH[episode] * (X1 - X0);
    if (cheer > 0) { cheer -= dt; if (cheer <= 0) { episode = 0; ghosts.length = 0; x = 0; } }
    else if (fall > 0) { fall += dt; if (fall > 1.1) { const pivot = gait(phase, Hh).footL; ghosts.push({ pose: tip(gait(phase, Hh), pivot, 1.35), x: X0 + x }); episode++; fall = 0; x = 0; } }
    else { x += dt * (26 + episode * 6); phase += dt * (6.5 + episode * .6); if (x >= goal) { x = goal; if (episode === REACH.length - 1) cheer = 1.6; else fall = .001; } }
    // Floor markings: metres and the goal flag.
    ctx.strokeStyle = rgba(p.ink, .3); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(X0, GROUND + 3); ctx.lineTo(X1, GROUND + 3); ctx.stroke();
    for (let m = 0; m <= 5; m++) { const mx = X0 + m / 5 * (X1 - X0); ctx.beginPath(); ctx.moveTo(mx, GROUND + 1); ctx.lineTo(mx, GROUND + 6); ctx.stroke(); }
    ctx.strokeStyle = p.ink; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(X1 + 8, GROUND + 3); ctx.lineTo(X1 + 8, GROUND - 58); ctx.stroke();
    ctx.fillStyle = cheer > 0 ? p.olive : p.pink; ctx.beginPath(); ctx.moveTo(X1 + 8, GROUND - 58); ctx.lineTo(X1 + 26, GROUND - 51); ctx.lineTo(X1 + 8, GROUND - 44); ctx.fill();
    ghosts.forEach((g, k) => { ctx.globalAlpha = .28 + k * .07; skeleton(ctx, p, g.pose, g.x, GROUND, p.rust, 1, 1.8); ctx.globalAlpha = 1; });
    let pose = gait(cheer > 0 ? 0 : phase, Hh, cheer > 0 ? 0 : 1);
    if (fall > 0) pose = tip(pose, pose.footL, Math.min(1, fall / .9) ** 2 * 1.35);
    if (cheer > 0) { pose = { ...pose, elbowL: [pose.neck[0] - 5, pose.neck[1] + 6], handL: [pose.neck[0] - 7, pose.neck[1] + 15], elbowR: [pose.neck[0] + 5, pose.neck[1] + 6], handR: [pose.neck[0] + 7, pose.neck[1] + 15] }; }
    skeleton(ctx, p, pose, X0 + x, GROUND, cheer > 0 ? p.blue : p.olive);
  };
});

// ——— Computer vision: multi-person pose estimation with tracking IDs, confidences and trails.
const posetrack = scene2(() => {
  const people = [
    { cu: .3, cv: .35, ru: .2, rv: .16, speed: .32, off: 0, id: 1 },
    { cu: .62, cv: .55, ru: .22, rv: .2, speed: -.26, off: 2, id: 2 },
    { cu: .75, cv: .2, ru: .14, rv: .1, speed: .4, off: 4, id: 3 },
  ];
  const trails = people.map(() => [] as Joint[]);
  const floor = (u: number, v: number) => ({ x: 120 + (u - .5) * (236 - v * 120), y: 186 - v * 96, s: 1 - v * .5 });
  return (ctx, t, dt, p) => {
    room(ctx, p);
    const colours = [p.rust, p.olive, p.blue];
    const placed = people.map((q, i) => {
      const a = t * q.speed + q.off, u = q.cu + Math.cos(a) * q.ru, v = q.cv + Math.sin(a) * q.rv;
      const du = -Math.sin(a) * q.speed, f = floor(u, v);
      return { i, q, f, v, face: du >= 0 ? 1 : -1, phase: t * 7 + i * 2 };
    }).sort((a, b) => b.v - a.v);
    placed.forEach(({ i, f, face, phase }) => {
      const colour = colours[i], h = 58 * f.s, pose = gait(phase, h);
      // Keypoint jitter, as a real detector would produce.
      (Object.keys(pose) as (keyof Pose)[]).forEach(k => { if (k !== 'r') { const j = pose[k] as Joint; j[0] += Math.sin(t * 13 + i * 7 + j[1]) * .5; j[1] += Math.cos(t * 11 + i * 3 + j[0]) * .5; } });
      const tr = trails[i]; tr.push([f.x, f.y]); if (tr.length > 60) tr.shift();
      ctx.strokeStyle = rgba(colour, .35); ctx.lineWidth = 1; ctx.setLineDash([1.5, 2.5]); ctx.beginPath(); tr.forEach(([a, b], k) => k ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = rgba(colour, .12); ctx.beginPath(); ctx.ellipse(f.x, f.y, 11 * f.s, 3 * f.s, 0, 0, Math.PI * 2); ctx.fill();
      skeleton(ctx, p, pose, f.x, f.y, colour, face, 2.1 * f.s + .4);
      const b = bounds(pose, f.x, f.y, face);
      ctx.strokeStyle = rgba(colour, .75); ctx.lineWidth = .9; ctx.setLineDash([3, 2]); ctx.strokeRect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0); ctx.setLineDash([]);
      ctx.fillStyle = colour; ctx.fillRect(b.x0, b.y0 - 5, 14, 5);
    });
  };
});

// ——— Scientific ML: exact potential flow past a Joukowski airfoil, with streaming particles and surface pressure.
type C = [number, number];
const add = (a: C, b: C): C => [a[0] + b[0], a[1] + b[1]], sub = (a: C, b: C): C => [a[0] - b[0], a[1] - b[1]];
const mul = (a: C, b: C): C => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const div = (a: C, b: C): C => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const conj = (a: C): C => [a[0], -a[1]], mag = (a: C) => Math.hypot(a[0], a[1]), cis = (t: number): C => [Math.cos(t), Math.sin(t)];
const csqrt = (a: C): C => { const r = Math.sqrt(mag(a)), th = Math.atan2(a[1], a[0]) / 2; return [r * Math.cos(th), r * Math.sin(th)]; };
const airfoil = scene2(() => {
  const MU: C = [-.09, .08], A = mag(sub([1, 0], MU)), ALPHA = 7 * Math.PI / 180, BETA = Math.asin(MU[1] / A);
  const GAMMA = 4 * Math.PI * A * Math.sin(ALPHA + BETA);
  // Complex velocity in the circle plane: dW/dζ for uniform flow at angle α, a doublet and circulation Γ (Kutta condition).
  const dW = (z: C): C => { const d = sub(z, MU); return add(sub(cis(-ALPHA), div(mul([A * A, 0], cis(ALPHA)), mul(d, d))), div([0, GAMMA / (2 * Math.PI)], d)); };
  const J = (z: C): C => sub([1, 0], div([1, 0], mul(z, z)));
  const toZ = (z: C): C => add(z, div([1, 0], z));
  const fromZ = (z: C): C => { const r = csqrt(sub(mul(z, z), [4, 0])), a = mul(add(z, r), [.5, 0]), b = mul(sub(z, r), [.5, 0]); return mag(sub(a, MU)) > mag(sub(b, MU)) ? a : b; };
  const velocity = (z: C) => conj(div(dW(z), J(z)));
  const random = seeded(8);
  const seed = () => fromZ([-2.4 - random() * .4, (random() * 2 - 1) * 1.15]);
  const particles = Array.from({ length: 170 }, () => { const z = seed(); for (let k = 0; k < random() * 400; k++) step(z, .02); return { z, trail: [] as C[] }; });
  function step(z: C, h: number) { const v = velocity(z), jz = J(z), dz = div(v, jz), m = mag(dz), k = m > 3 ? 3 / m : 1; z[0] += dz[0] * k * h; z[1] += dz[1] * k * h; }
  const S = 46, OX = 116, OY = 84, screen = (w: C): Joint => [OX + w[0] * S, OY - w[1] * S];
  return (ctx, t, dt, p) => {
    ctx.fillStyle = p.tint; ctx.fillRect(0, 0, W, H);
    for (const q of particles) {
      for (let k = 0; k < 2; k++) step(q.z, dt * .9);
      const w = toZ(q.z);
      if (w[0] > 2.5 || mag(sub(q.z, MU)) < A * 1.005 || !Number.isFinite(w[0])) { const z = seed(); q.z[0] = z[0]; q.z[1] = z[1]; q.trail.length = 0; continue; }
      q.trail.push(w); if (q.trail.length > 9) q.trail.shift();
      const speed = mag(velocity(q.z)), colour = speed > 1.25 ? p.blue : speed < .8 ? p.pink : p.ink;
      ctx.strokeStyle = rgba(colour, speed > 1.25 || speed < .8 ? .7 : .3); ctx.lineWidth = 1;
      ctx.beginPath(); q.trail.forEach((c, k) => { const [x, y] = screen(c); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke();
    }
    // The wing, its surface pressure (blue = suction on top, pink = pressure below) and the lift vector.
    const surf = Array.from({ length: 160 }, (_, k) => add(MU, mul([A * 1.0005, 0], cis(k / 160 * Math.PI * 2))));
    ctx.beginPath(); surf.map(toZ).forEach((c, k) => { const [x, y] = screen(c); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath();
    ctx.fillStyle = p.paper; ctx.fill();
    ctx.lineWidth = 2.4;
    for (let k = 0; k < 160; k++) { const a = screen(toZ(surf[k])), b = screen(toZ(surf[(k + 1) % 160])), cp = 1 - mag(velocity(surf[k])) ** 2; ctx.strokeStyle = cp < 0 ? rgba(p.blue, clamp(-cp * .5 + .25)) : rgba(p.pink, clamp(cp * .8 + .25)); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    const [lx, ly] = screen([-.35, .15]);
    ctx.strokeStyle = p.ink; ctx.fillStyle = p.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx, ly - 34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx - 3.5, ly - 30); ctx.lineTo(lx, ly - 37); ctx.lineTo(lx + 3.5, ly - 30); ctx.fill();
  };
});

// ——— ML / DL: a digit is written stroke by stroke on a 28×28 grid and read by a network.
const handwriting = scene2(() => {
  const DIGITS: [number, Joint[]][] = [
    [7, [[.22, .22], [.8, .22], [.45, .86]]],
    [3, [[.26, .22], [.7, .24], [.46, .48], [.74, .62], [.6, .84], [.26, .8]]],
    [2, [[.26, .32], [.46, .18], [.72, .32], [.3, .82], [.8, .82]]],
    [4, [[.66, .86], [.66, .18], [.22, .64], [.82, .64]]],
    [9, [[.7, .44], [.46, .52], [.3, .36], [.46, .2], [.68, .3], [.7, .44], [.62, .86]]],
  ];
  const N = 28, grid = new Float32Array(N * N), GX = 10, GY = 30, CELL = 3.6;
  let which = 0, drawn = 0, hold = 0;
  const length = (pts: Joint[]) => pts.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]), 0);
  const at = (pts: Joint[], d: number): Joint => { for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (d <= l) { const u = d / l; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u]; } d -= l; } return pts[pts.length - 1]; };
  const layers = [8, 6, 10], LX = [140, 176, 214];
  const nodeY = (l: number, i: number) => 90 + (i - (layers[l] - 1) / 2) * (l === 2 ? 14 : 16);
  return (ctx, t, dt, p) => {
    const [digit, pts] = DIGITS[which], total = length(pts);
    if (drawn < total) {
      const next = Math.min(total, drawn + dt * .9);
      for (let d = drawn; d < next; d += .004) { const [u, v] = at(pts, d); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const dx = (i + .5) / N - u, dy = (j + .5) / N - v, g = Math.exp(-(dx * dx + dy * dy) / (2 * .038 * .038)); grid[j * N + i] = Math.min(1, grid[j * N + i] + g * .08); } }
      drawn = next;
    } else if ((hold += dt) > 2.2) { hold = 0; drawn = 0; grid.fill(0); which = (which + 1) % DIGITS.length; }
    const done = drawn >= total, confidence = clamp(drawn / total) ** 2;
    // Canvas: the 28×28 input with a pen.
    ctx.fillStyle = p.faint; ctx.fillRect(GX - 2, GY - 2, N * CELL + 4, N * CELL + 4);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const v = grid[j * N + i]; if (v > .02) { ctx.fillStyle = rgba(p.ink, v * .9); ctx.fillRect(GX + i * CELL, GY + j * CELL, CELL - .3, CELL - .3); } }
    if (!done) { const [u, v] = at(pts, drawn), px = GX + u * N * CELL, py = GY + v * N * CELL; ctx.strokeStyle = p.pink; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 14, py - 16); ctx.stroke(); ctx.fillStyle = p.pink; ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill(); }
    // Network: activations flow from the input to the ten digit neurons.
    const pulse = (t * 1.6) % 1;
    for (let l = 0; l < 3; l++) for (let i = 0; i < layers[l]; i++) {
      const x = LX[l], y = nodeY(l, i);
      const sources = l === 0 ? [[GX + N * CELL + 2, GY + (i + .5) / layers[0] * N * CELL]] : Array.from({ length: layers[l - 1] }, (_, k) => [LX[l - 1], nodeY(l - 1, k)]);
      sources.forEach(([sx, sy], k) => { if (l > 0 && (k + i) % 2) return; ctx.strokeStyle = rgba(p.ink, .12); ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(x, y); ctx.stroke(); if (!done) { ctx.fillStyle = rgba(p.blue, .6); ctx.beginPath(); ctx.arc(sx + (x - sx) * pulse, sy + (y - sy) * pulse, 1.1, 0, Math.PI * 2); ctx.fill(); } });
    }
    for (let l = 0; l < 3; l++) for (let i = 0; i < layers[l]; i++) {
      const x = LX[l], y = nodeY(l, i), on = l === 2 ? (i === digit ? confidence : .04) : .3 + .5 * Math.abs(Math.sin(i * 1.7 + l + drawn * 9));
      ctx.fillStyle = l === 2 ? rgba(i === digit ? p.blue : p.ink, .12 + on * .88) : rgba(p.ink, on * .5); ctx.strokeStyle = rgba(p.ink, .5); ctx.lineWidth = .8;
      ctx.beginPath(); ctx.arc(x, y, l === 2 ? 5.2 : 3.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  };
});

// ——— GPU engineering: an isometric 8-GPU node; NVLink traffic follows each parallelism strategy in turn.
const gpuNode = scene2(() => {
  const iso = (x: number, y: number, z: number): Joint => [120 + (x - y) * .87 * 13, 104 + (x + y) * .5 * 13 - z * 13];
  const gpus = Array.from({ length: 8 }, (_, i) => ({ x: (i % 4) * 2.3 - 3.6, y: i < 4 ? -2.6 : 1.5 }));
  const modes: { name: string; edges: [number, number][] }[] = [
    { name: 'data parallel · ring all-reduce', edges: [[0, 1], [1, 2], [2, 3], [3, 7], [7, 6], [6, 5], [5, 4], [4, 0]] },
    { name: 'tensor parallel · pairs', edges: [[0, 4], [1, 5], [2, 6], [3, 7]] },
    { name: 'pipeline parallel · stages', edges: [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7]] },
    { name: 'expert parallel · all-to-all', edges: [[0, 6], [1, 7], [2, 4], [3, 5], [0, 3], [4, 7]] },
  ];
  const box = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, d: number, h: number, top: string, side: string, stroke: string) => {
    const pts = (pp: [number, number, number][]) => { ctx.beginPath(); pp.map(([a, b, c]) => iso(a, b, c)).forEach(([u, v], k) => k ? ctx.lineTo(u, v) : ctx.moveTo(u, v)); ctx.closePath(); };
    pts([[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, h], [x, y + d, h]]); ctx.fillStyle = side; ctx.fill(); ctx.strokeStyle = stroke; ctx.stroke();
    pts([[x + w, y, 0], [x + w, y + d, 0], [x + w, y + d, h], [x + w, y, h]]); ctx.fill(); ctx.stroke();
    pts([[x, y, h], [x + w, y, h], [x + w, y + d, h], [x, y + d, h]]); ctx.fillStyle = top; ctx.fill(); ctx.stroke();
  };
  return (ctx, t, dt, p) => {
    ctx.fillStyle = p.tint; ctx.fillRect(0, 0, W, H);
    const mode = modes[Math.floor(t / 3) % modes.length];
    ctx.lineWidth = .8;
    box(ctx, -4.4, -3.4, 9.2, 7.6, .25, p.paper, rgba(p.ink, .15), rgba(p.ink, .5));
    box(ctx, -.7, -.55, 1.4, 1.1, .5, rgba(p.ink, .12), rgba(p.ink, .2), rgba(p.ink, .6));
    gpus.forEach((g, i) => {
      const util = .5 + .5 * Math.sin(t * 2.2 + i * .9), active = mode.edges.some(e => e.includes(i));
      box(ctx, g.x, g.y, 1.8, 1.8, .7, active ? rgba(p.blue, .15 + util * .45) : p.paper, rgba(p.ink, .18), rgba(p.ink, .65));
      // Heat-sink fins.
      ctx.strokeStyle = rgba(p.ink, .35); ctx.lineWidth = .6;
      for (let f = 1; f < 6; f++) { const a = iso(g.x + f * .3, g.y + .15, .7), b = iso(g.x + f * .3, g.y + 1.65, .7); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    });
    // NVLink arcs for the current strategy, with packets travelling along them.
    mode.edges.forEach(([a, b], k) => {
      const A = iso(gpus[a].x + .9, gpus[a].y + .9, .7), B = iso(gpus[b].x + .9, gpus[b].y + .9, .7), mid: Joint = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - 22];
      ctx.strokeStyle = rgba(p.pink, .75); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.quadraticCurveTo(mid[0], mid[1], B[0], B[1]); ctx.stroke();
      const u = (t * .8 + k * .17) % 1, a1 = 1 - u, px = a1 * a1 * A[0] + 2 * a1 * u * mid[0] + u * u * B[0], py = a1 * a1 * A[1] + 2 * a1 * u * mid[1] + u * u * B[1];
      ctx.fillStyle = p.pink; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, Math.PI * 2); ctx.fill();
    });
  };
});

// ——— Kernel engineering: a GPU die in perspective — HBM feeds L2, thread blocks rise on the SMs as a kernel runs.
const gpuDie = scene2(() => {
  const iso = (x: number, y: number, z: number): Joint => [120 + (x - y) * .87 * 11.5, 70 + (x + y) * .5 * 11.5 - z * 11.5];
  const COLS = 6, ROWS = 4;
  const load = new Float32Array(COLS * ROWS * 2);
  let wave = 0;
  const quad = (ctx: CanvasRenderingContext2D, corners: [number, number, number][]) => { ctx.beginPath(); corners.map(([a, b, c]) => iso(a, b, c)).forEach(([u, v], k) => k ? ctx.lineTo(u, v) : ctx.moveTo(u, v)); ctx.closePath(); };
  return (ctx, t, dt, p) => {
    ctx.fillStyle = p.tint; ctx.fillRect(0, 0, W, H);
    // Package and die.
    quad(ctx, [[-1.5, -1.5, 0], [11.5, -1.5, 0], [11.5, 7.5, 0], [-1.5, 7.5, 0]]); ctx.fillStyle = rgba(p.ink, .06); ctx.fill(); ctx.strokeStyle = rgba(p.ink, .45); ctx.lineWidth = .8; ctx.stroke();
    quad(ctx, [[0, 0, .05], [10, 0, .05], [10, 6, .05], [0, 6, .05]]); ctx.fillStyle = p.paper; ctx.fill(); ctx.stroke();
    // HBM stacks on the sides and the L2 band across the middle.
    [[-1.2, .3], [-1.2, 3.3], [10.4, .3], [10.4, 3.3]].forEach(([x, y]) => { for (let l = 0; l < 4; l++) { quad(ctx, [[x, y, .1 + l * .18], [x + .8, y, .1 + l * .18], [x + .8, y + 2.4, .1 + l * .18], [x, y + 2.4, .1 + l * .18]]); ctx.fillStyle = rgba(p.violet, .18 + l * .08); ctx.fill(); ctx.strokeStyle = rgba(p.violet, .6); ctx.stroke(); } });
    quad(ctx, [[0, 2.7, .08], [10, 2.7, .08], [10, 3.3, .08], [0, 3.3, .08]]); ctx.fillStyle = rgba(p.teal, .25); ctx.fill(); ctx.strokeStyle = rgba(p.teal, .7); ctx.stroke();
    // Thread blocks: a wave sweeps the SM grid; each SM's column height is its current occupancy.
    wave = (wave + dt * .9) % 1;
    for (let half = 0; half < 2; half++) for (let r = 0; r < ROWS / 2; r++) for (let c = 0; c < COLS; c++) {
      const k = (half * 2 + r) * COLS + c, target = Math.max(0, Math.sin((c / COLS + r * .15 + half * .3 - wave) * Math.PI * 2)) ;
      load[k] += (target - load[k]) * (1 - Math.exp(-dt * 6));
    }
    const sms: { x: number; y: number; h: number; k: number }[] = [];
    for (let half = 0; half < 2; half++) for (let r = 0; r < 2; r++) for (let c = 0; c < COLS; c++) sms.push({ x: .35 + c * 1.6, y: half ? 3.6 + r * 1.2 : .25 + r * 1.2, h: .15 + load[(half * 2 + r) * COLS + c] * 1.6, k: (half * 2 + r) * COLS + c });
    sms.sort((a, b) => (a.x + a.y) - (b.x + b.y)).forEach(s => {
      const w = 1.3, d = .95, top = rgba(p.blue, .2 + load[s.k] * .7);
      quad(ctx, [[s.x, s.y + d, 0], [s.x + w, s.y + d, 0], [s.x + w, s.y + d, s.h], [s.x, s.y + d, s.h]]); ctx.fillStyle = rgba(p.blue, .12 + load[s.k] * .3); ctx.fill(); ctx.strokeStyle = rgba(p.ink, .55); ctx.lineWidth = .6; ctx.stroke();
      quad(ctx, [[s.x + w, s.y, 0], [s.x + w, s.y + d, 0], [s.x + w, s.y + d, s.h], [s.x + w, s.y, s.h]]); ctx.fill(); ctx.stroke();
      quad(ctx, [[s.x, s.y, s.h], [s.x + w, s.y, s.h], [s.x + w, s.y + d, s.h], [s.x, s.y + d, s.h]]); ctx.fillStyle = top; ctx.fill(); ctx.stroke();
    });
    // Data moving HBM → L2 → SMs.
    for (let k = 0; k < 10; k++) { const u = (t * .7 + k / 10) % 1, side = k % 2, y = 3, x = side ? 10.4 - u * 5 : -.4 + u * 5; const [px, py] = iso(x, y, .25); ctx.fillStyle = p.teal; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2); ctx.fill(); }
  };
});

// ——— Small language models: a model running on a phone, offline, streaming its answer token by token.
const onDevice = scene2(() => {
  const answer = ['Your', 'notes', 'say', 'the', 'paper', 'is', 'due', 'Friday;', 'figures', 'first.'];
  let shown = 0, clock = 0, hold = 0;
  return (ctx, t, dt, p) => {
    ctx.fillStyle = p.tint; ctx.fillRect(0, 0, W, H);
    if (shown < answer.length) { if ((clock += dt) > .32) { clock = 0; shown++; } } else if ((hold += dt) > 2) { hold = 0; shown = 0; }
    // The phone.
    const X = 30, Y = 14, PW = 92, PH = 166;
    roundRect(ctx, X, Y, PW, PH, 14); ctx.fillStyle = p.paper; ctx.fill(); ctx.strokeStyle = p.ink; ctx.lineWidth = 1.4; ctx.stroke();
    roundRect(ctx, X + PW / 2 - 9, Y + 5, 18, 5, 2.5); ctx.fillStyle = p.ink; ctx.fill();
    // Status bar: airplane mode — it runs offline.
    ctx.strokeStyle = p.ink; ctx.lineWidth = 1; const ax = X + 12, ay = Y + 9;
    ctx.beginPath(); ctx.moveTo(ax - 4, ay); ctx.lineTo(ax + 4, ay); ctx.moveTo(ax, ay - 3); ctx.lineTo(ax + 1, ay); ctx.lineTo(ax, ay + 3); ctx.moveTo(ax - 3, ay - 1.5); ctx.lineTo(ax - 3, ay + 1.5); ctx.stroke();
    // Chat: the question, then the answer growing token by token.
    ctx.font = `500 6.8px ${p.sans}`;
    roundRect(ctx, X + 30, Y + 22, 54, 20, 6); ctx.fillStyle = p.blue; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; roundRect(ctx, X + 36, Y + 27, 40, 3.5, 1.7); ctx.fill(); roundRect(ctx, X + 36, Y + 34, 28, 3.5, 1.7); ctx.fill();
    // The answer streams in as word-shaped bars, wrapping like real text.
    const rows: { x: number; w: number }[][] = [[]]; let cursor = 0;
    answer.slice(0, shown).forEach(word => { const w = word.length * 3.1; if (cursor + w > 58) { rows.push([]); cursor = 0; } rows[rows.length - 1].push({ x: cursor, w }); cursor += w + 3; });
    const bh = rows.length * 8 + 10;
    roundRect(ctx, X + 8, Y + 50, 70, bh, 6); ctx.fillStyle = p.faint; ctx.fill();
    rows.forEach((row, k) => row.forEach(b => { roundRect(ctx, X + 14 + b.x, Y + 56 + k * 8, b.w, 3.5, 1.7); ctx.fillStyle = rgba(p.ink, .55); ctx.fill(); }));
    if (shown < answer.length && Math.floor(t * 3) % 2) { const row = rows[rows.length - 1], last = row[row.length - 1]; ctx.fillStyle = p.pink; ctx.fillRect(X + 14 + (last ? last.x + last.w + 1.5 : 0), Y + 54 + (rows.length - 1) * 8, 1.2, 7); }
    // Beside the phone: the model itself, compact enough to live on the chip.
    const MX = 148, MY = 58;
    for (let l = 0; l < 6; l++) { roundRect(ctx, MX + l * 3, MY - l * 3, 56, 34, 4); ctx.fillStyle = p.paper; ctx.fill(); ctx.strokeStyle = rgba(p.ink, .35 + l * .1); ctx.lineWidth = .8; ctx.stroke(); }
    // Tokens flowing from the model into the phone.
    for (let k = 0; k < 4; k++) { const u = (t * .9 + k / 4) % 1, x = MX + 10 - u * (MX + 10 - (X + PW)), y = MY + 30 - Math.sin(u * Math.PI) * 18; roundRect(ctx, x - 7, y - 4, 14, 8, 2); ctx.fillStyle = rgba(p.pink, .85 * (1 - Math.abs(u - .5))); ctx.fill(); }
  };
});

// ——— Gen AI: text embeddings — sentences become vectors and land in a rotating semantic space; a query finds its neighbours.
const embeddings = scene2(() => {
  const random = seeded(17);
  const TOPICS = [
    { name: 'biology', c: [-.72, .12, .15], texts: ['how cells divide', 'protein folding', 'vaccines and immunity'] },
    { name: 'finance', c: [.72, -.05, -.55], texts: ['interest rates rise', 'stock buybacks', 'bond yields'] },
    { name: 'code', c: [.05, -.62, .45], texts: ['fix a null pointer', 'async await in JS', 'unit test a parser'] },
    { name: 'sport', c: [-.05, .62, .75], texts: ['penalty shoot-out', 'marathon pacing', 'three-point shot'] },
  ];
  const pts = TOPICS.flatMap((tp, ti) => Array.from({ length: 16 }, () => ({ ti, p: tp.c.map(v => v + gaussian(random) * .13) })));
  const QUERIES = [{ q: 'how does the immune system learn?', ti: 0 }, { q: 'why did my Python loop crash?', ti: 2 }, { q: 'should I buy index funds?', ti: 1 }, { q: 'tips for a faster 10k run', ti: 3 }];
  let which = 0, clock = 0;
  return (ctx, t, dt, p) => {
    ctx.fillStyle = p.tint; ctx.fillRect(0, 0, W, H);
    clock += dt; if (clock > 6) { clock = 0; which = (which + 1) % QUERIES.length; }
    const { q, ti } = QUERIES[which], typed = Math.floor(clamp(clock / 1.4) * q.length);
    const colours = [p.olive, p.violet, p.blue, p.rust];
    // Query card with a typing caret, then its embedding vector.
    roundRect(ctx, 10, 10, W - 20, 20, 5); ctx.fillStyle = p.paper; ctx.fill(); ctx.strokeStyle = p.line; ctx.lineWidth = .8; ctx.stroke();
    let qx = 16; q.slice(0, typed).split(' ').forEach((word, k, all) => { const w = word.length * 3.3; if (w > 0) { roundRect(ctx, qx, 18, w, 4, 2); ctx.fillStyle = rgba(p.ink, .6); ctx.fill(); } qx += w + (k < all.length - 1 ? 3.5 : 0); });
    if (typed < q.length && Math.floor(t * 3) % 2) { ctx.fillStyle = p.pink; ctx.fillRect(qx + 1, 15, 1.2, 10); }
    const vec = clamp((clock - 1.4) / .6);
    for (let k = 0; k < 32; k++) { const v = Math.sin(k * 2.3 + which * 4.1 + ti), on = k / 32 < vec; ctx.fillStyle = on ? (v > 0 ? rgba(p.blue, .2 + v * .7) : rgba(p.pink, .2 - v * .7)) : p.faint; ctx.fillRect(10 + k * 6.9, 34, 6, 5); }
    // Semantic space, slowly rotating in 3D.
    const yaw = t * .25, cy = Math.cos(yaw), sy = Math.sin(yaw), CX = 120, CY = 118, R = 62;
    const proj = (v: number[]) => { const x = v[0] * cy + v[2] * sy, z = -v[0] * sy + v[2] * cy, y = v[1] * .95 - z * .25, s = 1.6 / (2.2 - z); return { x: CX + x * R * s, y: CY - y * R * s, z, s }; };
    const projected = pts.map(pt => ({ ...pt, s: proj(pt.p) })).sort((a, b) => a.s.z - b.s.z);
    projected.forEach(pt => { ctx.fillStyle = rgba(colours[pt.ti], .35 + (pt.s.z + 1) * .3); ctx.beginPath(); ctx.arc(pt.s.x, pt.s.y, 2.2 * pt.s.s, 0, Math.PI * 2); ctx.fill(); });
    // The query flies in, then links to its three nearest neighbours by cosine similarity.
    const fly = clamp((clock - 2) / .8), target = TOPICS[ti].c.map((v, k) => v + [.06, -.04, .05][k]), qs = proj(target);
    if (fly > 0) {
      const sx = 10 + 16 * 6.9, sy2 = 40, x = sx + (qs.x - sx) * fly, y = sy2 + (qs.y - sy2) * fly;
      if (fly >= 1) {
        const near = pts.filter(pt => pt.ti === ti).map(pt => ({ pt, d: Math.hypot(...pt.p.map((v, k) => v - target[k])) })).sort((a, b) => a.d - b.d).slice(0, 3);
        near.forEach(({ pt }, k) => { const s = proj(pt.p), grow = clamp((clock - 2.8 - k * .25) * 3); if (grow <= 0) return; ctx.strokeStyle = p.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (s.x - x) * grow, y + (s.y - y) * grow); ctx.stroke(); });
      }
      ctx.fillStyle = p.pink; ctx.strokeStyle = p.paper; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  };
});

// ——— Context engineering: an agent calls tools; each result is packed into its context window, which compacts when full.
const agentTools = scene2(() => {
  const TOOLS = [{ name: 'search', x: 34, y: 40, result: '5 docs' }, { name: 'SQL', x: 206, y: 40, result: '12 rows' }, { name: 'code', x: 34, y: 116, result: 'exit 0' }, { name: 'files', x: 206, y: 116, result: '3 files' }];
  const LIMIT = 12;
  let call = 0, clock = 0, blocks: { label: string; colour: number }[] = [{ label: 'task', colour: -1 }], compact = 0;
  return (ctx, t, dt, p) => {
    ctx.fillStyle = p.tint; ctx.fillRect(0, 0, W, H);
    const colours = [p.blue, p.teal, p.olive, p.violet];
    clock += dt;
    if (compact > 0) { compact -= dt; if (compact <= 0) blocks = [{ label: 'summary', colour: -2 }, ...blocks.slice(-2)]; }
    else if (clock > 1.6) { clock = 0; const tool = TOOLS[call % TOOLS.length]; blocks.push({ label: tool.result, colour: call % TOOLS.length }); call++; if (blocks.length >= LIMIT) compact = .9; }
    const active = (call - (clock < 1.6 ? 0 : 1) + TOOLS.length) % TOOLS.length, u = clamp(clock / 1.6);
    // Tools drawn as small line icons.
    TOOLS.forEach((tool, k) => {
      const on = k === active; ctx.strokeStyle = on ? colours[k] : rgba(p.ink, .55); ctx.lineWidth = on ? 1.5 : 1; ctx.fillStyle = p.paper;
      roundRect(ctx, tool.x - 16, tool.y - 14, 32, 26, 5); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      if (k === 0) { ctx.arc(tool.x - 2, tool.y - 2, 5, 0, Math.PI * 2); ctx.moveTo(tool.x + 2, tool.y + 2); ctx.lineTo(tool.x + 7, tool.y + 7); }
      if (k === 1) { ctx.ellipse(tool.x, tool.y - 6, 7, 2.5, 0, 0, Math.PI * 2); ctx.moveTo(tool.x - 7, tool.y - 6); ctx.lineTo(tool.x - 7, tool.y + 5); ctx.ellipse(tool.x, tool.y + 5, 7, 2.5, 0, Math.PI, 0, true); ctx.lineTo(tool.x + 7, tool.y - 6); }
      if (k === 2) { ctx.moveTo(tool.x - 3, tool.y - 6); ctx.lineTo(tool.x - 9, tool.y); ctx.lineTo(tool.x - 3, tool.y + 6); ctx.moveTo(tool.x + 3, tool.y - 6); ctx.lineTo(tool.x + 9, tool.y); ctx.lineTo(tool.x + 3, tool.y + 6); }
      if (k === 3) { ctx.rect(tool.x - 8, tool.y - 7, 12, 14); ctx.rect(tool.x - 4, tool.y - 4, 12, 14); }
      ctx.stroke();
    });
    // The agent in the middle, with the current call travelling out and the result coming back.
    const AX = 120, AY = 78;
    roundRect(ctx, AX - 24, AY - 16, 48, 32, 8); ctx.fillStyle = p.ink; ctx.fill();
    [-8, 0, 8].forEach((dx, k) => { ctx.fillStyle = p.paper; ctx.globalAlpha = .4 + .6 * (Math.floor(t * 3) % 3 === k ? 1 : 0); ctx.beginPath(); ctx.arc(AX + dx, AY, 2.4, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; });
    const tool = TOOLS[active], out = u < .5, s = out ? u * 2 : (u - .5) * 2, from = out ? [AX, AY] : [tool.x, tool.y], to = out ? [tool.x, tool.y] : [AX, AY];
    ctx.strokeStyle = rgba(colours[active], .5); ctx.setLineDash([2, 3]); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(AX, AY); ctx.lineTo(tool.x, tool.y); ctx.stroke(); ctx.setLineDash([]);
    const bx = from[0] + (to[0] - from[0]) * s, by = from[1] + (to[1] - from[1]) * s;
    roundRect(ctx, bx - (out ? 5 : 15), by - 5, out ? 10 : 30, 10, 3); ctx.fillStyle = colours[active]; ctx.fill();
    // Context window: one block per message; compaction folds history into a summary.
    const WX = 12, WY = 160, WW = W - 24, cell = WW / LIMIT;
    ctx.strokeStyle = p.ink; ctx.lineWidth = 1; ctx.strokeRect(WX, WY, WW, 14);
    blocks.forEach((b, k) => { const squeeze = compact > 0 && k < blocks.length - 2 ? compact / .9 : 1; ctx.fillStyle = b.colour === -1 ? p.ink : b.colour === -2 ? p.pink : colours[b.colour]; ctx.globalAlpha = .85 * squeeze + .15; ctx.fillRect(WX + 1 + k * cell, WY + 1, cell - 2, 12); ctx.globalAlpha = 1; });
  };
});

const SCENES_2: Record<string, () => Scene> = {
  rl: walker, sciml: airfoil, mldl: handwriting, cv: posetrack, vla: () => driving(false),
  gpu: gpuNode, kernel: gpuDie, slm: onDevice, genai: embeddings, context: agentTools,
};

export function HeroTile2({ id }: { id: string }) {
  return <SceneCanvas make={SCENES_2[id]} />;
}
