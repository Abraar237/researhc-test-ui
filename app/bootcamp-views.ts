// The figures the Atlas hero can show. Their names and captions live in the navbar menu, not over the scene.
export const VIEWS = [
  { id: 'landscape', label: 'Landscape', caption: 'A loss landscape with ten minima. Gradient descent settles into each program in turn.' },
  { id: 'interference', label: 'Interference', caption: 'Two coherent sources on a surface. Each program sits on a crest of the interference pattern.' },
  { id: 'membrane', label: 'Membrane', caption: 'A vibrating circular membrane. Each program is one normal mode, J_m(j_mn r)·cos(mθ).' },
  { id: 'spectra', label: 'Spectra', caption: 'A waterfall of spectra, one ridge per program, drifting like a live signal.' },
  { id: 'swell', label: 'Swell', caption: 'A Gerstner ocean surface sampled as points, with a buoy for every program.' },
  { id: 'helix', label: 'Helix', caption: 'Our programs as the rungs of a slowly turning double helix.' },
  { id: 'attractor', label: 'Attractor', caption: 'A Lorenz trajectory, chaotic but never random, passing through every program.' },
] as const;

export type ViewId = (typeof VIEWS)[number]['id'];
