import { memo, type CSSProperties, type ReactNode } from 'react';

// Conceptual diagrams: shapes and motion explain the experiment, not measured results.
function Flow({ path, delay = 0 }: { path: string; delay?: number }) {
  return <circle r="2" className="mini-packet" style={{ offsetPath: `path('${path}')`, animationDelay: `${delay}s` } as CSSProperties} />;
}
function Label({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return <text x={x} y={y} className="mini-label" textAnchor="middle">{children}</text>;
}
function Chart() { return <path d="M10 8v45h61M10 38h60M10 23h60" className="mini-grid" />; }
function Document({ x, y, width = 20, height = 30 }: { x: number; y: number; width?: number; height?: number }) {
  return <g><rect x={x} y={y} width={width} height={height} rx="3" /><path d={`M${x+4} ${y+7}h${width-8}m-${width-8} 6h${width-11}m-${width-11} 6h${width-8}`} className="mini-muted" /></g>;
}

function TopicGlyph({ topic }: { topic: string }) {
  let diagram: ReactNode;
  switch (topic) {
    case 'script-bias':
      diagram = <><path d="M40 8v46" className="mini-grid" /><text x="15" y="25" className="mini-script">अ</text><text x="52" y="25" className="mini-script">A</text><Label x={20} y={36}>HINDI</Label><Label x={59} y={36}>LATIN</Label><rect x="8" y="42" width="25" height="5" rx="2" className="mini-meter" /><rect x="47" y="42" width="18" height="5" rx="2" className="mini-meter alternate" /><path d="M8 52h25M47 52h25" className="mini-muted" /></>; break;
    case 'judge-order':
      diagram = <><g className="mini-swap-a"><rect x="9" y="9" width="22" height="18" rx="3" /><Label x={20} y={21}>A</Label></g><g className="mini-swap-b"><rect x="9" y="35" width="22" height="18" rx="3" /><Label x={20} y={47}>B</Label></g><path d="M34 18h12l11 13-11 13H34" className="mini-muted" /><circle cx="61" cy="31" r="12" /><path d="m55 31 4 4 8-9" className="mini-reveal" /><Flow path="M34 18L46 18L55 29" /><Flow path="M34 44L46 44L55 33" delay={-1.5} /></>; break;
    case 'reward-hacking':
      diagram = <><path d="M7 49V18h29v31h37M18 18V8h39v27h16" className="mini-muted" /><circle cx="67" cy="13" r="9" /><circle cx="67" cy="13" r="4" /><path d="M7 49h17V34h24v15h25" className="mini-route" /><Flow path="M7 49L24 49L24 34L48 34L48 49L73 49" /><Label x={42} y={60}>REWARD ≠ GOAL</Label></>; break;
    case 'sparse-rewards':
      diagram = <><Label x={16} y={10}>SPARSE</Label><Label x={16} y={39}>STEP</Label><path d="M9 21h61M9 50h61" className="mini-muted" />{[10,25,40,55,70].map((x,i)=><g key={x}><circle cx={x} cy="21" r="3" className={i===4?'mini-fill':''} /><circle cx={x} cy="50" r="3" /><path d={`m${x-3} 41 2 2 4-5`} className="mini-reveal" style={{animationDelay:`${i*.2}s`}} /></g>)}<Flow path="M10 21H70" /><Flow path="M10 50H70" delay={-.4} /></>; break;
    case 'reward-transfer':
      diagram = <><rect x="5" y="20" width="24" height="23" rx="4" /><Label x={17} y={30}>R(x)</Label><path d="m11 35 3 3 7-7" /><path d="M29 31h13l13-17m-13 17 13 17" className="mini-muted" /><circle cx="64" cy="13" r="9" /><rect x="55" y="41" width="18" height="17" rx="3" /><Label x={64} y={16}>A</Label><Label x={64} y={53}>B</Label><Flow path="M29 31H42L55 14" /><Flow path="M29 31H42L55 48" delay={-1.4} /></>; break;
    case 'driving-policy':
      diagram = <><path d="M12 61c-2-21 8-28 6-56M62 61c-4-21 13-31 7-56" className="mini-muted" /><path d="M39 60c-5-19 9-33 6-56" strokeDasharray="5 6" className="mini-road" /><path d="M27 54C21 38 47 31 52 11" className="mini-route" /><g className="mini-car"><rect x="22" y="41" width="10" height="15" rx="3" className="mini-surface" /><path d="M25 45h4M25 52h4" /></g><Flow path="M27 54C21 38 47 31 52 11" /><path d="m49 15 3-4 2 5" /></>; break;
    case 'voice-bias':
      diagram = <><path d="M8 8v46" className="mini-muted" />{[8,17,11,22,15,7,13].map((h,i)=><g key={i}><path d={`M${16+i*5} ${18-h/2}v${h}`} className="mini-wave" style={{animationDelay:`${i*-.17}s`}} /><path d={`M${16+i*5} ${44-h*.35}v${h*.7}`} className="mini-wave alternate" style={{animationDelay:`${i*-.23}s`}} /></g>)}<path d="M55 8v46" className="mini-grid" /><rect x="61" y="10" width="8" height="18" rx="2" className="mini-meter" /><rect x="61" y="39" width="8" height="12" rx="2" className="mini-meter alternate" /><Label x={39} y={61}>SAME WORDS · NEW VOICE</Label></>; break;
    case 'speech-noise':
      diagram = <><path d="M5 29h9l5-11 7 25 7-35 7 35 7-21 6 7h22" className="mini-route" /><path d="m7 9 7 3 5-7 8 9 6-4 6 5 9-7 8 4 10-4 7 6M7 47l8-3 7 6 6-4 5 4 8-8 9 8 7-6 8 3 7-1" className="mini-noise" /><rect x="56" y="22" width="17" height="17" rx="3" className="mini-surface" /><Label x={64} y={34}>?</Label></>; break;
    case 'schema-drift':
      diagram = <><rect x="4" y="10" width="27" height="39" rx="4" /><rect x="49" y="10" width="27" height="39" rx="4" /><Label x={17} y={21}>v1</Label><Label x={63} y={21}>v2</Label><path d="M8 26h19M53 26h19" className="mini-muted" /><Label x={17} y={37}>USD</Label><Label x={63} y={37}>EUR</Label><path d="M31 30h18" className="mini-route" /><Flow path="M31 30H49" /><g className="mini-warning"><circle cx="40" cy="49" r="7" className="mini-surface" /><Label x={40} y={52}>!</Label></g><path d="m57 43 3 3 7-7" className="mini-muted" /></>; break;
    case 'context-budget':
      diagram = <>{Array.from({length:9},(_,i)=><rect key={i} x={5+i%3*9} y={11+Math.floor(i/3)*12} width="6" height="7" rx="1.5" className={i>4?'mini-discard':'mini-token'} style={{animationDelay:`${i*-.24}s`}} />)}<path d="m33 13 11 12v12l-5 5V25Z" className="mini-surface" /><path d="M44 30h8" /><rect x="53" y="10" width="23" height="43" rx="4" /><Label x={64} y={19}>k = 4</Label>{[0,1,2,3].map(i=><rect key={i} x="58" y={24+i*6} width="13" height="3" rx="1" className="mini-token" style={{animationDelay:`${i*-.35}s`}} />)}<Flow path="M29 16L40 28L53 28" /></>; break;
    case 'occlusion':
      diagram = <><path d="M5 49h70" className="mini-muted" /><g className="mini-pedestrian"><circle cx="48" cy="15" r="4" /><path d="M48 19v16m-9-10 9-4 8 5M48 35l-7 13m7-13 7 13" /></g><rect x="8" y="24" width="40" height="24" rx="4" className="mini-surface" /><path d="M13 30h11v8H13Zm15 0h11v8H28Z" className="mini-muted" /><circle cx="17" cy="49" r="4" className="mini-surface" /><circle cx="39" cy="49" r="4" className="mini-surface" /><path d="M66 9v42m-4-42h8m-8 42h8" className="mini-scan-side" /></>; break;
    case 'action-latency':
      diagram = <><rect x="4" y="13" width="21" height="20" rx="3" /><circle cx="14" cy="23" r="5" /><path d="M25 23h12" className="mini-muted" /><rect x="38" y="16" width="15" height="14" rx="3" /><path d="M53 23h14v16" /><Flow path="M25 23H67V39" /><circle cx="61" cy="47" r="11" className="mini-surface" /><g className="mini-clock"><path d="M61 40v7l5 3" /></g><Label x={24} y={52}>VISION → ACT</Label></>; break;
    case 'ocr-injection':
      diagram = <><Document x={5} y={7} width={25} height={41} /><rect x="9" y="32" width="17" height="9" rx="2" className="mini-token" /><Label x={17} y={39}>{'</>'}</Label><path d="M2 17h31" className="mini-scanner" /><path d="M38 5v47" strokeDasharray="2 4" className="mini-muted" /><path d="M30 36h20" className="mini-route" /><Flow path="M20 36H55" /><rect x="51" y="19" width="24" height="26" rx="4" /><Label x={63} y={30}>LLM</Label><path d="M57 35h12M57 39h8" className="mini-reveal" /><Label x={19} y={58}>OCR</Label><Label x={62} y={58}>CONTEXT</Label></>; break;
    case 'retrieval-noise':
      diagram = <><Document x={5} y={5} width={22} height={27} /><Document x={53} y={5} width={22} height={27} /><Label x={16} y={28}>YES</Label><Label x={64} y={28}>NO</Label><path d="M16 34 35 45m29-11L45 45" className="mini-muted" /><Flow path="M16 34L35 45" /><Flow path="M64 34L45 45" delay={-1.4} /><path d="m40 36 12 11-12 11-12-11Z" className="mini-surface" /><Label x={40} y={50}>?</Label></>; break;
    case 'agent-memory':
      diagram = <><rect x="8" y="7" width="43" height="12" rx="3" className="mini-forget" /><rect x="8" y="26" width="43" height="12" rx="3" /><rect x="8" y="45" width="43" height="12" rx="3" /><path d="M14 13h24M14 32h30M14 51h22" className="mini-muted" /><path d="M57 13h11v38H57" className="mini-route" /><Flow path="M57 51H68V32H53" /><path d="m61 9 8 8m0-8-8 8" className="mini-forget" /></>; break;
    case 'tool-recovery':
      diagram = <><rect x="5" y="17" width="22" height="26" rx="4" /><Label x={16} y={29}>API</Label><path d="m11 35 3 3 7-7" /><path d="M27 30h12" /><rect x="40" y="17" width="34" height="26" rx="4" /><Label x={57} y={27}>VERIFY</Label><path d="M47 34h11m5-3 4 4m0-4-4 4" className="mini-warning" /><path d="M57 43v12H16V44" className="mini-route" /><Flow path="M57 43V55H16V44" /></>; break;
    case 'fluid-flow':
      diagram = <><path d="M4 9h72M4 53h72" className="mini-grid" />{[0,1,2,3].map(i=>{const d=`M4 ${16+i*10}C25 ${9+i*10} 34 ${28+i*7} 76 ${15+i*10}`;return <g key={i}><path d={d} className="mini-muted" /><Flow path={d} delay={i*-.6} /></g>;})}{[[20,20],[44,34],[65,45]].map(([x,y])=><g key={x}><circle cx={x} cy={y} r="4" className="mini-surface" /><circle cx={x} cy={y} r="1.5" className="mini-fill" /></g>)}</>; break;
    case 'inverse-physics':
      diagram = <><path d="M5 35h28M7 35V9" className="mini-grid" />{[[11,29],[16,23],[22,18],[28,12]].map(([x,y])=><circle key={x} cx={x} cy={y} r="2" className="mini-fill" />)}<path d="M9 30q12-6 21-21" className="mini-fit" /><path d="M34 23h14m-4-4 4 4-4 4" /><rect x="51" y="9" width="25" height="29" rx="4" /><text x="59" y="29" className="mini-script">θ</text><Label x={40} y={54}>uₜ = θ · uₓₓ</Label></>; break;
    case 'calibration':
      diagram = <><Chart /><path d="M10 53 69 10" className="mini-muted" strokeDasharray="3 4" /><path d="M11 49C35 50 35 10 68 15" className="mini-fit" />{[[21,45],[36,34],[49,20],[65,15]].map(([x,y],i)=><circle key={x} cx={x} cy={y} r="3" className="mini-surface mini-reveal" style={{animationDelay:`${i*-.3}s`}} />)}</>; break;
    case 'few-shot':
      diagram = <>{[[9,14],[24,14],[9,30],[24,30],[16,46]].map(([x,y],i)=><g key={i}><rect x={x-4} y={y-5} width="8" height="10" rx="2" /><circle cx={x} cy={y} r="1" className="mini-fill" /></g>)}<path d="M33 30h15" /><Flow path="M33 30H48" /><rect x="49" y="17" width="24" height="26" rx="4" /><path d="M54 35l6-13 7 13M54 35h13" className="mini-reveal" /><Label x={60} y={54}>5 → ADAPT</Label></>; break;
    case 'pinn-boundaries':
      diagram = <><Chart /><path d="M59 8v45M64 8v45M69 8v45" className="mini-muted" /><path d="M11 48c36 0 43-1 46-38" className="mini-fit" /><path d="M11 46c30 0 37-12 43-31" className="mini-muted" strokeDasharray="2 3" />{[13,21,31].map((y,i)=><circle key={y} cx={58-i} cy={y} r="2" className="mini-reveal mini-fill" style={{animationDelay:`${i*-.4}s`}} />)}</>; break;
    case 'neural-ode':
      diagram = <><Label x={23} y={14}>dy/dt = f(y)</Label><path d="M5 41c12-29 23 23 37-2s23-5 32-9" className="mini-muted" strokeDasharray="2 3" /><path d="M5 42c12-16 23 11 37-5s23 3 32-7" className="mini-fit" /><text x="54" y="17" className="mini-math">+ fθ</text><Flow path="M5 42C17 26 28 53 42 37S65 40 74 30" /></>; break;
    case 'gpu-bottlenecks':
      diagram = <>{Array.from({length:8},(_,i)=>{const x=7+i%4*18,y=8+Math.floor(i/4)*33;return <g key={i}><rect x={x} y={y} width="12" height="14" rx="2" /><rect x={x+3} y={y+4} width="6" height="6" className="mini-token" style={{animationDelay:`${i*-.3}s`}} /><path d={`M${x+6} ${y===8?22:41}V31`} className="mini-muted" /></g>;})}<path d="M13 31h54" className="mini-route" /><Flow path="M13 31H67" /><Flow path="M13 31H67" delay={-.9} /><path d="M39 27v8M43 27v8" /></>; break;
    case 'parallelism':
      diagram = <>{[0,1,2].map(i=><g key={i} transform={`translate(0 ${i*14})`}><path d="m9 15 27-12 33 12-27 12Z" className="mini-surface" /><path d="m18 11 32 13M27 7l32 13M20 20 27-12M31 24 27-12" className="mini-muted" /></g>)}<Flow path="M9 15L42 27L69 15L69 43L42 55L9 43Z" /><Label x={71} y={8}>5D</Label></>; break;
    case 'model-size':
      diagram = <><path d="m8 17 17 14-17 14M8 17v28M44 10l24 21-24 21V10m0 21h24" className="mini-muted" />{[[8,17],[8,45],[25,31],[44,10],[44,31],[44,52],[68,31]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4" className="mini-surface" />)}<Flow path="M8 17L25 31L8 45" /><Flow path="M44 10L68 31L44 52L44 31L68 31" delay={-.6} /></>; break;
    case 'data-balance':
      diagram = <><Chart />{[34,21,10,5].map((h,i)=><rect key={i} x={18+i*13} y={52-h} width="8" height={h} rx="2" className="mini-bar" style={{animationDelay:`${i*-.4}s`}} />)}<path d="M12 27h56" strokeDasharray="3 4" className="mini-muted" /></>; break;
    case 'heat-transfer':
      diagram = <><rect x="7" y="6" width="65" height="52" rx="4" className="mini-grid" />{[9,17,25].map((r,i)=><ellipse key={r} cx="37" cy="31" rx={r*1.2} ry={r*.85} className="mini-heat" style={{animationDelay:`${i*-.8}s`}} />)}<circle cx="37" cy="31" r="3" className="mini-fill" /><path d="M52 14h8m-4-4v8" className="mini-muted" /></>; break;
    case 'precision':
      diagram = <><Label x={20} y={14}>FP16</Label><Label x={61} y={14}>FP8</Label>{Array.from({length:16},(_,i)=><rect key={i} x={6+i%4*7} y={21+Math.floor(i/4)*7} width="4" height="4" rx="1" className="mini-token" style={{animationDelay:`${i*-.14}s`}} />)}{Array.from({length:8},(_,i)=><rect key={i} x={51+i%4*6} y={28+Math.floor(i/4)*8} width="4" height="4" rx="1" />)}<path d="M36 33h10m-3-3 3 3-3 3" /><Flow path="M35 33H47" /></>; break;
    case 'checkpointing':
      diagram = <><path d="M7 29h66" className="mini-muted" />{[10,25,40,55,70].map((x,i)=><g key={x}><rect x={x-4} y="25" width="8" height="8" rx="2" className={i%2===0?'mini-token':'mini-surface'} />{i%2===0&&<path d={`M${x} 35v12h7`} className="mini-muted" />}</g>)}<path d="M70 21V10H40v11" className="mini-route" /><Flow path="M70 21V10H40V21" /><Label x={39} y={59}>SAVE ↔ RECOMPUTE</Label></>; break;
    case 'handwriting':
      diagram = <><path d="M5 12c10-6 0 27 9 21s7-24 11-15-11 27-3 21 7-18 13-13" className="mini-ink" /><path d="M5 45h29" className="mini-muted" /><path d="M39 12v39" strokeDasharray="2 3" className="mini-scanner-x" /><path d="M43 30h10" /><rect x="56" y="14" width="19" height="34" rx="3" /><Label x={66} y={29}>abc</Label><Label x={66} y={41}>?</Label></>; break;
    case 'shortcut-learning':
      diagram = <><rect x="6" y="8" width="68" height="47" rx="4" /><path d="m7 43 16-15 14 14 18-18 18 19" className="mini-background" /><rect x="29" y="17" width="23" height="29" rx="8" className="mini-surface" /><rect x="24" y="12" width="33" height="39" rx="3" strokeDasharray="3 3" className="mini-attention" /><circle cx="40" cy="29" r="5" className="mini-muted" /></>; break;
    case 'synthetic-data':
      diagram = <><Chart /><path d="M12 49C25 47 30 19 44 17s16 13 25 21" className="mini-fit" /><Flow path="M12 49C25 47 30 19 44 17S60 30 69 38" /><path d="M44 10v43" className="mini-muted" strokeDasharray="2 4" /><circle cx="44" cy="17" r="3" className="mini-surface" /><Label x={55} y={61}>REAL + SYNTH</Label></>; break;
    default:
      diagram = null;
  }
  return <svg className={`topic-glyph diagram-${topic}`} viewBox="0 0 80 64" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{diagram}</svg>;
}
export default memo(TopicGlyph);
