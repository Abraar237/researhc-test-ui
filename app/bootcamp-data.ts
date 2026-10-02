export type Track = 'research' | 'engineering' | 'professional';

export type Bootcamp = {
  id: string;
  name: string;
  short: string;
  track: Track;
  level: string;
  duration: string;
  blurb: string;
  participants?: number;
  url: string;
};

const PROGRAMS = 'https://research.vizuara.ai/#programs';

export const TRACKS: Record<Track, { label: string; color: string; tint: string; soft: string }> = {
  research: { label: 'Research', color: '#2446e0', tint: '#e9eeff', soft: '#c9d4ff' },
  engineering: { label: 'Engineering', color: '#2f7688', tint: '#e5f2f3', soft: '#bfdde2' },
  professional: { label: 'Professional', color: '#6f59b8', tint: '#efebfb', soft: '#d6cdf3' },
};

export const bootcamps: Bootcamp[] = [
  { id: 'rl', name: 'Reinforcement Learning Research Bootcamp', short: 'Reinforcement Learning', track: 'research', level: 'Intermediate to Advanced', duration: '7 weeks + 3 months research', blurb: 'Comprehensive program to write high-quality research papers in Reinforcement Learning.', url: PROGRAMS },
  { id: 'sciml', name: 'Scientific Machine Learning Bootcamp', short: 'Scientific ML', track: 'research', level: 'Advanced', duration: '4 months', blurb: 'PINNs, scientific computing and publication guidance for real-world physics problems.', participants: 141, url: PROGRAMS },
  { id: 'mldl', name: 'ML/DL Research Bootcamp', short: 'ML / DL Research', track: 'research', level: 'Beginner to Intermediate', duration: '4 months', blurb: 'Deep learning architectures, research papers and industry applications.', participants: 31, url: PROGRAMS },
  { id: 'cv', name: 'Computer Vision Research Bootcamp', short: 'Computer Vision', track: 'research', level: 'Beginner to Intermediate', duration: '4-month intensive', blurb: 'Build foundations, work on impactful CV problems and publish at top-tier venues.', url: PROGRAMS },
  { id: 'vla', name: 'VLA Bootcamp', short: 'Vision-Language-Action', track: 'research', level: 'Intermediate', duration: '4 months', blurb: 'Master Vision-Language-Action models and build AI brains for autonomous driving.', url: PROGRAMS },
  { id: 'gpu', name: 'GPU Engineer’s Bootcamp: 5D Parallelism', short: 'GPU · 5D Parallelism', track: 'engineering', level: 'Beginner to Industrial-grade', duration: '4 months', blurb: 'Code GPT-2 from scratch and distribute training across 8 GPUs with 5D parallelism.', url: PROGRAMS },
  // TODO: confirm level, duration and copy for the two new engineering bootcamps.
  { id: 'kernel', name: 'Kernel Engineering Bootcamp', short: 'Kernel Engineering', track: 'engineering', level: 'Intermediate', duration: '4 months', blurb: 'Write fast GPU kernels in CUDA and Triton, and profile them against production baselines.', url: PROGRAMS },
  { id: 'slm', name: 'SLM Engineering Bootcamp', short: 'Small Language Models', track: 'engineering', level: 'Intermediate', duration: '4 months', blurb: 'Pretrain, fine-tune and ship small language models end to end.', url: PROGRAMS },
  { id: 'genai', name: 'Gen AI Professional Bootcamp', short: 'Gen AI Professional', track: 'professional', level: 'Professional', duration: '4 months', blurb: 'Advanced model architectures, research methodologies and novel algorithm development.', participants: 82, url: PROGRAMS },
  { id: 'context', name: 'AI Context Engineering Workshop', short: 'Context Engineering', track: 'professional', level: 'Professional', duration: '4 months', blurb: 'Master context engineering for LLMs and build production-grade AI agents.', url: PROGRAMS },
];

export const statusLabel = (bootcamp: Bootcamp) => bootcamp.participants ? `${bootcamp.participants}+ participants` : 'Open for applications';
