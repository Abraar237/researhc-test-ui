'use client';

import { useEffect, useRef } from 'react';
import { clamp, gaussian, rgba, seeded } from './bootcamp-shared';

// Ten small live simulations, one per bootcamp. Each runs the real computation it depicts
// (value iteration, an FDTD wave solver, an MLP training with Adam, a Sobel convolution, ray-cast lidar,
// a 1F1B pipeline schedule, a tiled GEMM on a roofline, causal attention, DDPM sampling, a context budget)
// on a 240×192 canvas that follows the site theme.
const W = 240, H = 192;

export type Pal = { dark: boolean; paper: string; ink: string; sub: string; line: string; faint: string; blue: string; pink: string; teal: string; violet: string; amber: string; mono: string; sans: string };
export type Scene = (ctx: CanvasRenderingContext2D, t: number, dt: number, p: Pal) => void;

export function palette(dark: boolean, mono: string, sans: string): Pal {
  return dark
    ? { dark, paper: '#0c1336', ink: '#e3e7ff', sub: '#98a1c8', line: 'rgba(227,231,255,.16)', faint: 'rgba(227,231,255,.07)', blue: '#7c94ff', pink: '#f28cc2', teal: '#62c1d2', violet: '#ab98f5', amber: '#f0b45a', mono, sans }
    : { dark, paper: '#ffffff', ink: '#17204d', sub: '#6a7194', line: 'rgba(23,32,77,.14)', faint: 'rgba(23,32,77,.06)', blue: '#2446e0', pink: '#d6589a', teal: '#2f7688', violet: '#6f59b8', amber: '#d9962b', mono, sans };
}

export function text(ctx: CanvasRenderingContext2D, p: Pal, value: string, x: number, y: number, size = 7, color = p.sub, align: CanvasTextAlign = 'left', font = p.mono, weight = 400) {
  ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(value, x, y);
}
function rule(ctx: CanvasRenderingContext2D, p: Pal, y: number) { ctx.fillStyle = p.line; ctx.fillRect(12, y, W - 24, .6); }
const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const lerp3 = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// ——— Reinforcement learning: value iteration on a stochastic gridworld, then the agent follows the policy.
function reinforcement(): Scene {
  const C = 8, R = 6, S = 21, ox = (W - C * S) / 2, oy = 12;
  const walls = new Set(['2,1', '2,2', '2,3', '5,3', '5,4', '4,1']), GOAL = '7,0', PIT = '7,2';
  const key = (x: number, y: number) => `${x},${y}`;
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const random = seeded(4);
  let V = new Float32Array(C * R), sweeps = 0, clock = 0, walk = 0, episodes = 0, flash = 0, outcome = 0;
  let agent = { x: 0, y: 5 }, trail: { x: number; y: number }[] = [agent];
  const deltas: number[] = [];
  const reset = () => { V = new Float32Array(C * R); V[7] = 1; V[2 * C + 7] = -1; sweeps = 0; episodes = 0; deltas.length = 0; agent = { x: 0, y: 5 }; trail = [agent]; };
  reset();
  const move = (x: number, y: number, a: number) => { const nx = x + dirs[a][0], ny = y + dirs[a][1]; return nx < 0 || ny < 0 || nx >= C || ny >= R || walls.has(key(nx, ny)) ? { x, y } : { x: nx, y: ny }; };
  // Actions slip sideways 20% of the time; each step costs 0.04; γ = 0.92.
  const q = (x: number, y: number, a: number) => [[a, .8], [(a + 1) % 4, .1], [(a + 3) % 4, .1]].reduce((s, [d, pr]) => { const n = move(x, y, d); return s + pr * V[n.y * C + n.x]; }, 0) * .92 - .04;
  const greedy = (x: number, y: number) => [0, 1, 2, 3].reduce((b, a) => q(x, y, a) > q(x, y, b) ? a : b, 0);
  const terminal = (x: number, y: number) => key(x, y) === GOAL || key(x, y) === PIT;
  return (ctx, t, dt, p) => {
    clock += dt;
    if (clock > .15 && sweeps < 36) {
      clock = 0; const next = V.slice(); let delta = 0;
      for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) { if (walls.has(key(x, y)) || terminal(x, y)) continue; const v = Math.max(...[0, 1, 2, 3].map(a => q(x, y, a))); delta = Math.max(delta, Math.abs(v - V[y * C + x])); next[y * C + x] = v; }
      V = next; sweeps++; deltas.push(delta);
    }
    if (sweeps > 6) {
      if (flash > 0) { flash -= dt; if (flash <= 0) { agent = { x: 0, y: 5 }; trail = [agent]; if (episodes >= 6) reset(); } }
      else if ((walk += dt) > .2) {
        walk = 0; const a = random() < .12 ? Math.floor(random() * 4) : greedy(agent.x, agent.y);
        agent = move(agent.x, agent.y, random() < .8 ? a : (a + (random() < .5 ? 1 : 3)) % 4); trail.push(agent);
        if (terminal(agent.x, agent.y)) { episodes++; flash = .7; outcome = key(agent.x, agent.y) === GOAL ? 1 : -1; }
      }
    }
    const reveal = clamp((sweeps - 2) / 10);
    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
      const k = key(x, y), X = ox + x * S, Y = oy + y * S, v = V[y * C + x];
      if (walls.has(k)) { ctx.fillStyle = p.ink; ctx.globalAlpha = .82; ctx.fillRect(X, Y, S, S); ctx.globalAlpha = 1; continue; }
      ctx.fillStyle = k === GOAL ? p.blue : k === PIT ? p.pink : v >= 0 ? rgba(p.blue, Math.min(.55, v * .62)) : rgba(p.pink, Math.min(.55, -v * .9));
      ctx.fillRect(X, Y, S, S);
      if (terminal(x, y)) { text(ctx, p, k === GOAL ? '+1' : '−1', X + S / 2, Y + 14, 8, '#fff', 'center', p.mono, 600); continue; }
      if (reveal > 0) {
        ctx.globalAlpha = reveal;
        const a = greedy(x, y), cx = X + S / 2, cy = Y + 8, dx = dirs[a][0], dy = dirs[a][1];
        ctx.strokeStyle = p.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - dx * 3.5, cy - dy * 3.5); ctx.lineTo(cx + dx * 3.5, cy + dy * 3.5);
        ctx.lineTo(cx + dx * 1.2 - dy * 2, cy + dy * 1.2 + dx * 2); ctx.moveTo(cx + dx * 3.5, cy + dy * 3.5); ctx.lineTo(cx + dx * 1.2 + dy * 2, cy + dy * 1.2 - dx * 2); ctx.stroke();
        text(ctx, p, (v < 0 ? '−' : '') + Math.abs(v).toFixed(2), cx, Y + 18, 5.4, p.sub, 'center');
        ctx.globalAlpha = 1;
      }
    }
    ctx.strokeStyle = p.line; ctx.lineWidth = .6;
    for (let x = 0; x <= C; x++) { ctx.beginPath(); ctx.moveTo(ox + x * S, oy); ctx.lineTo(ox + x * S, oy + R * S); ctx.stroke(); }
    for (let y = 0; y <= R; y++) { ctx.beginPath(); ctx.moveTo(ox, oy + y * S); ctx.lineTo(ox + C * S, oy + y * S); ctx.stroke(); }
    if (trail.length > 1) { ctx.setLineDash([2, 2]); ctx.strokeStyle = rgba(p.ink, .5); ctx.lineWidth = 1.2; ctx.beginPath(); trail.forEach((c, i) => { const X = ox + c.x * S + S / 2, Y = oy + c.y * S + S / 2; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.stroke(); ctx.setLineDash([]); }
    const ax = ox + agent.x * S + S / 2, ay = oy + agent.y * S + S / 2;
    if (flash > 0) { ctx.strokeStyle = outcome > 0 ? p.blue : p.pink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ax, ay, 6 + (1 - flash / .7) * 12, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = p.ink; ctx.beginPath(); ctx.arc(ax, ay, 5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = p.paper; ctx.lineWidth = 1.5; ctx.stroke();
    // Convergence: max |ΔV| per sweep on a log scale.
    const gx = 12, gy = 146, gw = W - 24, gh = 20;
    ctx.strokeStyle = p.line; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
    if (deltas.length > 1) { ctx.strokeStyle = p.blue; ctx.lineWidth = 1.2; ctx.beginPath(); deltas.forEach((d, i) => { const X = gx + i / 35 * gw, Y = gy + gh - clamp((Math.log10(d + 1e-4) + 4) / 4) * gh; if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.stroke(); }
    text(ctx, p, '‖ΔV‖∞', gx + gw, gy + 6, 6, p.sub, 'right');
    text(ctx, p, `value iteration · sweep ${sweeps}/36`, 12, 182);
    text(ctx, p, `γ .92 · ε .12 · ep ${episodes}`, W - 12, 182, 7, p.sub, 'right');
  };
}

// ——— Scientific ML: FDTD solution of the 2D wave equation through a double slit, with the far-field intensity.
function doubleSlit(): Scene {
  const NX = 100, NY = 60, BX = 30, fx = 12, fy = 12, fw = 186, fh = 112;
  let u = new Float32Array(NX * NY), prev = new Float32Array(NX * NY), next = new Float32Array(NX * NY);
  const I = new Float32Array(NY), open = (y: number) => (y >= 21 && y <= 25) || (y >= 35 && y <= 39);
  const off = document.createElement('canvas'); off.width = NX; off.height = NY;
  const octx = off.getContext('2d')!, img = octx.createImageData(NX, NY);
  let steps = 0;
  return (ctx, t, dt, p) => {
    for (let s = 0; s < 3; s++) {
      steps++;
      for (let y = 1; y < NY - 1; y++) for (let x = 1; x < NX - 1; x++) {
        const i = y * NX + x;
        if (x === BX && !open(y)) { next[i] = 0; continue; }
        const lap = u[i - 1] + u[i + 1] + u[i - NX] + u[i + NX] - 4 * u[i];
        // Sponge layer on the far edges absorbs outgoing waves.
        const edge = Math.max(0, x - (NX - 12), 8 - y, y - (NY - 9)) / 12;
        next[i] = (2 * u[i] - prev[i] + .24 * lap) * (1 - .08 * edge * edge);
      }
      for (let y = 1; y < NY - 1; y++) next[y * NX + 3] = Math.sin(steps * .5) * .9;
      [prev, u, next] = [u, next, prev];
      for (let y = 0; y < NY; y++) { const v = u[y * NX + NX - 16]; I[y] = I[y] * .992 + v * v * .008; }
    }
    const paper = rgb(p.paper), pos = rgb(p.blue), neg = rgb(p.pink);
    for (let i = 0; i < NX * NY; i++) { const v = clamp(Math.abs(u[i]) * 1.4), c = lerp3(paper, u[i] > 0 ? pos : neg, v); img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255; }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.drawImage(off, fx, fy, fw, fh);
    const sx = fw / NX, sy = fh / NY;
    ctx.fillStyle = p.ink;
    for (let y = 0; y < NY; y++) if (!open(y)) ctx.fillRect(fx + BX * sx - .5, fy + y * sy, sx + 1, sy + .5);
    ctx.strokeStyle = p.line; ctx.lineWidth = .6; ctx.strokeRect(fx, fy, fw, fh);
    ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(fx + (NX - 16) * sx, fy); ctx.lineTo(fx + (NX - 16) * sx, fy + fh); ctx.stroke(); ctx.setLineDash([]);
    // Time-averaged intensity at the screen: the interference fringes.
    const peak = Math.max(...I) || 1;
    ctx.strokeStyle = p.ink; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let y = 0; y < NY; y++) { const X = fx + fw + 4 + I[y] / peak * 24, Y = fy + (y + .5) * sy; if (y) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
    ctx.stroke();
    text(ctx, p, 'I(y)', fx + fw + 16, fy + fh + 9, 6, p.sub, 'center');
    rule(ctx, p, 140);
    text(ctx, p, '∂²u/∂t² = c²∇²u', 12, 156, 8.5, p.ink, 'left', p.mono, 500);
    text(ctx, p, 'FDTD · 100×60 · CFL 0.49', W - 12, 156, 6.5, p.sub, 'right');
    text(ctx, p, 'double slit · plane-wave source', 12, 182);
    text(ctx, p, `step ${steps}`, W - 12, 182, 7, p.sub, 'right');
  };
}

// ——— ML / DL: a 2-14-14-1 tanh MLP trained with Adam on two interleaved spirals; the decision surface updates live.
function spirals(): Scene {
  const Hn = 14, n = 90, X: number[][] = [], Y: number[] = [];
  const data = seeded(9);
  for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) { const s = i / n, r = .1 + s * .95, th = s * 3.3 * Math.PI + c * Math.PI; X.push([r * Math.cos(th) + gaussian(data) * .035, r * Math.sin(th) + gaussian(data) * .035]); Y.push(c); }
  // Parameter layout: W1 (Hn×2), b1, W2 (Hn×Hn), b2, W3 (Hn), b3.
  const sizes = [Hn * 2, Hn, Hn * Hn, Hn, Hn, 1], offsets = [0];
  sizes.forEach(s => offsets.push(offsets[offsets.length - 1] + s));
  let seed = 1, params = new Float64Array(offsets[6]), m = new Float64Array(offsets[6]), v = new Float64Array(offsets[6]), step = 0, good = 0, acc = 0;
  let losses: number[] = [];
  const init = () => { const r = seeded(seed++ * 7919); params = new Float64Array(offsets[6]); for (let k = 0; k < 6; k += 2) { const fan = k === 0 ? 2 : Hn; for (let i = offsets[k]; i < offsets[k + 1]; i++) params[i] = gaussian(r) / Math.sqrt(fan) * 1.2; } m = new Float64Array(params.length); v = new Float64Array(params.length); step = 0; losses = []; good = 0; };
  init();
  const h1 = new Float64Array(Hn), h2 = new Float64Array(Hn), d2 = new Float64Array(Hn);
  const forward = (x0: number, x1: number) => {
    const P = params;
    for (let j = 0; j < Hn; j++) h1[j] = Math.tanh(P[j * 2] * x0 + P[j * 2 + 1] * x1 + P[offsets[1] + j]);
    for (let j = 0; j < Hn; j++) { let s = P[offsets[3] + j]; for (let k = 0; k < Hn; k++) s += P[offsets[2] + j * Hn + k] * h1[k]; h2[j] = Math.tanh(s); }
    let o = P[offsets[5]]; for (let k = 0; k < Hn; k++) o += P[offsets[4] + k] * h2[k];
    return 1 / (1 + Math.exp(-o));
  };
  const train = () => {
    const g = new Float64Array(params.length), P = params; let loss = 0, right = 0;
    for (let s = 0; s < X.length; s++) {
      const [x0, x1] = X[s], y = Y[s], out = forward(x0, x1);
      loss -= y * Math.log(out + 1e-9) + (1 - y) * Math.log(1 - out + 1e-9); if ((out > .5 ? 1 : 0) === y) right++;
      const d = out - y;
      g[offsets[5]] += d;
      for (let k = 0; k < Hn; k++) { g[offsets[4] + k] += d * h2[k]; d2[k] = d * P[offsets[4] + k] * (1 - h2[k] * h2[k]); }
      for (let j = 0; j < Hn; j++) { g[offsets[3] + j] += d2[j]; for (let k = 0; k < Hn; k++) g[offsets[2] + j * Hn + k] += d2[j] * h1[k]; }
      for (let k = 0; k < Hn; k++) { let d1 = 0; for (let j = 0; j < Hn; j++) d1 += d2[j] * P[offsets[2] + j * Hn + k]; d1 *= 1 - h1[k] * h1[k]; g[offsets[1] + k] += d1; g[k * 2] += d1 * x0; g[k * 2 + 1] += d1 * x1; }
    }
    step++;
    const lr = .03, b1 = .9, b2 = .999;
    for (let i = 0; i < P.length; i++) { const gi = g[i] / X.length; m[i] = b1 * m[i] + (1 - b1) * gi; v[i] = b2 * v[i] + (1 - b2) * gi * gi; P[i] -= lr * (m[i] / (1 - b1 ** step)) / (Math.sqrt(v[i] / (1 - b2 ** step)) + 1e-8); }
    losses.push(loss / X.length); acc = right / X.length;
  };
  const GX = 56, GY = 56, off = document.createElement('canvas'); off.width = GX; off.height = GY;
  const octx = off.getContext('2d')!, img = octx.createImageData(GX, GY);
  const px = 12, py = 12, ps = 138, span = 1.2;
  return (ctx, t, dt, p) => {
    for (let k = 0; k < 3; k++) train();
    if (acc >= .99) good++;
    if (good > 150 || step > 2400) init();
    const a = lerp3(rgb(p.paper), rgb(p.pink), .3), b = lerp3(rgb(p.paper), rgb(p.blue), .3), edge = rgb(p.ink);
    for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
      const o = forward((i / (GX - 1) * 2 - 1) * span, (j / (GY - 1) * 2 - 1) * span), c = Math.abs(o - .5) < .03 ? edge : lerp3(a, b, o), q = (j * GX + i) * 4;
      img.data[q] = c[0]; img.data[q + 1] = c[1]; img.data[q + 2] = c[2]; img.data[q + 3] = 255;
    }
    octx.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, px, py, ps, ps);
    X.forEach(([x0, x1], s) => { ctx.fillStyle = Y[s] ? p.blue : p.pink; ctx.beginPath(); ctx.arc(px + (x0 / span + 1) / 2 * ps, py + (x1 / span + 1) / 2 * ps, 1.9, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = p.paper; ctx.lineWidth = .6; ctx.stroke(); });
    ctx.strokeStyle = p.line; ctx.lineWidth = .6; ctx.strokeRect(px, py, ps, ps);
    // Loss curve (log scale), readouts and the layer widths.
    const lx = 160, ly = 16, lw = 68, lh = 52;
    ctx.strokeStyle = p.line; ctx.strokeRect(lx, ly, lw, lh);
    if (losses.length > 1) { ctx.strokeStyle = p.ink; ctx.lineWidth = 1.1; ctx.beginPath(); losses.forEach((l, i) => { const X0 = lx + i / Math.max(losses.length - 1, 1) * lw, Y0 = ly + lh - clamp((Math.log10(l) + 2.2) / 2.2) * lh; if (i) ctx.lineTo(X0, Y0); else ctx.moveTo(X0, Y0); }); ctx.stroke(); }
    text(ctx, p, 'loss (log)', lx, ly - 4, 6);
    text(ctx, p, `epoch  ${step}`, lx, 88, 7, p.ink);
    text(ctx, p, `loss   ${(losses[losses.length - 1] ?? 0).toFixed(3)}`, lx, 100, 7, p.ink);
    text(ctx, p, `acc    ${(acc * 100).toFixed(1)}%`, lx, 112, 7, p.ink);
    [2, 14, 14, 1].forEach((width, layer) => { const dots = Math.min(width, 7); for (let j = 0; j < dots; j++) { ctx.fillStyle = rgba(p.ink, .6); ctx.beginPath(); ctx.arc(lx + 8 + layer * 18, 138 + (j - (dots - 1) / 2) * 3.4, 1.1, 0, Math.PI * 2); ctx.fill(); } });
    rule(ctx, p, 162);
    text(ctx, p, 'MLP 2-14-14-1 · tanh · Adam 3e-2', 12, 182);
  };
}

// ——— Computer vision: a Sobel operator convolved across an image, one 3×3 window at a time.
function sobel(): Scene {
  const NX = 64, NY = 48;
  const src = document.createElement('canvas'); src.width = NX; src.height = NY;
  const sctx = src.getContext('2d', { willReadFrequently: true })!;
  let L = new Float32Array(NX * NY), E = new Float32Array(NX * NY), scan = 0, hold = 0, variant = 0;
  const build = () => {
    const g = sctx.createLinearGradient(0, 0, NX, NY); g.addColorStop(0, '#3a3a3a'); g.addColorStop(1, '#9a9a9a');
    sctx.fillStyle = g; sctx.fillRect(0, 0, NX, NY);
    sctx.save(); sctx.translate(20, 26); sctx.rotate(variant * .5); sctx.fillStyle = '#eee'; sctx.fillRect(-9, -9, 18, 18); sctx.restore();
    sctx.fillStyle = '#111'; sctx.beginPath(); sctx.arc(44, 18, 10, 0, Math.PI * 2); sctx.fill();
    sctx.fillStyle = '#d0d0d0'; sctx.beginPath(); sctx.moveTo(38, 44); sctx.lineTo(58, 44); sctx.lineTo(48, 28 + variant % 2 * 3); sctx.closePath(); sctx.fill();
    for (let k = 0; k < 4; k++) { sctx.fillStyle = k % 2 ? '#555' : '#bbb'; sctx.fillRect(4 + k * 3, 40, 3, 6); }
    const d = sctx.getImageData(0, 0, NX, NY).data;
    L = new Float32Array(NX * NY); for (let i = 0; i < NX * NY; i++) L[i] = d[i * 4] / 255;
    E = new Float32Array(NX * NY); let max = 0;
    for (let y = 1; y < NY - 1; y++) for (let x = 1; x < NX - 1; x++) {
      const at = (dx: number, dy: number) => L[(y + dy) * NX + x + dx];
      const gx = -at(-1, -1) - 2 * at(-1, 0) - at(-1, 1) + at(1, -1) + 2 * at(1, 0) + at(1, 1);
      const gy = -at(-1, -1) - 2 * at(0, -1) - at(1, -1) + at(-1, 1) + 2 * at(0, 1) + at(1, 1);
      E[y * NX + x] = Math.hypot(gx, gy); max = Math.max(max, E[y * NX + x]);
    }
    for (let i = 0; i < E.length; i++) E[i] /= max || 1;
    scan = NX + 1;
  };
  build();
  const out = document.createElement('canvas'); out.width = NX; out.height = NY;
  const octx = out.getContext('2d')!, img = octx.createImageData(NX, NY);
  const ix = 12, iy = 18, iw = 102, ih = 76.5, ox = 126, s = iw / NX;
  const KX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], KY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  return (ctx, t, dt, p) => {
    if (scan < NX * NY - NX - 1) scan = Math.min(NX * NY - NX - 1, scan + dt * 540); else if ((hold += dt) > 1.4) { hold = 0; variant++; build(); }
    const cur = Math.floor(scan), cx = cur % NX, cy = Math.floor(cur / NX);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(src, ix, iy, iw, ih);
    const paper = rgb(p.paper), ink = rgb(p.ink);
    for (let i = 0; i < NX * NY; i++) { const c = i < cur ? lerp3(paper, ink, E[i]) : paper; img.data[i * 4] = c[0]; img.data[i * 4 + 1] = c[1]; img.data[i * 4 + 2] = c[2]; img.data[i * 4 + 3] = 255; }
    octx.putImageData(img, 0, 0); ctx.drawImage(out, ox, iy, iw, ih);
    ctx.strokeStyle = p.line; ctx.lineWidth = .6; ctx.strokeRect(ix, iy, iw, ih); ctx.strokeRect(ox, iy, iw, ih);
    text(ctx, p, 'I', ix, iy - 5, 7, p.ink, 'left', p.mono, 600); text(ctx, p, '|∇I|', ox, iy - 5, 7, p.ink, 'left', p.mono, 600);
    const wx = ix + (cx - 1) * s, wy = iy + (cy - 1) * s;
    ctx.strokeStyle = p.pink; ctx.lineWidth = 1.2; ctx.strokeRect(wx, wy, s * 3, s * 3);
    ctx.fillStyle = p.pink; ctx.fillRect(ox + cx * s, iy + cy * s, s, s);
    ctx.strokeStyle = rgba(p.pink, .5); ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(wx + s * 3, wy + s * 1.5); ctx.lineTo(ox + cx * s, iy + cy * s + s / 2); ctx.stroke();
    // The arithmetic for the current window: patch ⊛ Gx and Gy.
    const cell = 12, gy0 = 110;
    const grid = (x0: number, values: number[][], label: string, fmt: (v: number) => string, hot: boolean) => {
      text(ctx, p, label, x0, gy0 - 4, 6.5, p.sub);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const v = values[r][c];
        ctx.fillStyle = hot ? rgba(p.pink, .12 + Math.abs(v) * .25) : v > 0 ? rgba(p.blue, .1 + v * .08) : v < 0 ? rgba(p.pink, .1 - v * .08) : p.faint;
        ctx.fillRect(x0 + c * cell, gy0 + r * cell, cell - 1, cell - 1);
        text(ctx, p, fmt(v), x0 + c * cell + cell / 2 - .5, gy0 + r * cell + 8, 5.8, p.ink, 'center');
      }
    };
    const patch = [-1, 0, 1].map(dy => [-1, 0, 1].map(dx => L[(cy + dy) * NX + cx + dx] ?? 0));
    grid(12, patch, 'patch', v => v.toFixed(1).replace('0.', '.'), true);
    grid(68, KX, 'Gx', v => String(v), false);
    grid(124, KY, 'Gy', v => String(v), false);
    const flat = patch.flat(), gx = flat.reduce((sum, v, k) => sum + v * KX[Math.floor(k / 3)][k % 3], 0), gyv = flat.reduce((sum, v, k) => sum + v * KY[Math.floor(k / 3)][k % 3], 0);
    text(ctx, p, `gx ${gx.toFixed(2)}`, 180, 118, 6.5, p.ink); text(ctx, p, `gy ${gyv.toFixed(2)}`, 180, 130, 6.5, p.ink);
    text(ctx, p, `|g| ${Math.hypot(gx, gyv).toFixed(2)}`, 180, 142, 7, p.pink, 'left', p.mono, 600);
    rule(ctx, p, 162);
    text(ctx, p, 'Sobel 3×3 · stride 1 · 64×48', 12, 182);
    text(ctx, p, `(${cx}, ${cy})`, W - 12, 182, 7, p.sub, 'right');
  };
}

// ——— Vision-language-action: highway overtaking with a ray-cast lidar and an instruction-conditioned plan.
export function driving(labels = true): Scene {
  const L0 = 66, LW = 36, lanes = [0, 1, 2].map(i => L0 + LW * (i + .5)), EGO_Y = 150, SPEED = 72;
  const random = seeded(12);
  const cars: { lane: number; y: number; v: number }[] = [{ lane: 1, y: 40, v: 36 }, { lane: 0, y: -30, v: 50 }, { lane: 2, y: 80, v: 58 }];
  let ex = lanes[1], target = 1, instruction = 'keep lane · hold 72 km/h', said = 0;
  return (ctx, t, dt, p) => {
    for (const c of cars) c.y += (SPEED - c.v) * dt;
    for (let i = cars.length - 1; i >= 0; i--) if (cars[i].y > H + 30 || cars[i].y < -120) cars.splice(i, 1);
    if (cars.length < 3) { const l = Math.floor(random() * 3); if (!cars.some(c => c.lane === l && c.y < 30)) cars.push({ lane: l, y: -40, v: 30 + random() * 30 }); }
    // Planner: if the lane ahead is blocked, move to the nearest lane that is clear.
    if (Math.abs(ex - lanes[target]) < 2) {
      const lane = target;
      const blocked = cars.some(c => c.lane === lane && c.y < EGO_Y - 14 && c.y > EGO_Y - 95);
      if (blocked) {
        const free = [lane - 1, lane + 1].filter(l => l >= 0 && l < 3 && !cars.some(c => c.lane === l && c.y > EGO_Y - 110 && c.y < EGO_Y + 40));
        if (free.length) { target = free[0]; instruction = `overtake · lane ${lane + 1} → ${target + 1}`; said = 2.2; }
      } else if ((said -= dt) < 0) instruction = 'keep lane · hold 72 km/h';
    }
    ex += (lanes[target] - ex) * (1 - Math.exp(-dt * 2.2));
    // Road.
    ctx.fillStyle = p.faint; ctx.fillRect(L0, 0, LW * 3, H);
    ctx.strokeStyle = p.ink; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(L0, 0); ctx.lineTo(L0, H); ctx.moveTo(L0 + LW * 3, 0); ctx.lineTo(L0 + LW * 3, H); ctx.stroke();
    ctx.strokeStyle = rgba(p.ink, .4); ctx.lineWidth = 1; ctx.setLineDash([10, 10]); ctx.lineDashOffset = -(t * SPEED) % 20;
    [1, 2].forEach(k => { ctx.beginPath(); ctx.moveTo(L0 + LW * k, 0); ctx.lineTo(L0 + LW * k, H); ctx.stroke(); }); ctx.setLineDash([]); ctx.lineDashOffset = 0;
    // Lidar: 90 rays against car boxes and the road edges (slab test).
    const boxes = cars.map(c => ({ x0: lanes[c.lane] - 8, x1: lanes[c.lane] + 8, y0: c.y - 14, y1: c.y + 14 }));
    for (let k = 0; k < 90; k++) {
      const a = k / 90 * Math.PI * 2, dx = Math.cos(a) || 1e-6, dy = Math.sin(a) || 1e-6; let hit = 92, kind = 0;
      for (const b of boxes) { const tx0 = (b.x0 - ex) / dx, tx1 = (b.x1 - ex) / dx, ty0 = (b.y0 - EGO_Y) / dy, ty1 = (b.y1 - EGO_Y) / dy; const tn = Math.max(Math.min(tx0, tx1), Math.min(ty0, ty1)), tf = Math.min(Math.max(tx0, tx1), Math.max(ty0, ty1)); if (tn > 0 && tn < tf && tn < hit) { hit = tn; kind = 1; } }
      for (const X of [L0, L0 + LW * 3]) { const tt = (X - ex) / dx; if (tt > 0 && tt < hit) { hit = tt; kind = 2; } }
      const hx = ex + dx * hit, hy = EGO_Y + dy * hit;
      ctx.strokeStyle = rgba(p.blue, .1); ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(ex, EGO_Y); ctx.lineTo(hx, hy); ctx.stroke();
      if (kind) { ctx.fillStyle = kind === 1 ? p.pink : rgba(p.ink, .5); ctx.fillRect(hx - 1, hy - 1, 2, 2); }
    }
    // Plan: a cubic from the ego pose into the target lane, with waypoints.
    const tx = lanes[target], bez = (u: number) => { const a = 1 - u; return { x: a ** 3 * ex + 3 * a * a * u * ex + 3 * a * u * u * tx + u ** 3 * tx, y: EGO_Y - u * 78 }; };
    ctx.strokeStyle = p.blue; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); for (let k = 0; k <= 20; k++) { const q = bez(k / 20); if (k) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); } ctx.stroke(); ctx.setLineDash([]);
    for (let k = 1; k <= 5; k++) { const q = bez(k / 5); ctx.fillStyle = p.blue; ctx.beginPath(); ctx.arc(q.x, q.y, 1.8, 0, Math.PI * 2); ctx.fill(); }
    const car = (x: number, y: number, fill: string, stroke: string) => { roundRect(ctx, x - 8, y - 14, 16, 28, 4); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - 5, y - 6); ctx.lineTo(x + 5, y - 6); ctx.stroke(); };
    cars.forEach(c => car(lanes[c.lane], c.y, p.paper, p.ink));
    car(ex, EGO_Y, p.blue, p.blue);
    // Instruction in, action out.
    const [verb, detail] = instruction.split(' · ');
    if (!labels) return;
    text(ctx, p, 'language', 8, 16, 5.8); text(ctx, p, verb, 8, 27, 7.5, p.pink, 'left', p.mono, 600); text(ctx, p, detail ?? '', 8, 37, 5.8, p.ink);
    text(ctx, p, 'action', W - 8, 16, 5.8, p.sub, 'right'); text(ctx, p, `steer ${((lanes[target] - ex) * -.6).toFixed(1)}°`, W - 8, 27, 6.5, p.ink, 'right'); text(ctx, p, 'accel +0.00', W - 8, 37, 6.5, p.ink, 'right');
    text(ctx, p, 'π(a | image, text)', 8, 182, 6.5); text(ctx, p, 'lidar 90 rays', W - 8, 182, 6.5, p.sub, 'right');
  };
}

// ——— GPU engineering: the 1F1B pipeline-parallel schedule on 4 GPUs, bubbles hatched, for growing micro-batch counts.
function pipeline(): Scene {
  const P = 4, counts = [4, 8, 12];
  let which = 0, clock = 0, hold = 0;
  const build = (m: number) => {
    const seq = Array.from({ length: P }, (_, s) => { const w = Math.min(P - 1 - s, m), ops: [string, number][] = []; let f = 0, b = 0; for (let i = 0; i < w; i++) ops.push(['F', f++]); while (f < m) { ops.push(['F', f++]); ops.push(['B', b++]); } while (b < m) ops.push(['B', b++]); return ops; });
    const endF = Array.from({ length: P }, () => new Array<number | undefined>(m)), endB = Array.from({ length: P }, () => new Array<number | undefined>(m));
    const free = new Array(P).fill(0), idx = new Array(P).fill(0), blocks: { s: number; kind: string; mb: number; start: number; end: number }[] = [];
    let moved = true;
    while (moved) {
      moved = false;
      for (let s = 0; s < P; s++) while (idx[s] < seq[s].length) {
        const [kind, mb] = seq[s][idx[s]], dep = kind === 'F' ? (s ? endF[s - 1][mb] : 0) : (s < P - 1 ? endB[s + 1][mb] : endF[s][mb]);
        if (dep === undefined) break;
        const start = Math.max(free[s], dep), end = start + (kind === 'F' ? 1 : 2);
        (kind === 'F' ? endF : endB)[s][mb] = end; free[s] = end; idx[s]++; moved = true; blocks.push({ s, kind, mb, start, end });
      }
    }
    return { blocks, T: Math.max(...free), m };
  };
  let plan = build(counts[0]);
  return (ctx, t, dt, p) => {
    if (clock < plan.T) clock = Math.min(plan.T, clock + dt * plan.T / 4.2);
    else if ((hold += dt) > 1.6) { hold = 0; clock = 0; which = (which + 1) % counts.length; plan = build(counts[which]); }
    const x0 = 44, x1 = W - 12, u = (x1 - x0) / plan.T, rowY = (s: number) => 26 + s * 26, rh = 18;
    text(ctx, p, 'pipeline parallel · 1F1B', 12, 15, 7, p.ink, 'left', p.mono, 600);
    text(ctx, p, `m = ${plan.m} micro-batches`, W - 12, 15, 6.5, p.sub, 'right');
    for (let s = 0; s < P; s++) {
      const y = rowY(s);
      text(ctx, p, `GPU ${s}`, 12, y + 12, 6.5, p.ink);
      ctx.fillStyle = p.faint; ctx.fillRect(x0, y, x1 - x0, rh);
      // Idle time up to the cursor is hatched: the pipeline bubble.
      ctx.save(); ctx.beginPath(); ctx.rect(x0, y, clock * u, rh); ctx.clip();
      ctx.strokeStyle = rgba(p.ink, .16); ctx.lineWidth = .7; for (let k = -rh; k < x1 - x0; k += 4) { ctx.beginPath(); ctx.moveTo(x0 + k, y + rh); ctx.lineTo(x0 + k + rh, y); ctx.stroke(); }
      ctx.restore();
    }
    for (const b of plan.blocks) {
      if (b.start >= clock) continue;
      const y = rowY(b.s), x = x0 + b.start * u, w = (Math.min(b.end, clock) - b.start) * u;
      ctx.fillStyle = b.kind === 'F' ? p.blue : p.pink; ctx.fillRect(x + .4, y, Math.max(0, w - .8), rh);
      if (w > 7) text(ctx, p, String(b.mb + 1), x + w / 2, y + 12, 6, '#fff', 'center', p.mono, 600);
    }
    ctx.strokeStyle = p.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 + clock * u, 22); ctx.lineTo(x0 + clock * u, rowY(P - 1) + rh + 4); ctx.stroke();
    const bubble = (P - 1) / (plan.m + P - 1);
    rule(ctx, p, 136);
    text(ctx, p, `bubble = (p−1)/(m+p−1) = ${P - 1}/${plan.m + P - 1} = ${(bubble * 100).toFixed(0)}%`, 12, 152, 7, p.ink);
    ctx.fillStyle = p.blue; ctx.fillRect(12, 162, 8, 6); text(ctx, p, 'forward', 23, 168, 6.5);
    ctx.fillStyle = p.pink; ctx.fillRect(62, 162, 8, 6); text(ctx, p, 'backward (2×)', 73, 168, 6.5);
    text(ctx, p, 'p = 4 stages · weights sharded by layer', 12, 184, 6);
  };
}

// ——— Kernel engineering: a tiled GEMM scheduled over four SMs, and where each optimisation lands on the roofline.
function gemm(): Scene {
  const T = 6, K = 8, SMS = 4, cell = 10;
  const levels = [{ name: 'naive', step: .09, ai: .5 }, { name: 'smem tiling', step: .05, ai: 12 }, { name: 'tensor cores', step: .025, ai: 64 }];
  let level = 0, next = 0, done = new Array<boolean>(T * T).fill(false), hold = 0;
  let sms: ({ block: number; k: number } | null)[] = new Array(SMS).fill(null);
  const cx = 74, cy = 46, ax = cx - K * 4.5 - 6, by = cy - K * 4.5 - 6;
  return (ctx, t, dt, p) => {
    const L = levels[level];
    sms = sms.map(s => { if (s && (s.k += dt / L.step) >= K) { done[s.block] = true; s = null; } if (!s && next < T * T) s = { block: next++, k: 0 }; return s; });
    if (next >= T * T && sms.every(s => !s) && (hold += dt) > 1) { hold = 0; next = 0; done = done.map(() => false); level = (level + 1) % levels.length; }
    const cs = [p.blue, p.pink, p.teal, p.amber];
    // A (rows × K) and B (K × cols), with the k-slice each SM is reading.
    for (let r = 0; r < T; r++) for (let k = 0; k < K; k++) { ctx.fillStyle = p.faint; ctx.fillRect(ax + k * 4.5, cy + r * cell, 4, cell - 1); }
    for (let k = 0; k < K; k++) for (let c = 0; c < T; c++) { ctx.fillStyle = p.faint; ctx.fillRect(cx + c * cell, by + k * 4.5, cell - 1, 4); }
    sms.forEach((s, i) => { if (!s) return; const r = Math.floor(s.block / T), c = s.block % T, k = Math.floor(s.k); ctx.fillStyle = cs[i]; ctx.fillRect(ax + k * 4.5, cy + r * cell, 4, cell - 1); ctx.fillRect(cx + c * cell, by + k * 4.5, cell - 1, 4); });
    for (let b = 0; b < T * T; b++) { const r = Math.floor(b / T), c = b % T; ctx.fillStyle = done[b] ? rgba(p.ink, .28) : p.faint; ctx.fillRect(cx + c * cell, cy + r * cell, cell - 1, cell - 1); }
    sms.forEach((s, i) => { if (!s) return; const r = Math.floor(s.block / T), c = s.block % T; ctx.fillStyle = rgba(cs[i], .35 + .6 * s.k / K); ctx.fillRect(cx + c * cell, cy + r * cell, cell - 1, cell - 1); ctx.strokeStyle = cs[i]; ctx.lineWidth = 1.2; ctx.strokeRect(cx + c * cell - .5, cy + r * cell - .5, cell, cell); });
    text(ctx, p, 'A', ax - 7, cy + 8, 7, p.ink, 'left', p.mono, 600); text(ctx, p, 'B', cx - 9, by + 8, 7, p.ink, 'left', p.mono, 600); text(ctx, p, 'C', cx + T * cell + 3, cy + 8, 7, p.ink, 'left', p.mono, 600);
    // Per-SM progress through the K loop.
    sms.forEach((s, i) => {
      const y = 30 + i * 14, x = 158; text(ctx, p, `SM${i}`, x, y + 6, 6.5, cs[i], 'left', p.mono, 600);
      for (let k = 0; k < K; k++) { ctx.fillStyle = s && k < s.k ? cs[i] : p.faint; ctx.fillRect(x + 22 + k * 7, y, 6, 7); }
    });
    text(ctx, p, `tiles ${done.filter(Boolean).length}/${T * T}`, 158, 98, 6.5, p.ink);
    // Roofline: memory-bound slope, FP32 and tensor-core ceilings, and the current kernel.
    const rx = 30, ry = 122, rw = W - rx - 12, rh = 42;
    const lx = (ai: number) => rx + (Math.log2(ai) + 2) / 10 * rw, ly = (g: number) => ry + rh - Math.log2(g) / 10 * rh, roofAt = (roof: number, ai: number) => Math.min(roof, ai * 6);
    ctx.strokeStyle = p.line; ctx.lineWidth = .6; ctx.strokeRect(rx, ry, rw, rh);
    ([[160, p.ink, []], [900, p.sub, [3, 3]]] as [number, string, number[]][]).forEach(([roof, c, dash]) => { ctx.setLineDash(dash); ctx.strokeStyle = c; ctx.lineWidth = 1.1; ctx.beginPath(); for (let k = 0; k <= 40; k++) { const ai = 2 ** (k / 4 - 2), x = lx(ai), y = ly(roofAt(roof, ai)); if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); ctx.setLineDash([]); });
    levels.forEach((l, i) => { const x = lx(l.ai), y = ly(roofAt(i === 2 ? 900 : 160, l.ai) * .8), on = i === level; ctx.fillStyle = on ? p.pink : rgba(p.ink, .35); ctx.beginPath(); ctx.arc(x, y, on ? 3.4 : 2.2, 0, Math.PI * 2); ctx.fill(); if (on) text(ctx, p, l.name, x + (i === 2 ? -5 : 5), y + (i === 2 ? 10 : -4), 6.5, p.pink, i === 2 ? 'right' : 'left', p.mono, 600); });
    text(ctx, p, 'FLOP/s', rx - 3, ry + 6, 5.5, p.sub, 'right'); text(ctx, p, 'arithmetic intensity →', rx + rw, ry + rh + 8, 5.5, p.sub, 'right');
    text(ctx, p, `GEMM · ${L.name}`, 12, 184, 6.5, p.ink);
  };
}

// ——— Small language models: autoregressive decoding with the causal attention row for each new token.
function decoding(): Scene {
  const tokens = ['<s>', 'Small', 'models', 'learn', 'to', 'reason', 'step', 'by', 'step', '.'];
  const options: [string, number][][] = [[], [], [], [['learn', .44], ['can', .23], ['are', .14], ['make', .07]], [['to', .71], ['fast', .09], ['from', .08], ['when', .05]], [['reason', .38], ['code', .21], ['plan', .17], ['talk', .09]], [['step', .52], ['well', .18], ['in', .11], ['with', .06]], [['by', .83], ['after', .06], ['-', .04], ['and', .02]], [['step', .91], ['token', .03], ['line', .02], ['hand', .01]], [['.', .66], [',', .15], ['and', .09], ['!', .04]]];
  const PROMPT = 3, n = tokens.length;
  let shown = PROMPT, phase = 0, hold = 0;
  const weights = (i: number) => { const s = Array.from({ length: i + 1 }, (_, j) => -0.42 * (i - j) + (tokens[j] === tokens[i] && j !== i ? 2 : 0) + (j === 0 ? 1 : 0) + .5 * Math.sin(i * 3.1 + j * 1.7)); const e = s.map(Math.exp), z = e.reduce((a, b) => a + b, 0); return e.map(v => v / z); };
  return (ctx, t, dt, p) => {
    if (shown < n) { phase += dt / 1.25; if (phase >= 1) { phase = 0; shown++; } } else if ((hold += dt) > 1.8) { hold = 0; shown = PROMPT; phase = 0; }
    // The running text: prompt, generated tokens, and the one being decided.
    let x = 12; ctx.font = `500 9px ${p.sans}`;
    tokens.slice(0, Math.min(n, shown + (phase > .72 ? 1 : 0))).forEach((tok, i) => {
      const w = ctx.measureText(tok).width + 7;
      roundRect(ctx, x, 10, w, 14, 3); ctx.fillStyle = i < PROMPT ? p.faint : i === shown ? rgba(p.pink, .2) : rgba(p.blue, .12); ctx.fill();
      text(ctx, p, tok, x + w / 2, 20, 9, i < PROMPT ? p.sub : p.ink, 'center', p.sans, 500); x += w + 2;
    });
    // Attention matrix under the causal mask; the newest row fills in.
    const mx = 14, my = 40, c = 9.4;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const X = mx + j * c, Y = my + i * c;
      if (j > i) { ctx.fillStyle = p.faint; ctx.fillRect(X, Y, c - 1, c - 1); continue; }
      if (i > shown || (i === shown && shown >= n)) continue;
      const w = weights(i)[j], a = i === shown ? clamp(phase * 1.6 - j * .05) : 1;
      ctx.fillStyle = rgba(i === shown ? p.pink : p.blue, (.08 + w * 1.4) * a); ctx.fillRect(X, Y, c - 1, c - 1);
    }
    ctx.strokeStyle = p.line; ctx.lineWidth = .6; ctx.strokeRect(mx - .5, my - .5, n * c, n * c);
    text(ctx, p, 'causal attention · L6 H3', mx, my + n * c + 10, 6);
    // Next-token distribution for the step in progress.
    const bx = 124, byy = 48, opts = options[Math.min(shown, n - 1)] ?? [];
    text(ctx, p, shown < n ? `p(x${shown} | x<${shown})` : 'decoded', bx, byy - 6, 7, p.ink, 'left', p.mono, 600);
    if (shown < n) opts.forEach(([word, prob], k) => {
      const y = byy + k * 17, grow = clamp(phase * 2.2), chosen = k === 0 && phase > .55;
      text(ctx, p, word, bx, y + 8, 7.5, chosen ? p.pink : p.ink, 'left', p.sans, chosen ? 600 : 400);
      ctx.fillStyle = p.faint; ctx.fillRect(bx + 36, y + 1, 58, 8);
      ctx.fillStyle = chosen ? p.pink : rgba(p.blue, .7); ctx.fillRect(bx + 36, y + 1, 58 * prob * grow, 8);
      text(ctx, p, prob.toFixed(2), W - 10, y + 8, 6.5, p.sub, 'right');
    });
    rule(ctx, p, 162);
    text(ctx, p, 'greedy decoding · top-k 4', 12, 182);
    text(ctx, p, `${Math.min(shown, n)}/${n} tokens`, W - 12, 182, 6.5, p.sub, 'right');
  };
}

// ——— Generative AI: the DDPM reverse process in 2D, Gaussian noise denoising into a six-petal flower.
function diffusion(): Scene {
  const random = seeded(21), n = 460;
  const pts = Array.from({ length: n }, () => {
    const th = random() * Math.PI * 2, r = Math.cos(3 * th) * (.35 + .65 * Math.sqrt(random()));
    const sector = Math.floor((((th + Math.PI / 6) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI / 3)) + (r < 0 ? 3 : 0);
    return { x: r * Math.cos(th), y: r * Math.sin(th), petal: sector % 3, ex: gaussian(random), ey: gaussian(random), ph: random() * 6.28 };
  });
  const traced = pts.slice(0, 16).map(() => [] as { x: number; y: number }[]);
  const alphaBar = (t: number) => Math.cos((t + .008) / 1.008 * Math.PI / 2) ** 2;
  let clock = 0; const CYCLE = 8.6;
  return (ctx, t, dt, p) => {
    const prevClock = clock; clock = (clock + dt) % CYCLE;
    if (clock < prevClock) traced.forEach(tr => { tr.length = 0; });
    // 0–4.2 s reverse (t: 1 → 0), hold the sample, 5.8–8 s forward back to noise, hold.
    const tt = clock < 4.2 ? 1 - (clock / 4.2) ** .9 : clock < 5.8 ? 0 : clock < 8 ? ((clock - 5.8) / 2.2) ** 1.1 : 1;
    const ab = alphaBar(tt), a = Math.sqrt(ab), s = Math.sqrt(1 - ab), cx = W / 2, cy = 80, R = 62, cols = [p.pink, p.blue, p.amber];
    ctx.strokeStyle = p.faint; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(cx - 80, cy); ctx.lineTo(cx + 80, cy); ctx.moveTo(cx, cy - 68); ctx.lineTo(cx, cy + 68); ctx.stroke();
    pts.forEach((q, i) => {
      const jitter = clock < 4.2 ? s * .06 * Math.sin(t * 9 + q.ph) : 0;
      const x = cx + (a * q.x + s * q.ex * .75 + jitter) * R, y = cy + (a * q.y + s * q.ey * .75 + jitter) * R;
      if (i < traced.length && clock < 4.2) { traced[i].push({ x, y }); if (traced[i].length > 70) traced[i].shift(); }
      ctx.fillStyle = rgba(cols[q.petal], .35 + .55 * (1 - s)); ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
    });
    traced.forEach(tr => { if (tr.length < 2) return; ctx.strokeStyle = rgba(p.ink, .35); ctx.lineWidth = .7; ctx.beginPath(); tr.forEach((q, k) => k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)); ctx.stroke(); });
    // Noise schedule ᾱ(t) with the current step marked.
    const gx = 12, gy = 152, gw = W - 24, gh = 14;
    ctx.strokeStyle = p.line; ctx.lineWidth = .6; ctx.strokeRect(gx, gy, gw, gh);
    ctx.strokeStyle = p.ink; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k <= 50; k++) { const u = k / 50, X = gx + u * gw, Y = gy + gh - alphaBar(u) * gh; if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); } ctx.stroke();
    ctx.fillStyle = p.pink; ctx.beginPath(); ctx.arc(gx + tt * gw, gy + gh - ab * gh, 2.6, 0, Math.PI * 2); ctx.fill();
    text(ctx, p, 'ᾱ(t) cosine schedule', gx, gy - 3, 6);
    text(ctx, p, clock < 4.2 ? 'DDPM · reverse process p(x_t−1 | x_t)' : clock < 5.8 ? 'sample x₀' : 'forward process q(x_t | x₀)', 12, 182, 6.5);
    text(ctx, p, `t = ${Math.round(tt * 1000)}`, W - 12, 182, 7, p.ink, 'right', p.mono, 600);
  };
}

// ——— Context engineering: retrieval ranking, a 128k token budget, and compaction when the window fills.
function context(): Scene {
  const random = seeded(33), LIMIT = 128;
  const names = ['paper.pdf §3', 'notes.md', 'api/tools.json', 'faq.md', 'thread #41', 'eval.csv'];
  let chunks = names.map(name => ({ name, score: .3 + random() * .6, size: 3 + Math.round(random() * 4) }));
  let convo = 6, memory = 4, clock = 0, turn = 1, compact = 0, compactFrom = 0, note = '';
  const history: number[] = [];
  const docs = () => chunks.slice(0, 3).reduce((s, c) => s + c.size, 0);
  const total = () => 2 + 6 + memory + docs() + convo;
  return (ctx, t, dt, p) => {
    if (compact > 0) { compact -= dt; convo = 10 + (compactFrom - 10) * Math.max(0, compact) / 1.1; if (compact <= 0) { convo = 10; memory = Math.min(12, memory + 2); } }
    else if ((clock += dt) > 1.5) {
      clock = 0; turn++; convo += 7 + Math.round(random() * 9);
      chunks = chunks.map(c => ({ ...c, score: clamp(c.score + (random() - .5) * .4, .12, .97) })).sort((a, b) => b.score - a.score);
      history.push(total()); if (history.length > 24) history.shift();
      if (total() > LIMIT) { compact = 1.1; compactFrom = convo; note = `compacted ${Math.round(convo)}k → 10k`; }
      if (turn > 30) { convo = 6; memory = 4; turn = 1; history.length = 0; note = ''; }
    }
    text(ctx, p, 'retrieval · cosine similarity', 12, 14, 6.5, p.ink, 'left', p.mono, 600);
    chunks.forEach((c, k) => {
      const y = 22 + k * 11, top = k < 3;
      text(ctx, p, c.name, 12, y + 7, 6.5, top ? p.ink : p.sub);
      ctx.fillStyle = p.faint; ctx.fillRect(80, y + 1, 110, 6);
      ctx.fillStyle = top ? p.blue : rgba(p.ink, .3); ctx.fillRect(80, y + 1, 110 * c.score, 6);
      text(ctx, p, c.score.toFixed(2), 214, y + 7, 6.5, top ? p.ink : p.sub, 'right');
      if (top) text(ctx, p, '✓', W - 12, y + 7, 7, p.blue, 'right');
    });
    // Token budget: system, tools, memory, retrieved docs and conversation against the limit.
    const segs: [string, number, string][] = [['sys', 2, p.ink], ['tools', 6, p.teal], ['mem', memory, p.violet], ['docs', docs(), p.blue], ['chat', convo, p.pink]];
    const bx = 12, by = 100, bw = W - 24, u = bw / LIMIT; let x = bx;
    ctx.fillStyle = p.faint; ctx.fillRect(bx, by, bw, 13);
    segs.forEach(([label, size, colour]) => { const w = Math.min(size * u, bx + bw - x); ctx.fillStyle = colour; ctx.fillRect(x, by, Math.max(0, w - .6), 13); if (w > 20) text(ctx, p, label, x + 3, by + 9, 6, p.dark && colour === p.ink ? p.paper : '#fff'); x += w; });
    ctx.strokeStyle = p.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx + bw, by - 3); ctx.lineTo(bx + bw, by + 16); ctx.stroke();
    text(ctx, p, `${Math.round(total())}k / ${LIMIT}k tokens`, bx, by - 4, 6.5, p.ink); text(ctx, p, 'limit', bx + bw, by - 4, 6, p.sub, 'right');
    // Usage over turns: a saw-tooth where compaction happens.
    const gx = 12, gy = 124, gw = W - 24, gh = 30;
    ctx.strokeStyle = p.line; ctx.lineWidth = .6; ctx.strokeRect(gx, gy, gw, gh);
    ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.moveTo(gx, gy + 1); ctx.lineTo(gx + gw, gy + 1); ctx.stroke(); ctx.setLineDash([]);
    if (history.length > 1) { ctx.strokeStyle = p.pink; ctx.lineWidth = 1.2; ctx.beginPath(); history.forEach((v, k) => { const X = gx + k / 23 * gw, Y = gy + gh - v / LIMIT * gh; if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }); ctx.stroke(); }
    text(ctx, p, `turn ${turn}`, 12, 182, 6.5, p.ink);
    text(ctx, p, note, W - 12, 182, 6.5, compact > 0 ? p.pink : p.sub, 'right');
  };
}

const SCENES: Record<string, () => Scene> = {
  rl: reinforcement, sciml: doubleSlit, mldl: spirals, cv: sobel, vla: driving,
  gpu: pipeline, kernel: gemm, slm: decoding, genai: diffusion, context,
};

export function HeroTile({ id }: { id: string }) {
  return <SceneCanvas make={SCENES[id]} />;
}

// Runs a scene on a crisp canvas while visible; under reduced motion it shows a settled still.
// A transparent canvas lets a scene sit directly on the page instead of on a paper card.
export function SceneCanvas({ make, transparent = false }: { make: () => Scene; transparent?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current, ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const scene = make();
    const styles = getComputedStyle(document.documentElement);
    const mono = styles.getPropertyValue('--font-geist-mono').trim() || 'ui-monospace, monospace';
    const sans = styles.getPropertyValue('--font-geist-sans').trim() || 'system-ui, sans-serif';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0, last = 0, time = 0, visible = true;
    const draw = (dt: number) => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2), w = Math.round(canvas.clientWidth * ratio), h = Math.round(canvas.clientHeight * ratio);
      if (!w || !h) return;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const p = palette(document.documentElement.dataset.theme === 'dark', mono, sans);
      ctx.setTransform(w / W, 0, 0, h / H, 0, 0);
      if (transparent) ctx.clearRect(0, 0, W, H); else { ctx.fillStyle = p.paper; ctx.fillRect(0, 0, W, H); }
      scene(ctx, time, dt, p);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    observer.observe(canvas);
    if (reduced) {
      for (let k = 0; k < 240; k++) { time += 1 / 60; draw(1 / 60); }
      const theme = new MutationObserver(() => draw(0));
      theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      return () => { observer.disconnect(); theme.disconnect(); };
    }
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min((now - (last || now)) / 1000, 1 / 20); last = now;
      if (!visible || document.hidden) return;
      time += dt; draw(dt);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [make, transparent]);
  return <canvas ref={ref} className="hc-canvas" aria-hidden="true" />;
}
