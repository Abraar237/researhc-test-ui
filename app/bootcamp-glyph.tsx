import { useId, type CSSProperties } from 'react';

// Each bootcamp is marked by a tiny live diagram of its subject rather than a pictogram:
// a learning curve drawing itself, a travelling wave, a forward pass, a sliding kernel, and so on.
// Motion is CSS-driven (see `.bm-*` in bootcamps.css) so reduced-motion settings switch it off.
export default function BootcampGlyph({ id, size = 22 }: { id: string; size?: number }) {
  const clip = `bm-clip-${useId().replace(/:/g, '')}`;
  return <svg className={`bm is-${id}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {id === 'rl' && <>
      {/* Reward curve: noisy early episodes, then it climbs and plateaus. */}
      <path d="M3 20h18M3 20V4" opacity=".3" strokeWidth="1" />
      <path className="bm-draw" pathLength={1} d="M4 18l2-1 1.5 1.5L9 15l1.5 1L12 11l1.5 1 1.5-4 2 .5L19 6l1.5.3" />
      <circle className="bm-rl-dot" cx="20.5" cy="6.3" r="1.6" fill="currentColor" stroke="none" />
    </>}
    {id === 'sciml' && <>
      {/* A wave propagating through a domain, sampled at collocation points. */}
      <clipPath id={clip}><rect x="2" y="3" width="20" height="18" rx="2" /></clipPath>
      <rect x="2" y="3" width="20" height="18" rx="2" opacity=".3" strokeWidth="1" />
      <g clipPath={`url(#${clip})`}><path className="bm-wave" d="M-8 12c2.5-6 5-6 7.5 0s5 6 7.5 0 5-6 7.5 0 5 6 7.5 0 5-6 7.5 0" /></g>
      {[6, 12, 18].map(x => <circle key={x} className="bm-probe" cx={x} cy="12" r="1" fill="currentColor" stroke="none" style={{ animationDelay: `${x * .05}s` }} />)}
    </>}
    {id === 'mldl' && <>
      {/* A forward pass: activation sweeps left to right, layer by layer. */}
      <path d="M5 8l7-3M5 8l7 7M5 16l7-3M5 16l7 7M12 5l7 7M12 13l7-1M12 19l7-7" opacity=".25" strokeWidth="1" />
      {[[5, 8, 0], [5, 16, 0], [12, 5, 1], [12, 12, 1], [12, 19, 1], [19, 12, 2]].map(([x, y, l]) => <circle key={`${x}${y}`} className="bm-neuron" cx={x} cy={y} r="2" style={{ animationDelay: `${l * .35}s` }} />)}
    </>}
    {id === 'cv' && <>
      {/* A 2×2 convolution kernel striding across a 4×4 image. */}
      {Array.from({ length: 16 }, (_, k) => <circle key={k} cx={4.5 + (k % 4) * 5} cy={4.5 + Math.floor(k / 4) * 5} r=".9" fill="currentColor" stroke="none" opacity=".4" />)}
      <rect className="bm-conv" x="2" y="2" width="10" height="10" rx="1.5" />
    </>}
    {id === 'vla' && <>
      {/* Driving view: lane lines converge to the horizon while the centre dashes stream past. */}
      <path d="M2 21L10.5 6M22 21L13.5 6M4 6h16" opacity=".35" strokeWidth="1" />
      <path className="bm-lane" d="M12 7v14" strokeDasharray="2 3" />
      <circle className="bm-horizon" cx="12" cy="6" r="1.4" fill="currentColor" stroke="none" />
    </>}
    {id === 'gpu' && <>
      {/* Five parallel lanes, each pipelining micro-batches out of phase. */}
      {[4, 8, 12, 16, 20].map((y, k) => <g key={y}>
        <path d={`M3 ${y}h18`} opacity=".2" strokeWidth="1" />
        <path className="bm-batch" d={`M3 ${y}h5`} strokeWidth="2.2" style={{ animationDelay: `${-k * .28}s` }} />
      </g>)}
    </>}
    {id === 'kernel' && <>
      {/* Tiled matmul: a hot tile walks the output grid in launch order. */}
      {Array.from({ length: 9 }, (_, k) => <rect key={k} className="bm-tile" x={3 + (k % 3) * 6.2} y={3 + Math.floor(k / 3) * 6.2} width="5.4" height="5.4" rx="1" style={{ animationDelay: `${k * .22}s` }} />)}
    </>}
    {id === 'slm' && <>
      {/* Next-token prediction: tokens are emitted one at a time, then the cursor waits. */}
      {[3, 9, 15].map((x, k) => <rect key={x} className="bm-token" x={x} y="9" width="5" height="6" rx="1.4" fill="currentColor" stroke="none" style={{ animationDelay: `${k * .45}s` }} />)}
      <path className="bm-cursor" d="M21.5 8v8" />
    </>}
    {id === 'genai' && <>
      {/* Diffusion: scattered noise denoises into a clean shape, then dissolves again. */}
      {Array.from({ length: 8 }, (_, k) => {
        const a = k / 8 * Math.PI * 2, x = 12 + Math.cos(a) * 6.5, y = 12 + Math.sin(a) * 6.5;
        const dx = Math.sin(k * 12.9898) * 7, dy = Math.cos(k * 78.233) * 7;
        return <circle key={k} className="bm-noise" cx={x} cy={y} r="1.3" fill="currentColor" stroke="none" style={{ '--dx': `${dx}px`, '--dy': `${dy}px` } as CSSProperties} />;
      })}
    </>}
    {id === 'context' && <>
      {/* A context window filling up line by line, then being compacted. */}
      <rect x="3" y="3" width="18" height="18" rx="2.5" opacity=".35" strokeWidth="1" />
      {[7, 10.5, 14, 17.5].map((y, k) => <path key={y} className="bm-line" d={`M6.5 ${y}h${k % 2 ? 8 : 11}`} style={{ animationDelay: `${k * .4}s` }} />)}
    </>}
  </svg>;
}
