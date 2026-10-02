'use client';

import { useRef, useState } from 'react';
import { bootcamps } from './bootcamp-data';
import { beginFrame, clamp, isDark, mix, perspective, rgba, rotate, trackInk, useAutoAdvance, useFrame, useOrbitControls, type V3, type VariantProps } from './bootcamp-shared';
import { SceneLabels, type LabelPoint } from './scene-labels';

const N = bootcamps.length;
const NX = 88, NZ = 54, SPAN = 250;
const CENTER = { x: 380, y: 360 };
// Three Gerstner waves: direction, wavelength, amplitude (in units of SPAN) and steepness.
const WAVES = [
  { dx: .96, dz: .28, length: .95, amp: .06, q: .7 },
  { dx: .21, dz: .98, length: .52, amp: .034, q: .6 },
  { dx: -.66, dz: .75, length: .31, amp: .018, q: .5 },
].map(w => ({ ...w, k: Math.PI * 2 / w.length, omega: Math.sqrt(9.8 * Math.PI * 2 / w.length) * .42 }));
const BUOYS = [[-.78, -.46], [-.36, -.62], [.08, -.5], [.52, -.64], [.84, -.32], [-.9, .12], [-.44, .08], [.02, .2], [.46, .1], [.8, .42]].map(([x, z]) => ({ x, z }));

// Gerstner displacement: points orbit in circles, so crests sharpen and troughs flatten like real swell.
function gerstner(x: number, z: number, time: number) {
  let px = x, py = 0, pz = z;
  for (const w of WAVES) {
    const phase = w.k * (w.dx * x + w.dz * z) - w.omega * time;
    px += w.q * w.amp * w.dx * Math.cos(phase);
    pz += w.q * w.amp * w.dz * Math.cos(phase);
    py += w.amp * Math.sin(phase);
  }
  return { x: px, y: py, z: pz };
}

export default function BootcampSwell({ active, onActive }: VariantProps) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [labels, setLabels] = useState<(LabelPoint | null)[]>([]);
  const controls = useOrbitControls({ yaw: -.22, pitch: .34 }, { min: .12, max: .9 });
  useAutoAdvance(active, onActive, N, false, 6000);

  useFrame(stage, (dt, time) => {
    const ctx = canvas.current && beginFrame(canvas.current);
    if (!ctx) return;
    const dark = isDark();
    const v = controls.step(Math.cos(time * .12) * .035 * dt);
    const project = (p: V3) => perspective(rotate({ x: p.x * SPAN, y: p.y * SPAN, z: p.z * SPAN }, v.yaw, v.pitch), 1150, CENTER, 1.05);
    const deep = dark ? '#4c63d9' : '#2446e0', foam = dark ? '#f2f4ff' : '#9fb0e8', ink = dark ? '#dfe4ff' : '#1b2559';

    // The sea as a dot matrix: size and opacity follow depth, colour follows height.
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const x = (i / (NX - 1) * 2 - 1) * 1.15, z = (j / (NZ - 1) * 2 - 1) * .85, p = gerstner(x, z, time), s = project(p);
      const lift = clamp((p.y + .08) / .16), near = clamp((s.z + SPAN) / (2 * SPAN));
      ctx.fillStyle = rgba(mix(deep, foam, lift), .22 + near * .45 + lift * .2);
      const r = (.7 + lift * .9) * s.scale;
      ctx.fillRect(s.x - r / 2, s.y - r / 2, r, r);
    }

    const points = BUOYS.map((b, i) => {
      const on = i === active, colour = trackInk(bootcamps[i], dark), p = gerstner(b.x, b.z, time), base = project(p);
      if (on) {
        // Ripples spreading from the active buoy, laid on the local water level.
        for (let k = 0; k < 3; k++) {
          const r = ((time * .28 + k / 3) % 1) * .2;
          ctx.beginPath();
          for (let a = 0; a <= 40; a++) { const t = a / 40 * Math.PI * 2, q = project({ x: p.x + Math.cos(t) * r, y: p.y, z: p.z + Math.sin(t) * r * .9 }); if (a) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y); }
          ctx.strokeStyle = rgba(colour, .75 * (1 - r / .2)); ctx.lineWidth = 1.2; ctx.stroke();
        }
      }
      const top = project({ x: p.x, y: p.y + (on ? .62 : .12), z: p.z });
      ctx.strokeStyle = rgba(on ? colour : ink, on ? .85 : .5); ctx.lineWidth = on ? 1.4 : 1;
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      ctx.fillStyle = on ? colour : dark ? '#0b1030' : '#fff'; ctx.strokeStyle = on ? colour : ink; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(base.x, base.y, 5 * base.scale, 2.6 * base.scale, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      return { x: top.x, y: top.y, depth: clamp((top.z + SPAN) / (2 * SPAN)) };
    });
    setLabels(points);
  });

  return <div ref={stage} className="bc-figure bc-draggable" {...controls.handlers}>
    <canvas ref={canvas} className="bc-canvas" aria-hidden="true" />
    <SceneLabels points={labels} active={active} onActive={onActive} emphasis placement="above" />
  </div>;
}
