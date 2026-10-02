import { researchTopics } from './research-data';
import type { Rotation, Vec3 } from './globe-geometry';

// Clockwise from the top, matching the supplied Vizuara mark's six petals.
export const LOGO_PETALS = [
  { color: '#e500ec', ink: '#a22db9', ids: ['script-bias', 'judge-order', 'voice-bias', 'speech-noise', 'handwriting'] },
  { color: '#25a9d9', ink: '#167b9e', ids: ['schema-drift', 'context-budget', 'ocr-injection', 'retrieval-noise', 'agent-memory', 'tool-recovery'] },
  { color: '#ffb238', ink: '#a97420', ids: ['reward-hacking', 'sparse-rewards', 'reward-transfer', 'driving-policy', 'occlusion', 'action-latency'] },
  { color: '#e500ec', ink: '#a22db9', ids: ['fluid-flow', 'inverse-physics', 'pinn-boundaries', 'neural-ode', 'heat-transfer'] },
  { color: '#25a9d9', ink: '#167b9e', ids: ['gpu-bottlenecks', 'parallelism', 'precision', 'checkpointing', 'model-size'] },
  { color: '#ffb238', ink: '#a97420', ids: ['few-shot', 'calibration', 'data-balance', 'shortcut-learning', 'synthetic-data'] },
];
export const INITIAL_LOGO_ROTATION: Rotation = { yaw: 0, pitch: 0, roll: 0 };

function inPetal(radial: number, lateral: number, depth: number, petal: number): Vec3 {
  const angle = -Math.PI / 2 + petal * Math.PI / 3;
  return { x: radial * Math.cos(angle) - lateral * Math.sin(angle), y: radial * Math.sin(angle) + lateral * Math.cos(angle), z: depth };
}

export const LOGO_NODE_PETALS = researchTopics.map(topic => LOGO_PETALS.findIndex(petal => petal.ids.includes(topic.id)));
export const LOGO_POSITIONS = researchTopics.map((topic, index) => {
  const petal = LOGO_NODE_PETALS[index];
  const order = LOGO_PETALS[petal].ids.indexOf(topic.id);
  const slots = LOGO_PETALS[petal].ids.length === 6
    ? [[76,0], [133,-31], [133,31], [194,-37], [194,37], [238,0]]
    : [[83,0], [146,-31], [146,31], [216,-29], [216,29]];
  const [radial, lateral] = slots[order];
  return inPetal(radial, lateral, Math.sin(order * 1.8 + petal) * 14, petal);
});

function bezier(a: number[], b: number[], c: number[], d: number[], t: number) {
  const u = 1-t;
  return [u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0], u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1]];
}
// Subtle projected petal envelopes clarify the logo's silhouette without adding fake graph edges.
export const LOGO_ENVELOPES = LOGO_PETALS.map((_, index) => {
  const segments = [
    [[0,0],[65,-25],[129,-63],[187,-63]],
    [[187,-63],[275,-63],[275,63],[187,63]],
    [[187,63],[129,63],[65,25],[0,0]],
  ];
  return segments.flatMap(([a,b,c,d]) => Array.from({ length: 25 }, (_, i) => {
    const [r,l] = bezier(a,b,c,d,i/24);
    return inPetal(r,l,0,index);
  }));
});
