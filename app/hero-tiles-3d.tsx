'use client';

import { clamp, gaussian, mix, rgba, seeded } from './bootcamp-shared';
import { SceneCanvas, type Pal, type Scene } from './hero-tiles';
import { extend, gait, type Pal2, type Pose } from './hero-tiles-2';

// Gallery 3D: the same ten bootcamps as small real-time 3D scenes on the same 240×192 tiles, with no text,
// drawn on transparent canvases so they sit directly on the page.
// A tiny engine below handles the orbiting camera, perspective and painter's-order drawing.
const W = 240, H = 192;
type V = [number, number, number];
type P2 = { x: number; y: number; z: number; s: number };

class Cam {
  constructor(public yaw: number, public pitch: number, public dist = 8, public scale = 150, public cx = W / 2, public cy = H / 2 + 6) {}
  view(v: V): V {
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const x = v[0] * cy + v[2] * sy, z = -v[0] * sy + v[2] * cy;
    return [x, v[1] * cp - z * sp, v[1] * sp + z * cp];
  }
  p(v: V): P2 { const [x, y, z] = this.view(v), s = this.scale / (this.dist - z); return { x: this.cx + x * s, y: this.cy - y * s, z, s }; }
}

// Painter's list: queue drawables with a depth, then draw far to near.
class Frame3 {
  items: { z: number; draw: () => void }[] = [];
  constructor(public ctx: CanvasRenderingContext2D, public cam: Cam, public p: Pal2) {}
  add(z: number, draw: () => void) { this.items.push({ z, draw }); }
  flush() { this.items.sort((a, b) => a.z - b.z).forEach(i => i.draw()); this.items = []; }
  line(a: V, b: V, colour: string, width = 1, alpha = 1) {
    const A = this.cam.p(a), B = this.cam.p(b);
    this.add((A.z + B.z) / 2, () => { const c = this.ctx; c.strokeStyle = rgba(colour, alpha); c.lineWidth = width * (A.s + B.s) / 2 / 18; c.lineCap = 'round'; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); c.lineCap = 'butt'; });
  }
  dot(v: V, r: number, fill: string, alpha = 1, stroke?: string) {
    const P = this.cam.p(v);
    this.add(P.z + .01, () => { const c = this.ctx; c.fillStyle = rgba(fill, alpha); c.beginPath(); c.arc(P.x, P.y, Math.max(.4, r * P.s / 18), 0, Math.PI * 2); c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = .8; c.stroke(); } });
  }
  poly(pts: V[], fill: string, alpha: number, stroke?: string, strokeAlpha = .5, bias = 0) {
    const P = pts.map(v => this.cam.p(v)), z = P.reduce((s, q) => s + q.z, 0) / P.length + bias;
    this.add(z, () => { const c = this.ctx; c.beginPath(); P.forEach((q, k) => k ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)); c.closePath(); c.fillStyle = rgba(fill, alpha); c.fill(); if (stroke) { c.strokeStyle = rgba(stroke, strokeAlpha); c.lineWidth = .7; c.stroke(); } });
  }
  // An axis-aligned box with simple directional shading; only faces turned towards the camera are drawn.
  box(min: V, size: V, colour: string, alpha = 1, stroke?: string) {
    const [x, y, z] = min, [w, h, d] = size;
    const faces: [V, V[]][] = [
      [[0, 1, 0], [[x, y + h, z], [x + w, y + h, z], [x + w, y + h, z + d], [x, y + h, z + d]]],
      [[0, 0, 1], [[x, y, z + d], [x + w, y, z + d], [x + w, y + h, z + d], [x, y + h, z + d]]],
      [[0, 0, -1], [[x, y, z], [x, y + h, z], [x + w, y + h, z], [x + w, y, z]]],
      [[1, 0, 0], [[x + w, y, z], [x + w, y + h, z], [x + w, y + h, z + d], [x + w, y, z + d]]],
      [[-1, 0, 0], [[x, y, z], [x, y, z + d], [x, y + h, z + d], [x, y + h, z]]],
    ];
    const centre = this.cam.view([x + w / 2, y + h / 2, z + d / 2]);
    faces.forEach(([n, pts]) => {
      const nv = this.cam.view(n);
      if (nv[2] <= 0.02) return;
      const light = .55 + .45 * Math.max(0, nv[1] * .7 + nv[2] * .5 - nv[0] * .2);
      const fill = mix(this.p.dark ? '#000000' : '#1b2559', colour, .55 + light * .45);
      const P = pts.map(v => this.cam.p(v));
      this.add(centre[2] + nv[2] * .001, () => { const c = this.ctx; c.beginPath(); P.forEach((q, k) => k ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)); c.closePath(); c.fillStyle = rgba(fill, alpha); c.fill(); if (stroke) { c.strokeStyle = rgba(stroke, .55); c.lineWidth = .6; c.stroke(); } });
    });
  }
}
const scene3 = (make: () => (f: Frame3, t: number, dt: number) => void, cam: () => Cam): (() => Scene) => () => {
  const step = make(), camera = cam();
  return (ctx, t, dt, base: Pal) => {
    const p = extend(base);
    const f = new Frame3(ctx, camera, p);
    step(f, t, dt); f.flush();
  };
};
const ring = (f: Frame3, y: number, r: number, colour: string, alpha: number, n = 48) => { for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2, b = (k + 1) / n * Math.PI * 2; f.line([Math.cos(a) * r, y, Math.sin(a) * r], [Math.cos(b) * r, y, Math.sin(b) * r], colour, .8, alpha); } };
const grid = (f: Frame3, size: number, y: number, n: number, alpha = .12) => { for (let k = -n; k <= n; k++) { const u = k / n * size; f.line([u, y, -size], [u, y, size], f.p.ink, .6, alpha); f.line([-size, y, u], [size, y, u], f.p.ink, .6, alpha); } };

// ——— Reinforcement learning: a robot arm learning to grasp — misses tighten until it lifts the cube.
const robotArm = scene3(() => {
  const L1 = 1.55, L2 = 1.35, SH = .5, SPOTS: V[] = [[1.9, .2, .7], [1.2, .2, -1.6], [-.4, .2, 1.95], [1.6, .2, 1.3]];
  let spot = 0, attempt = 0, clock = 0;
  const trail: V[] = [];
  const ik = (target: V) => {
    const yaw = Math.atan2(target[2], target[0]), r = Math.hypot(target[0], target[2]), h = target[1] - SH, d = Math.min(L1 + L2 - .01, Math.hypot(r, h));
    const elbow = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1)), shoulder = Math.atan2(h, r) + Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    return { yaw, shoulder, elbow };
  };
  const fk = (yaw: number, shoulder: number, elbow: number) => {
    const dir = (a: number): V => [Math.cos(yaw) * Math.cos(a), Math.sin(a), Math.sin(yaw) * Math.cos(a)];
    const s: V = [0, SH, 0], e: V = [s[0] + dir(shoulder)[0] * L1, s[1] + dir(shoulder)[1] * L1, s[2] + dir(shoulder)[2] * L1];
    const a2 = shoulder - (Math.PI - elbow), w: V = [e[0] + dir(a2)[0] * L2, e[1] + dir(a2)[1] * L2, e[2] + dir(a2)[2] * L2];
    return { s, e, w };
  };
  const REST = { yaw: 0, shoulder: 1.25, elbow: 1.2 };
  return (f, t, dt) => {
    const p = f.p; f.cam.yaw = .6 + t * .12;
    clock += dt;
    const target = SPOTS[spot], success = attempt >= 3, miss = (1 - attempt / 3) * .55;
    const aim: V = success ? target : [target[0] + miss * Math.cos(attempt * 2.1 + spot), target[1] + .25, target[2] + miss * Math.sin(attempt * 2.1 + spot)];
    const goal = ik(aim), lift = success && clock > 1.3 ? clamp((clock - 1.3) / .8) : 0;
    const reach = clock < 1.2 ? (1 - Math.cos(Math.PI * clock / 1.2)) / 2 : clock < (success ? 2.6 : 1.7) ? 1 : clamp(1 - (clock - (success ? 2.6 : 1.7)) / .9);
    const lifted = ik([aim[0] * (1 - lift * .25), aim[1] + lift * 1.1, aim[2] * (1 - lift * .25)]);
    const pose = { yaw: REST.yaw + ((success ? lifted.yaw : goal.yaw) - REST.yaw) * reach, shoulder: REST.shoulder + ((success ? lifted.shoulder : goal.shoulder) - REST.shoulder) * reach, elbow: REST.elbow + ((success ? lifted.elbow : goal.elbow) - REST.elbow) * reach };
    if (clock > (success ? 3.6 : 2.7)) { clock = 0; trail.length = 0; if (success) { attempt = 0; spot = (spot + 1) % SPOTS.length; } else attempt++; }
    const { s, e, w } = fk(pose.yaw, pose.shoulder, pose.elbow);
    trail.push(w); if (trail.length > 90) trail.shift();
    // Table, cube and the arm.
    f.poly([[-2.6, 0, -2.4], [2.6, 0, -2.4], [2.6, 0, 2.4], [-2.6, 0, 2.4]], p.ink, .05, p.ink, .25, -50);
    grid(f, 2.6, .001, 4, .07);
    const carried = success && lift > 0 && reach > .9, cube: V = carried ? [w[0] - .2, w[1] - .42, w[2] - .2] : [target[0] - .2, 0, target[2] - .2];
    f.box(cube, [.4, .4, .4], p.amber, 1, p.ink);
    for (let k = 1; k < trail.length; k++) f.line(trail[k - 1], trail[k], success ? p.blue : p.rust, 1, k / trail.length * .6);
    f.box([-.45, 0, -.45], [.9, .35, .9], p.ink, .9, p.ink);
    f.line(s, e, p.ink, 7); f.line(e, w, p.ink, 5.5);
    f.line([w[0], w[1], w[2]], [w[0], w[1] - .3, w[2] + .12], p.ink, 2.5); f.line([w[0], w[1], w[2]], [w[0], w[1] - .3, w[2] - .12], p.ink, 2.5);
    [s, e, w].forEach(j => f.dot(j, 4, p.paper, 1, p.ink));
    if (!success && reach > .95) { const P: V = [aim[0], .02, aim[2]]; for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, b = (k + 1) / 24 * Math.PI * 2, r = .2 + (clock % .6); f.line([P[0] + Math.cos(a) * r, .02, P[2] + Math.sin(a) * r], [P[0] + Math.cos(b) * r, .02, P[2] + Math.sin(b) * r], p.pink, 1, .6); } }
  };
}, () => new Cam(.6, .5, 9, 300, W / 2 - 6, H / 2 + 34));

// ——— Scientific ML: a finite wing in a 3D flow, streamlines bending over it and vortices spinning off the tips.
type C2 = [number, number];
const cadd = (a: C2, b: C2): C2 => [a[0] + b[0], a[1] + b[1]], csub = (a: C2, b: C2): C2 => [a[0] - b[0], a[1] - b[1]];
const cmul = (a: C2, b: C2): C2 => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a: C2, b: C2): C2 => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const cmag = (a: C2) => Math.hypot(a[0], a[1]), ccis = (t: number): C2 => [Math.cos(t), Math.sin(t)];
const csqrt = (a: C2): C2 => { const r = Math.sqrt(cmag(a)), th = Math.atan2(a[1], a[0]) / 2; return [r * Math.cos(th), r * Math.sin(th)]; };
const wing3d = scene3(() => {
  const MU: C2 = [-.09, .08], A = cmag(csub([1, 0], MU)), AL = 7 * Math.PI / 180, BE = Math.asin(MU[1] / A), G = 4 * Math.PI * A * Math.sin(AL + BE);
  const dW = (z: C2): C2 => { const d = csub(z, MU); return cadd(csub(ccis(-AL), cdiv(cmul([A * A, 0], ccis(AL)), cmul(d, d))), cdiv([0, G / (2 * Math.PI)], d)); };
  const J = (z: C2): C2 => csub([1, 0], cdiv([1, 0], cmul(z, z))), toZ = (z: C2): C2 => cadd(z, cdiv([1, 0], z));
  const fromZ = (z: C2): C2 => { const r = csqrt(csub(cmul(z, z), [4, 0])), a = cmul(cadd(z, r), [.5, 0]), b = cmul(csub(z, r), [.5, 0]); return cmag(csub(a, MU)) > cmag(csub(b, MU)) ? a : b; };
  const vel = (z: C2): C2 => { const v = cdiv(dW(z), J(z)); return [v[0], -v[1]]; };
  const random = seeded(5), SPAN = 2.1, K = .62;
  const seed = () => ({ z: fromZ([-2.6 - random() * .6, (random() * 2 - 1) * 1.1]), w: (random() * 2 - 1) * SPAN * 1.15, trail: [] as V[] });
  const parts = Array.from({ length: 120 }, seed);
  const outline = Array.from({ length: 40 }, (_, k) => toZ(cadd(MU, cmul([A * 1.001, 0], ccis(k / 40 * Math.PI * 2)))));
  return (f, t, dt) => {
    const p = f.p; f.cam.yaw = -.7 + Math.sin(t * .2) * .35;
    // Wing surface: quads between spanwise stations, coloured by surface speed (suction above, pressure below).
    const stations = [-SPAN, -SPAN / 2, 0, SPAN / 2, SPAN];
    for (let k = 0; k < outline.length; k++) {
      const a = outline[k], b = outline[(k + 1) % outline.length], top = (a[1] + b[1]) / 2 > MU[1] * 1.6;
      for (let s = 0; s < stations.length - 1; s++) f.poly([[a[0] * K, a[1] * K, stations[s]], [b[0] * K, b[1] * K, stations[s]], [b[0] * K, b[1] * K, stations[s + 1]], [a[0] * K, a[1] * K, stations[s + 1]]], top ? p.blue : p.pink, top ? .45 : .35, p.ink, .25);
    }
    // Streamlines past the wing, plus tip vortices trailing from both ends.
    for (const q of parts) {
      for (let s = 0; s < 2; s++) { const v = vel(q.z), j = J(q.z), dz = cdiv(v, j), m = cmag(dz), k = m > 3 ? 3 / m : 1; q.z = [q.z[0] + dz[0] * k * dt * .8, q.z[1] + dz[1] * k * dt * .8]; }
      const w = toZ(q.z), out = Math.abs(q.w) > SPAN;
      if (w[0] > 2.6 || cmag(csub(q.z, MU)) < A * 1.005 || !Number.isFinite(w[0])) { Object.assign(q, seed()); continue; }
      const swirl = out && w[0] > 0 ? Math.min(1, w[0] / 2) : 0, ang = t * 5 + q.w * 7;
      q.trail.push([w[0] * K, w[1] * K + Math.sin(ang) * .22 * swirl, q.w + Math.sign(q.w) * Math.cos(ang) * .22 * swirl]); if (q.trail.length > 8) q.trail.shift();
      const speed = cmag(vel(q.z)), colour = out && swirl > 0 ? p.violet : speed > 1.25 ? p.blue : speed < .8 ? p.pink : p.ink;
      for (let k = 1; k < q.trail.length; k++) f.line(q.trail[k - 1], q.trail[k], colour, 1, k / q.trail.length * (colour === p.ink ? .35 : .8));
    }
  };
}, () => new Cam(-.7, .42, 8, 255, W / 2 + 6, H / 2 + 4));

// ——— ML / DL: a 3D network reading a digit; activations flow layer to layer and one output lights.
const network3d = scene3(() => {
  const SEVEN = ['1111111', '0000011', '0000110', '0001100', '0011000', '0110000', '0110000'];
  const layer = (x: number, n: number, gap: number): V[] => Array.from({ length: n * n }, (_, k) => [x, (Math.floor(k / n) - (n - 1) / 2) * gap, (k % n - (n - 1) / 2) * gap]);
  const L = [layer(-1.2, 4, .5), layer(.4, 3, .55)], OUT: V[] = Array.from({ length: 10 }, (_, k) => [1.9, (4.5 - k) * .32, 0]);
  return (f, t) => {
    const p = f.p; f.cam.yaw = -.9 + Math.sin(t * .25) * .45;
    const phase = (t * .7) % 1;
    // Input image as a lit pixel plane.
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
      const on = SEVEN[r][c] === '1', y = (3 - r) * .28, z = (c - 3) * .28;
      f.poly([[-2.6, y - .12, z - .12], [-2.6, y + .12, z - .12], [-2.6, y + .12, z + .12], [-2.6, y - .12, z + .12]], on ? p.ink : p.ink, on ? .85 : .06, p.ink, .15);
    }
    const all = [L[0], L[1], OUT];
    for (let l = 0; l < 3; l++) {
      const from = l === 0 ? [[-2.6, .6, -.6], [-2.6, -.6, .6], [-2.6, .3, .3]] as V[] : all[l - 1];
      all[l].forEach((b, i) => from.forEach((a, k) => { if ((i + k) % 3) return; f.line(a, b, p.ink, .6, .1); if (Math.abs(phase - l / 3) < .2) { const u = clamp((phase - l / 3 + .2) / .4); f.dot([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u], 1.6, p.blue, .8); } }));
    }
    L.forEach((nodes, l) => nodes.forEach((n, i) => f.dot(n, 2.8, p.blue, .2 + .7 * Math.abs(Math.sin(i * 1.3 + l + t * 2)), p.ink)));
    OUT.forEach((n, k) => f.dot(n, k === 7 ? 4.2 : 2.6, k === 7 ? p.blue : p.paper, k === 7 ? .5 + .5 * Math.sin(t * 4) ** 2 : 1, p.ink));
  };
}, () => new Cam(-.9, .3, 8, 245, W / 2 + 4, H / 2));

// ——— Computer vision: a depth camera's point cloud of a walking person, with the fitted skeleton and a 3D box.
const pointCloud = scene3(() => {
  const random = seeded(14);
  const samples = Array.from({ length: 820 }, () => ({ limb: Math.floor(random() * 10), u: random(), a: random() * Math.PI * 2, r: .55 + random() * .45 }));
  return (f, t) => {
    const p = f.p; f.cam.yaw = t * .35;
    const pose: Pose = gait(t * 5, 3), side = .26, head: [number, number] = [pose.neck[0] + .04, pose.neck[1] + .34];
    const J = (j: [number, number], z = 0): V => [j[0] - .1, j[1], z];
    const limbs: [V, V, number][] = [
      [J(pose.neck), J(pose.hip), .3], [J(pose.hip, side), J(pose.kneeL, side), .17], [J(pose.kneeL, side), J(pose.footL, side), .13], [J(pose.hip, -side), J(pose.kneeR, -side), .17], [J(pose.kneeR, -side), J(pose.footR, -side), .13],
      [J(pose.neck, side + .2), J(pose.elbowL, side + .32), .11], [J(pose.elbowL, side + .32), J(pose.handL, side + .38), .09], [J(pose.neck, -side - .2), J(pose.elbowR, -side - .32), .11], [J(pose.elbowR, -side - .32), J(pose.handR, -side - .38), .09], [J(head), J(head), .2],
    ];
    ring(f, 0, 1.6, p.ink, .2); ring(f, 0, 1.1, p.ink, .12);
    samples.forEach(s => {
      const [a, b, rad] = limbs[s.limb], c: V = [a[0] + (b[0] - a[0]) * s.u, a[1] + (b[1] - a[1]) * s.u, a[2] + (b[2] - a[2]) * s.u];
      const v: V = [c[0] + Math.cos(s.a) * rad * s.r, c[1] + (s.limb === 9 ? Math.sin(s.a) * rad * s.r : 0), c[2] + Math.sin(s.a) * rad * s.r];
      const near = f.cam.view(v)[2];
      f.dot(v, .8, mix(p.violet, p.blue, clamp((near + 1.4) / 2.8)), .7);
    });
    limbs.slice(0, 9).forEach(([a, b]) => f.line(a, b, p.pink, 1.5, .95));
    limbs.slice(0, 9).forEach(([a, b]) => { f.dot(a, 1.5, p.pink, 1); f.dot(b, 1.5, p.pink, 1); });
    // Fitted 3D bounding box.
    const x0 = -.8, x1 = .8, y1 = 3.55, z0 = -.6, z1 = .6, corners: V[] = [[x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]];
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => f.line(corners[a], corners[b], p.olive, 1, .8));
  };
}, () => new Cam(0, .2, 9, 235, W / 2, H / 2 + 72));

// ——— Vision-language-action: a chase camera behind the ego car; lidar returns paint the cars ahead.
const drive3d = scene3(() => {
  const LANE = 1.4, cars = [{ lane: 0, z: -6, v: .6 }, { lane: -1, z: -11, v: 1.4 }, { lane: 1, z: -15, v: 1 }];
  let egoX = 0, target = 0, hold = 0;
  return (f, t, dt) => {
    const p = f.p; f.cam.yaw = Math.sin(t * .3) * .12;
    for (const c of cars) { c.z += (2.2 - c.v) * dt * 1.6; if (c.z > 4) { c.z = -18; c.lane = [-1, 0, 1][Math.floor((t * 7) % 3)]; } }
    const ahead = cars.find(c => Math.abs(c.lane * LANE - egoX) < .5 && c.z < -.5 && c.z > -6.5);
    if (ahead && (hold -= dt) < 0) { const options = [-1, 0, 1].filter(l => l !== Math.round(target / LANE) && !cars.some(c => c.lane === l && c.z > -7 && c.z < 2)); if (options.length) { target = options[0] * LANE; hold = 2; } }
    egoX += (target - egoX) * (1 - Math.exp(-dt * 1.8));
    // Road, scrolling lane dashes, the plan ribbon.
    f.poly([[-2.2, 0, 4], [2.2, 0, 4], [2.2, 0, -20], [-2.2, 0, -20]], p.ink, .06, undefined, 0, -60);
    [-2.2, 2.2].forEach(x => f.line([x, 0, 4], [x, 0, -20], p.ink, 1.2, .7));
    [-LANE / 2, LANE / 2].forEach(x => { for (let k = 0; k < 12; k++) { const z = 4 - k * 2 - ((t * 4.5) % 2); f.line([x, 0, z], [x, 0, z - .9], p.ink, 1, .45); } });
    for (let k = 0; k < 12; k++) { const u = k / 12, z = -u * 7, x = egoX + (target - egoX) * (1 - Math.cos(Math.PI * Math.min(1, u * 1.6))) / 2; f.dot([x, .02, z - .6], 2, p.blue, .8); }
    const car = (x: number, z: number, colour: string, alpha: number) => { f.box([x - .38, 0, z - .8], [.76, .45, 1.6], colour, alpha, p.ink); f.box([x - .3, .45, z - .4], [.6, .28, .8], colour, alpha, p.ink); };
    cars.forEach(c => car(c.lane * LANE, c.z, p.paper, 1));
    car(egoX, 0, p.blue, 1);
    // Lidar: a spinning sweep from the roof; returns land on the nearest car faces.
    const origin: V = [egoX, .85, 0];
    for (let k = 0; k < 64; k++) {
      const a = k / 64 * Math.PI * 2 + t * 2, dx = Math.cos(a), dz = Math.sin(a);
      let hit = 7, onCar = false;
      for (const c of cars) { const cx = c.lane * LANE; for (let d = .5; d < hit; d += .12) { const x = origin[0] + dx * d, z = dz * d; if (Math.abs(x - cx) < .4 && Math.abs(z - c.z) < .82) { hit = d; onCar = true; break; } } }
      if (!onCar && Math.abs(origin[0] + dx * hit) > 2.2) hit = Math.abs((Math.sign(dx) * 2.2 - origin[0]) / dx);
      const end: V = [origin[0] + dx * hit, onCar ? .35 : .02, dz * hit];
      if (k % 2 === 0) f.line(origin, end, p.blue, .5, .12);
      f.dot(end, 1.8, onCar ? p.pink : p.ink, onCar ? .95 : .35);
    }
  };
}, () => new Cam(0, .38, 7.5, 150, W / 2, H / 2 + 28));

// ——— GPU engineering: an 8-GPU board in 3D, NVLink traffic following each parallelism strategy in turn.
const board3d = scene3(() => {
  const gpus: V[] = Array.from({ length: 8 }, (_, i) => [(i % 4 - 1.5) * 1.15, 0, i < 4 ? -.8 : .8]);
  const modes: [number, number][][] = [
    [[0, 1], [1, 2], [2, 3], [3, 7], [7, 6], [6, 5], [5, 4], [4, 0]], [[0, 4], [1, 5], [2, 6], [3, 7]], [[0, 1], [1, 2], [2, 3], [4, 5], [5, 6], [6, 7]], [[0, 6], [1, 7], [2, 4], [3, 5], [0, 3], [4, 7]],
  ];
  return (f, t) => {
    const p = f.p; f.cam.yaw = .5 + t * .15;
    const edges = modes[Math.floor(t / 3) % modes.length];
    f.box([-2.6, -.12, -1.6], [5.2, .12, 3.2], p.paper, 1, p.ink);
    f.box([-.35, 0, -.25], [.7, .18, .5], p.ink, .8, p.ink);
    gpus.forEach((g, i) => {
      const busy = edges.some(e => e.includes(i)), util = .5 + .5 * Math.sin(t * 2.4 + i);
      f.box([g[0] - .42, 0, g[2] - .45], [.84, .32, .9], busy ? mix(p.paper, p.blue, .25 + util * .45) : p.paper, 1, p.ink);
      for (let k = 1; k < 6; k++) f.line([g[0] - .42 + k * .14, .33, g[2] - .4], [g[0] - .42 + k * .14, .33, g[2] + .4], p.ink, .7, .35);
    });
    edges.forEach(([a, b], k) => {
      const A = gpus[a], B = gpus[b], P = (u: number): V => [A[0] + (B[0] - A[0]) * u, .4 + Math.sin(Math.PI * u) * .8, A[2] + (B[2] - A[2]) * u];
      for (let s = 0; s < 14; s++) f.line(P(s / 14), P((s + 1) / 14), p.pink, 1.4, .75);
      f.dot(P((t * .8 + k * .17) % 1), 3.2, p.pink, 1);
    });
  };
}, () => new Cam(.5, .62, 8, 235, W / 2, H / 2 + 12));

// ——— Kernel engineering: a GPU die at work — HBM stacks feed L2, SM blocks rise and fall as warps run.
const die3d = scene3(() => {
  const load = new Float32Array(24);
  return (f, t, dt) => {
    const p = f.p; f.cam.yaw = -.6 + t * .1;
    f.box([-3, -.1, -2], [6, .1, 4], p.ink, .08, p.ink);
    f.box([-2.3, 0, -1.4], [4.6, .04, 2.8], p.paper, 1, p.ink);
    [[-2.85, -1.1], [-2.85, .2], [2.35, -1.1], [2.35, .2]].forEach(([x, z]) => { for (let l = 0; l < 4; l++) f.box([x, l * .14, z], [.5, .12, .9], p.violet, .55 + l * .1, p.violet); });
    f.box([-2.2, .04, -.12], [4.4, .05, .24], p.teal, .6, p.teal);
    for (let k = 0; k < 24; k++) {
      const c = k % 6, r = Math.floor(k / 6), target = Math.max(0, Math.sin((c / 6 + r * .17 - t * .45) * Math.PI * 2));
      load[k] += (target - load[k]) * (1 - Math.exp(-dt * 5));
      const x = -2.1 + c * .72, z = r < 2 ? -1.3 + r * .55 : .2 + (r - 2) * .55, h = .08 + load[k] * .9;
      f.box([x, .04, z], [.6, h, .45], mix(p.paper, p.blue, .2 + load[k] * .7), 1, p.ink);
    }
    for (let k = 0; k < 10; k++) { const u = (t * .6 + k / 10) % 1, x = k % 2 ? 2.2 - u * 2.2 : -2.2 + u * 2.2; f.dot([x, .14, 0], 2.4, p.teal, 1); }
  };
}, () => new Cam(-.6, .7, 8, 222, W / 2, H / 2 + 8));

// ——— Small language models: tokens climb through a transformer stack and the next one emerges at the top.
const stack3d = scene3(() => {
  const LAYERS = 5, TOK = 6;
  return (f, t) => {
    const p = f.p; f.cam.yaw = .7 + Math.sin(t * .22) * .5;
    const cycle = (t * .5) % 1, level = cycle * (LAYERS + 1);
    for (let l = 0; l < LAYERS; l++) {
      const y = .55 + l * .55, lit = Math.abs(level - (l + .5)) < .6;
      f.box([-1.9, y, -.55], [3.8, .08, 1.1], lit ? mix(p.paper, p.blue, .35) : p.paper, .55, p.ink);
      if (lit) for (let a = 0; a < TOK; a++) for (let b = 0; b < a; b++) { if ((a + b) % 2) continue; const xa = -1.5 + a * .6, xb = -1.5 + b * .6; for (let s = 0; s < 8; s++) { const u0 = s / 8, u1 = (s + 1) / 8, P = (u: number): V => [xa + (xb - xa) * u, y + .1 + Math.sin(Math.PI * u) * .3, 0]; f.line(P(u0), P(u1), p.pink, .8, .55); } }
    }
    for (let k = 0; k < TOK; k++) {
      const x = -1.5 + k * .6, y = Math.min(level, LAYERS) * .55 + .1;
      f.box([x - .17, 0, -.17], [.34, .34, .34], p.ink, .85, p.ink);
      f.box([x - .12, y + .1, -.12], [.24, .24, .24], p.blue, .9, p.ink);
    }
    const out = clamp((level - LAYERS) * 2);
    if (out > 0) f.box([1.9 - .17, .55 * LAYERS + .5 + out * .3, -.17], [.34, .34, .34], p.pink, out, p.ink);
  };
}, () => new Cam(.7, .32, 9, 265, W / 2, H / 2 + 74));

// ——— Gen AI: a 3D embedding space; a query vector flies in and links to its nearest neighbours.
const embed3d = scene3(() => {
  const random = seeded(17);
  const centres: V[] = [[-1.3, .3, .4], [1.3, -.1, -1], [.1, -1.1, .9], [-.1, 1.2, 1.3]];
  const pts = centres.flatMap((c, ti) => Array.from({ length: 22 }, () => ({ ti, v: [c[0] + gaussian(random) * .28, c[1] + gaussian(random) * .28, c[2] + gaussian(random) * .28] as V })));
  return (f, t) => {
    const p = f.p; f.cam.yaw = t * .3;
    const colours = [p.olive, p.violet, p.blue, p.rust], which = Math.floor(t / 4.5) % 4, clock = t % 4.5;
    [[[-2, 0, 0], [2, 0, 0]], [[0, -2, 0], [0, 2, 0]], [[0, 0, -2], [0, 0, 2]]].forEach(([a, b]) => f.line(a as V, b as V, p.ink, .8, .2));
    pts.forEach(q => f.dot(q.v, 1.9, colours[q.ti], .8));
    const target: V = [centres[which][0] + .1, centres[which][1] + .05, centres[which][2] - .05], start: V = [2.2, 2, 2.2];
    const u = clamp(clock / 1.2), e = 1 - (1 - u) ** 3, qv: V = [start[0] + (target[0] - start[0]) * e, start[1] + (target[1] - start[1]) * e, start[2] + (target[2] - start[2]) * e];
    for (let k = 0; k < 16; k++) { const a = k / 16; f.dot([start[0] + (qv[0] - start[0]) * a, start[1] + (qv[1] - start[1]) * a, start[2] + (qv[2] - start[2]) * a], 1, p.pink, .25 * a); }
    if (u >= 1) pts.filter(q => q.ti === which).map(q => ({ q, d: Math.hypot(q.v[0] - target[0], q.v[1] - target[1], q.v[2] - target[2]) })).sort((a, b) => a.d - b.d).slice(0, 3).forEach(({ q }, k) => { const g = clamp((clock - 1.3 - k * .25) * 3); if (g > 0) f.line(qv, [qv[0] + (q.v[0] - qv[0]) * g, qv[1] + (q.v[1] - qv[1]) * g, qv[2] + (q.v[2] - qv[2]) * g], p.ink, 1.2, .8); });
    f.dot(qv, 5, p.pink, 1, p.paper);
  };
}, () => new Cam(0, .38, 8, 245, W / 2, H / 2 + 4));

// ——— Context engineering: an agent at the centre, tools orbiting, results filling a ring of context that compacts.
const agent3d = scene3(() => {
  const SLOTS = 14;
  let filled = 2, clock = 0, compact = 0;
  return (f, t, dt) => {
    const p = f.p; f.cam.yaw = t * .12;
    const colours = [p.blue, p.teal, p.olive, p.violet];
    clock += dt;
    if (compact > 0) { compact -= dt; if (compact <= 0) filled = 3; }
    else if (clock > 1.4) { clock = 0; filled++; if (filled >= SLOTS) compact = .8; }
    const tools = colours.map((_, k) => { const a = k / 4 * Math.PI * 2 + t * .4; return [Math.cos(a) * 1.9, .35 + Math.sin(a * 2) * .2, Math.sin(a) * 1.9] as V; });
    // Context ring under the agent; each segment is one message, merged on compaction.
    for (let k = 0; k < SLOTS; k++) {
      const a0 = k / SLOTS * Math.PI * 2, a1 = (k + .85) / SLOTS * Math.PI * 2, r0 = 1.05, r1 = 1.35, y = -.45, on = k < filled, fading = compact > 0 && k > 1;
      f.poly([[Math.cos(a0) * r0, y, Math.sin(a0) * r0], [Math.cos(a1) * r0, y, Math.sin(a1) * r0], [Math.cos(a1) * r1, y, Math.sin(a1) * r1], [Math.cos(a0) * r1, y, Math.sin(a0) * r1]], on ? (k < 2 ? p.pink : colours[k % 4]) : p.ink, on ? (fading ? .2 + compact : .85) : .07, p.ink, .2, -5);
    }
    tools.forEach((v, k) => { f.box([v[0] - .22, v[1] - .22, v[2] - .22], [.44, .44, .44], colours[k], 1, p.ink); f.line([0, .3, 0], v, colours[k], .7, .3); });
    const active = Math.floor(t / 1.4) % 4, u = (t % 1.4) / 1.4, tv = tools[active], back = u > .5, s = back ? (u - .5) * 2 : u * 2;
    const from: V = back ? tv : [0, .3, 0], to: V = back ? [0, .3, 0] : tv;
    f.dot([from[0] + (to[0] - from[0]) * s, from[1] + (to[1] - from[1]) * s + Math.sin(Math.PI * s) * .4, from[2] + (to[2] - from[2]) * s], back ? 4.5 : 3, colours[active], 1);
    f.dot([0, .3, 0], 15, p.ink, 1);
    f.dot([0, .3, 0], 9, p.paper, .18 + .12 * Math.sin(t * 3));
  };
}, () => new Cam(0, .5, 8, 235, W / 2, H / 2 + 6));

const SCENES_3D: Record<string, () => Scene> = {
  rl: robotArm, sciml: wing3d, mldl: network3d, cv: pointCloud, vla: drive3d,
  gpu: board3d, kernel: die3d, slm: stack3d, genai: embed3d, context: agent3d,
};

export function HeroTile3D({ id }: { id: string }) {
  return <SceneCanvas make={SCENES_3D[id]} transparent />;
}
