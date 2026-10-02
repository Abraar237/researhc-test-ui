export type Vec3 = { x: number; y: number; z: number };
export type Rotation = { yaw: number; pitch: number; roll: number };
export const STAGE = { width: 760, height: 630, cx: 380, cy: 282 };
export const INITIAL_ROTATION: Rotation = { yaw: .12, pitch: -.1, roll: 0 };

export function rotate(point: Vec3, rotation: Rotation): Vec3 {
  const cy = Math.cos(rotation.yaw), sy = Math.sin(rotation.yaw);
  const cp = Math.cos(rotation.pitch), sp = Math.sin(rotation.pitch);
  const x = point.x * cy + point.z * sy;
  const z = -point.x * sy + point.z * cy;
  const y = point.y * cp - z * sp;
  const cr = Math.cos(rotation.roll), sr = Math.sin(rotation.roll);
  return { x: x * cr - y * sr, y: x * sr + y * cr, z: point.y * sp + z * cp };
}

export function project(point: Vec3, rotation: Rotation) {
  const rotated = rotate(point, rotation);
  const scale = 1000 / (1000 - rotated.z);
  return { x: STAGE.cx + rotated.x * scale, y: STAGE.cy + rotated.y * scale, z: rotated.z, scale };
}

export function sampleCurve(fn: (t: number) => Vec3, count = 64): Vec3[] {
  return Array.from({ length: count + 1 }, (_, i) => fn(i / count));
}

export function projectPath(points: Vec3[], rotation: Rotation): string {
  return points.map((point, i) => { const p = project(point, rotation); return `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`; }).join(' ');
}

export const TOPIC_ANCHORS = Array.from({ length: 5 }, (_, i) => {
  const angle = -Math.PI / 2 + i * Math.PI * 2 / 5;
  return { x: 242 * Math.cos(angle), y: 210 * Math.sin(angle), z: [32, -36, 45, -28, 34][i] };
});

export function spokePoint(anchor: Vec3, t: number): Vec3 {
  return { x: anchor.x * t, y: anchor.y * t, z: anchor.z * t + Math.sin(t * Math.PI) * 24 };
}

// Three continuous orbital rings produce six symmetric lobes around the sphere.
export const CORE_ORBITS = Array.from({ length: 3 }, (_, i) => sampleCurve(t => {
  const phase = t * Math.PI * 2;
  const angle = i * Math.PI / 3;
  const x = 106 * Math.cos(phase);
  const y = 34 * Math.sin(phase);
  return {
    x: x * Math.cos(angle) - y * Math.sin(angle),
    y: x * Math.sin(angle) + y * Math.cos(angle),
    z: 19 * Math.sin(phase),
  };
}, 96));

// Original flat atomic motif: two intersecting ellipses, four outer lobes.
export const PLANAR_CORE_ORBITS = [-Math.PI / 5, Math.PI / 5].map(angle => sampleCurve(t => {
  const phase = t * Math.PI * 2;
  const x = 106 * Math.cos(phase), y = 35 * Math.sin(phase);
  return { x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle), z: 0 };
}, 96));

export const SPHERE_LINES = [
  ...Array.from({ length: 12 }, (_, i) => sampleCurve(t => {
    const latitude = -Math.PI / 2 + t * Math.PI;
    const longitude = i * Math.PI / 6;
    return { x: 61 * Math.cos(latitude) * Math.cos(longitude), y: 61 * Math.sin(latitude), z: 61 * Math.cos(latitude) * Math.sin(longitude) };
  }, 40)),
  ...Array.from({ length: 7 }, (_, i) => sampleCurve(t => {
    const latitude = (i - 3) * Math.PI / 9;
    return { x: 61 * Math.cos(latitude) * Math.cos(t * Math.PI * 2), y: 61 * Math.sin(latitude), z: 61 * Math.cos(latitude) * Math.sin(t * Math.PI * 2) };
  })),
];

export const ORBITS = [0, 1, 2].map(i => sampleCurve(t => {
  const angle = t * Math.PI * 2;
  const tilt = i * Math.PI / 3;
  return { x: 240 * Math.cos(angle), y: 196 * Math.sin(angle) * Math.cos(tilt), z: 130 * Math.sin(angle) * Math.sin(tilt) };
}, 96));
