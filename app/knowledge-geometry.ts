import { researchTopics } from './research-data';
import { rotate, type Rotation, type Vec3 } from './globe-geometry';

// Edges come from the curated related-question references, not decorative random links.
const edgeKeys = new Set<string>();
export const KNOWLEDGE_EDGES: [number, number][] = [];
researchTopics.forEach((topic, a) => topic.related.forEach(id => {
  const b = researchTopics.findIndex(other => other.id === id);
  if (b < 0 || a === b) return;
  const edge: [number, number] = [Math.min(a, b), Math.max(a, b)];
  const key = edge.join('-');
  if (!edgeKeys.has(key)) { edgeKeys.add(key); KNOWLEDGE_EDGES.push(edge); }
}));

export const NODE_DEGREES = researchTopics.map((_, i) => KNOWLEDGE_EDGES.filter(([a,b]) => a === i || b === i).length);

function buildLayout(): Vec3[] {
  const count = researchTopics.length;
  const points = researchTopics.map((_, i) => {
    const y = 1 - 2 * (i + .5) / count;
    const radius = Math.sqrt(1 - y * y);
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    return { x: 230 * radius * Math.cos(angle), y: y * 230, z: 230 * radius * Math.sin(angle) };
  });
  // Deterministic 3D spring layout: related questions attract, all questions repel.
  for (let iteration = 0; iteration < 240; iteration++) {
    const forces = points.map(() => ({ x: 0, y: 0, z: 0 }));
    for (let a = 0; a < count; a++) for (let b = a + 1; b < count; b++) {
      const dx = points[a].x - points[b].x, dy = points[a].y - points[b].y, dz = points[a].z - points[b].z;
      const distance = Math.max(10, Math.hypot(dx, dy, dz));
      const force = 4200 / (distance * distance);
      forces[a].x += dx / distance * force; forces[b].x -= dx / distance * force;
      forces[a].y += dy / distance * force; forces[b].y -= dy / distance * force;
      forces[a].z += dz / distance * force; forces[b].z -= dz / distance * force;
    }
    for (const [a, b] of KNOWLEDGE_EDGES) {
      const dx = points[b].x - points[a].x, dy = points[b].y - points[a].y, dz = points[b].z - points[a].z;
      const distance = Math.max(1, Math.hypot(dx, dy, dz));
      const force = (distance - 112) * .012;
      forces[a].x += dx / distance * force; forces[b].x -= dx / distance * force;
      forces[a].y += dy / distance * force; forces[b].y -= dy / distance * force;
      forces[a].z += dz / distance * force; forces[b].z -= dz / distance * force;
    }
    const cooling = .8 * (1 - iteration / 300);
    points.forEach((point, i) => {
      point.x += (forces[i].x - point.x * .001) * cooling;
      point.y += (forces[i].y - point.y * .001) * cooling;
      point.z += (forces[i].z - point.z * .001) * cooling;
    });
  }
  const center = points.reduce((sum, point) => ({ x: sum.x + point.x / count, y: sum.y + point.y / count, z: sum.z + point.z / count }), { x: 0, y: 0, z: 0 });
  // Fit each axis to an explorable volume; this avoids a tall, narrow overview.
  const extent = {
    x: Math.max(...points.map(p => Math.abs(p.x-center.x))),
    y: Math.max(...points.map(p => Math.abs(p.y-center.y))),
    z: Math.max(...points.map(p => Math.abs(p.z-center.z))),
  };
  return points.map(p => ({ x: (p.x-center.x) / extent.x * 220, y: (p.y-center.y) / extent.y * 220, z: (p.z-center.z) / extent.z * 200 }));
}
export const KNOWLEDGE_POSITIONS = buildLayout();
export const KNOWLEDGE_STAGE = { width: 760, height: 650, cx: 380, cy: 300 };
export type GraphCamera = { zoom: number; panX: number; panY: number; center: Vec3 };
export const INITIAL_GRAPH_ROTATION: Rotation = { yaw: -.28, pitch: .18, roll: -.04 };
export const INITIAL_GRAPH_CAMERA: GraphCamera = { zoom: 1, panX: 0, panY: 0, center: { x: 0, y: 0, z: 0 } };
export const clampZoom = (value: number) => Math.max(.65, Math.min(4, value));
export function projectKnowledge(point: Vec3, rotation: Rotation, camera: GraphCamera) {
  const position = rotate({ x: point.x-camera.center.x, y: point.y-camera.center.y, z: point.z-camera.center.z }, rotation);
  const perspective = 1150 / Math.max(450, 1150-position.z);
  return {
    x: KNOWLEDGE_STAGE.cx + position.x * perspective * camera.zoom + camera.panX,
    y: KNOWLEDGE_STAGE.cy + position.y * perspective * camera.zoom + camera.panY,
    z: position.z, scale: perspective,
  };
}
