'use client';

import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent, type RefObject } from 'react';
import { TRACKS, bootcamps, statusLabel, type Bootcamp } from './bootcamp-data';

export const STAGE = { width: 760, height: 630 };
export const N = bootcamps.length;

export type VariantProps = { active: number; onActive: (index: number) => void };

export const wrap = (value: number, size: number) => ((value % size) + size) % size;
export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const pad = (index: number) => String(index + 1).padStart(2, '0');

export const trackStyle = (bootcamp: Bootcamp) => ({ '--track': TRACKS[bootcamp.track].color, '--track-tint': TRACKS[bootcamp.track].tint, '--track-soft': TRACKS[bootcamp.track].soft }) as CSSProperties;

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

// Calls `onFrame` every animation frame while the stage is on screen and the tab is visible.
// With reduced motion the clock stays at zero and the callback runs a few times a second with a large
// step, so scenes settle straight onto the selected program without animating.
export function useFrame(target: RefObject<HTMLElement | null>, onFrame: (dt: number, time: number) => void) {
  const callback = useRef(onFrame);
  const visible = useRef(true);
  const reduced = usePrefersReducedMotion();

  useEffect(() => { callback.current = onFrame; });

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting; });
    if (target.current) observer.observe(target.current);
    return () => observer.disconnect();
  }, [target]);

  useEffect(() => {
    if (reduced) {
      callback.current(1, 0);
      const timer = window.setInterval(() => callback.current(1, 0), 300);
      return () => window.clearInterval(timer);
    }
    let frame = 0, last = 0, elapsed = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min((now - (last || now)) / 1000, .05); last = now;
      if (document.hidden || !visible.current) return;
      elapsed += dt;
      callback.current(dt, elapsed);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduced]);

  return reduced;
}

// Sizes a canvas to its box at device resolution and maps drawing onto the 760×630 stage coordinates.
export function beginFrame(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(canvas.clientWidth * ratio), height = Math.round(canvas.clientHeight * ratio);
  if (!width || !height) return null;
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  ctx.setTransform(width / STAGE.width, 0, 0, height / STAGE.height, 0, 0);
  ctx.clearRect(0, 0, STAGE.width, STAGE.height);
  return ctx;
}

// Canvas scenes read the theme each frame so they follow the navbar toggle without re-mounting.
export const isDark = () => typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark';
export const trackInk = (bootcamp: Bootcamp, dark: boolean) => dark ? mix(TRACKS[bootcamp.track].color, '#ffffff', .38) : TRACKS[bootcamp.track].color;

export const approach = (value: number, goal: number, dt: number, rate: number) => value + (goal - value) * (1 - Math.exp(-dt * rate));

// Advances the active bootcamp on a timer unless the visitor is interacting.
export function useAutoAdvance(active: number, onActive: (index: number) => void, count: number, paused: boolean, delay = 4200) {
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (paused || reduced) return;
    const timer = window.setTimeout(() => { if (!document.hidden) onActive((active + 1) % count); }, delay);
    return () => window.clearTimeout(timer);
  }, [active, onActive, count, paused, reduced, delay]);
}

// Hovering or focusing inside a scene pauses its tour.
export function useHoverPause() {
  const [paused, setPaused] = useState(false);
  const handlers = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onFocusCapture: () => setPaused(true),
    onBlurCapture: (event: FocusEvent<HTMLElement>) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setPaused(false); },
  };
  return [paused, handlers] as const;
}

// Drag-to-rotate with inertia. `view` is only read inside frame callbacks and handlers.
export function useOrbitControls(initial: { yaw: number; pitch: number }, limits = { min: -1.1, max: 1.1 }) {
  const view = useRef({ ...initial, vx: 0, vy: 0, dragging: false });
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const handlers = {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (event.button !== 0 || (event.target as Element).closest('button, a')) return;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      view.current.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const current = drag.current;
      if (!current || current.id !== event.pointerId) return;
      const k = 4 / event.currentTarget.clientWidth;
      const dx = (event.clientX - current.x) * k, dy = (event.clientY - current.y) * k;
      const v = view.current;
      v.yaw += dx; v.pitch = clamp(v.pitch + dy, limits.min, limits.max); v.vx = dx; v.vy = dy;
      current.x = event.clientX; current.y = event.clientY;
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      if (drag.current?.id !== event.pointerId) return;
      drag.current = null; view.current.dragging = false;
    },
  };
  // Call once per frame. Applies release inertia, then either a gentle auto-rotation or, when the
  // visitor is not steering, eases toward a goal orientation. Returns the orientation to draw with.
  const step = (autoYaw = 0, goal?: { yaw: number; pitch: number; dt: number; rate: number }) => {
    const v = view.current;
    if (!v.dragging) {
      v.yaw += v.vx + autoYaw; v.pitch = clamp(v.pitch + v.vy, limits.min, limits.max);
      v.vx *= .92; v.vy *= .92;
      if (goal && Math.abs(v.vx) < .002) {
        v.yaw = approach(v.yaw, v.yaw + wrap(goal.yaw - v.yaw + Math.PI, Math.PI * 2) - Math.PI, goal.dt, goal.rate);
        v.pitch = approach(v.pitch, goal.pitch, goal.dt, goal.rate);
      }
    }
    return { yaw: v.yaw, pitch: v.pitch };
  };
  return { step, handlers: { ...handlers, onPointerCancel: handlers.onPointerUp } };
}

export type V3 = { x: number; y: number; z: number };

// Yaw about the vertical axis, then pitch about the horizontal one; +z points at the viewer.
export function rotate(p: V3, yaw: number, pitch: number): V3 {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x = p.x * cy + p.z * sy, z = -p.x * sy + p.z * cy;
  return { x, y: p.y * cp - z * sp, z: p.y * sp + z * cp };
}

// Perspective onto the stage. World +y is up, so it is flipped for the screen.
export function perspective(p: V3, focal: number, center: { x: number; y: number }, zoom = 1) {
  const scale = focal / (focal - p.z) * zoom;
  return { x: center.x + p.x * scale, y: center.y - p.y * scale, z: p.z, scale };
}

// Deterministic randomness so every visit draws the same figure.
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const gaussian = (random: () => number) => Math.sqrt(-2 * Math.log(random() || 1e-9)) * Math.cos(2 * Math.PI * random());

export function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${clamp(alpha)})`;
}

export function mix(a: string, b: string, t: number) {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
  const channel = (shift: number) => Math.round(((x >> shift) & 255) + (((y >> shift) & 255) - ((x >> shift) & 255)) * clamp(t));
  return `#${((channel(16) << 16) | (channel(8) << 8) | channel(0)).toString(16).padStart(6, '0')}`;
}

export function Status({ bootcamp }: { bootcamp: Bootcamp }) {
  return <span className={`bc-status ${bootcamp.participants ? '' : 'is-open'}`}><i aria-hidden="true" />{statusLabel(bootcamp)}</span>;
}

export function LearnMore({ bootcamp, tabIndex }: { bootcamp: Bootcamp; tabIndex?: number }) {
  return <a className="bc-learn" href={bootcamp.url} tabIndex={tabIndex} aria-label={`Learn more about the ${bootcamp.name}`}>Learn more <span aria-hidden="true">↗</span></a>;
}
