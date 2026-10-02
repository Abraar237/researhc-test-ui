'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { researchTopics, researchThreads } from './research-data';
import TopicGlyph from './topic-glyph';
import KnowledgeGraph from './knowledge-graph';
import { INITIAL_ROTATION, ORBITS, CORE_ORBITS, PLANAR_CORE_ORBITS, SPHERE_LINES, STAGE, TOPIC_ANCHORS, project, projectPath, sampleCurve, spokePoint, type Vec3 } from './globe-geometry';

export default function ResearchGraph() {
  const [mode, setMode] = useState<'3d' | '2d' | 'graph' | 'logo'>('logo');
  const flat = mode === '2d';
  const [threadIndex, setThreadIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [scene, setScene] = useState({ ...INITIAL_ROTATION, phase: 0 });
  const rotation = useRef({ ...INITIAL_ROTATION });
  const elapsed = useRef(0);
  const velocity = useRef({ x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number; startX: number; startY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const reduced = useRef(false);
  const visible = useRef(true);
  const stage = useRef<HTMLDivElement>(null);
  const held = focused || preview !== null || dragging;
  const coreRotation = flat ? { yaw: 0, pitch: 0, roll: scene.phase * .09 } : {
    yaw: scene.yaw + scene.phase * .075,
    pitch: scene.pitch + Math.sin(scene.phase * .12) * .08,
    roll: scene.roll + scene.phase * .045,
  };
  const coreOrbits = flat ? PLANAR_CORE_ORBITS : CORE_ORBITS;
  const layoutRotation = flat ? { yaw: 0, pitch: 0, roll: 0 } : scene;
  const projectForView = (point: Vec3) => project(flat ? { ...point, z: 0 } : point, layoutRotation);
  const pathForView = (points: Vec3[]) => projectPath(flat ? points.map(point => ({ ...point, z: 0 })) : points, layoutRotation);
  const thread = researchThreads[threadIndex];
  const topics = thread.ids.map(id => researchTopics.find(topic => topic.id === id)!);
  const activeId = selected && thread.ids.includes(selected) ? selected : topics[0].id;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reduced.current = media.matches; };
    update(); media.addEventListener('change', update);
    const observer = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting; });
    if (stage.current) observer.observe(stage.current);
    return () => { media.removeEventListener('change', update); observer.disconnect(); };
  }, []);

  useEffect(() => {
    if (mode === 'graph' || mode === 'logo') return;
    let frame = 0, last = 0;
    function animate(now: number) {
      frame = requestAnimationFrame(animate);
      if (now - last < 15 || document.hidden || !visible.current) return;
      const dt = Math.min((now - (last || now)) / 1000, .05); last = now;
      if (mode === '3d' && !drag.current?.moved && !held && !reduced.current) {
        rotation.current.roll += .016 * dt;
        rotation.current.yaw += velocity.current.x;
        rotation.current.pitch += velocity.current.y;
        velocity.current.x *= .92; velocity.current.y *= .92;
      }
      if (!reduced.current && !drag.current?.moved) elapsed.current += dt;
      const next = { ...rotation.current, phase: elapsed.current };
      setScene(previous => previous.yaw === next.yaw && previous.pitch === next.pitch && previous.roll === next.roll && previous.phase === next.phase ? previous : next);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [held, mode]);

  useEffect(() => {
    if (held || mode === 'graph' || mode === 'logo') return;
    const timer = window.setInterval(() => {
      if (!document.hidden && visible.current) { setThreadIndex(index => (index + 1) % researchThreads.length); setSelected(null); }
    }, 10000);
    return () => window.clearInterval(timer);
  }, [held, threadIndex, mode]);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (flat || event.button !== 0 || (event.target as Element).closest('a')) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false };
    suppressClick.current = false;
    velocity.current = { x: 0, y: 0 };
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.id !== event.pointerId) return;
    if (!current.moved && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 5) return;
    if (!current.moved) {
      current.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true); setPreview(null); setFocused(false); suppressClick.current = true;
      event.currentTarget.focus({ preventScroll: true });
    }
    const factor = 3.8 / event.currentTarget.getBoundingClientRect().width;
    const dx = (event.clientX - current.x) * factor, dy = (event.clientY - current.y) * factor;
    rotation.current.yaw += dx; rotation.current.pitch -= dy;
    velocity.current = { x: dx * .2, y: -dy * .2 };
    current.x = event.clientX; current.y = event.clientY;
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null; setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return <div ref={stage} className={`thread-explorer research-globe ${held ? 'tour-held' : ''} ${dragging ? 'is-rotating' : ''} ${flat ? 'is-planar' : 'is-spatial'}`}
    onMouseLeave={() => { if (!focused) setPreview(null); }}
    onFocusCapture={event => { if ((event.target as Element).closest('.focus-topic')) setFocused(true); }}
    onBlurCapture={event => { if (!(event.relatedTarget as Element | null)?.closest('.focus-topic')) { setFocused(false); setPreview(null); } }}>
    <div className="graph-view-switch" role="group" aria-label="Choose research visualization">
      {(['2d', '3d', 'graph', 'logo'] as const).map(view => <button key={view} aria-pressed={mode === view} onClick={() => { setMode(view); setPreview(null); setFocused(false); velocity.current = { x: 0, y: 0 }; }}>{view === 'graph' ? 'Graph' : view === 'logo' ? 'Logo' : view.toUpperCase()}</button>)}
    </div>
    {mode === 'graph' || mode === 'logo' ? <KnowledgeGraph key={mode} variant={mode} /> : <>
    <div className="globe-stage" tabIndex={0} role="group" aria-label={flat ? '2D research graph with four orbital lobes. Tab to explore five research questions.' : 'Interactive 3D research globe. Drag to rotate the globe and its topics. Use arrow keys to rotate, Home or double-click to reset, and Tab to explore five research questions.'}
      onDoubleClick={event => { if (!flat && !(event.target as Element).closest('.focus-topic')) { rotation.current = { ...INITIAL_ROTATION }; velocity.current = { x: 0, y: 0 }; } }}
      onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}
      onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
      onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}
      onKeyDown={event => {
        if (flat || event.target !== event.currentTarget) return;
        if (event.key === 'Home') { event.preventDefault(); rotation.current = { ...INITIAL_ROTATION }; velocity.current = { x: 0, y: 0 }; }
        if (event.key.startsWith('Arrow')) {
          event.preventDefault(); velocity.current = { x: 0, y: 0 };
          rotation.current.yaw += event.key === 'ArrowRight' ? .16 : event.key === 'ArrowLeft' ? -.16 : 0;
          rotation.current.pitch += event.key === 'ArrowUp' ? .16 : event.key === 'ArrowDown' ? -.16 : 0;
        }
      }}>
      <svg className="globe-scene" viewBox={`0 0 ${STAGE.width} ${STAGE.height}`} fill="none" aria-hidden="true">
        <defs>
          <radialGradient id="globe-aura"><stop stopColor="#6684ff" stopOpacity=".17" /><stop offset="1" stopColor="#6684ff" stopOpacity="0" /></radialGradient>
          <radialGradient id="globe-surface" cx="30%" cy="24%" r="78%"><stop stopColor="#fff" /><stop offset=".52" stopColor="#e7edff" /><stop offset=".84" stopColor="#bdccff" /><stop offset="1" stopColor="#99acef" /></radialGradient>
          <radialGradient id="globe-highlight" cx="30%" cy="22%"><stop stopColor="white" stopOpacity=".9" /><stop offset=".8" stopColor="white" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx={STAGE.cx} cy={STAGE.cy} r="194" fill="url(#globe-aura)" />
        {ORBITS.map((orbit, i) => <path key={i} d={pathForView(orbit)} stroke="#9cafd9" strokeWidth=".7" opacity={i === 0 ? .55 : .25} strokeDasharray={i === 0 ? '2 8' : undefined} />)}
        {topics.map((topic, index) => {
          const anchor = TOPIC_ANCHORS[index];
          const points = sampleCurve(t => spokePoint(anchor, t), 30);
          const active = topic.id === activeId;
          const signal = projectForView(spokePoint(anchor, (scene.phase / 5 + index * .19) % 1));
          return <g key={topic.id} className="globe-spoke"><path d={pathForView(points)} stroke={active ? '#3757e7' : '#b2bfde'} strokeWidth={active ? 1.7 : 1} opacity={active ? .9 : .6} /><circle cx={signal.x} cy={signal.y} r={active ? 3 : 2} fill={active ? '#2043eb' : '#9faed6'} />{[0, 1, 2].map(i => {
            const angle = i * 2.1 + index;
            const satellite = { x: anchor.x + 33 * Math.cos(angle), y: anchor.y + 27 * Math.sin(angle), z: anchor.z + 12 * Math.sin(angle) };
            const p = projectForView(satellite), a = projectForView(anchor);
            return <g key={i} opacity=".4"><path d={`M${a.x} ${a.y}L${p.x} ${p.y}`} stroke="#99aeda" strokeWidth=".8" /><circle cx={p.x} cy={p.y} r="2" fill="#8ba4dd" /></g>;
          })}</g>;
        })}
        <g className="orbital-core">{coreOrbits.map((orbit, index) => {
          const progress = (scene.phase * 7 + index * 32) % (orbit.length - 1);
          const start = orbit[Math.floor(progress)], end = orbit[Math.floor(progress) + 1];
          const fraction = progress % 1;
          const electron = project({ x: start.x + (end.x - start.x) * fraction, y: start.y + (end.y - start.y) * fraction, z: start.z + (end.z - start.z) * fraction }, coreRotation);
          return <g key={index}><path data-orbit={index + 1} d={projectPath(orbit, coreRotation)} fill="none" stroke="#718aef" strokeOpacity=".66" strokeWidth=".85" /><circle cx={electron.x} cy={electron.y} r="2.2" fill="#4668ef" fillOpacity=".75" /></g>;
        })}</g>
        <circle cx={STAGE.cx} cy={STAGE.cy} r="61" fill={flat ? '#e5ebff' : 'url(#globe-surface)'} stroke="#9cb0f0" strokeWidth=".8" />
        {flat ? <g transform={`translate(${STAGE.cx} ${STAGE.cy})`} stroke="#7189df" strokeWidth=".55" opacity=".45"><ellipse rx="24" ry="61" /><ellipse rx="46" ry="61" /><ellipse rx="61" ry="24" /><ellipse rx="61" ry="46" /><path d="M-61 0H61M0 -61V61" /></g> : SPHERE_LINES.map((line, i) => <path key={i} d={projectPath(line, coreRotation)} stroke="#627fd4" strokeWidth=".5" opacity=".3" />)}
        <circle cx={STAGE.cx} cy={STAGE.cy} r="61" fill="url(#globe-highlight)" />
        <circle cx={STAGE.cx} cy={STAGE.cy} r="43" fill="#eef3ff" fillOpacity=".85" />
        <text x={STAGE.cx} y={STAGE.cy - 2} className="focus-core-name" textAnchor="middle">Vizuara</text><text x={STAGE.cx} y={STAGE.cy + 16} className="focus-core-label" textAnchor="middle">RESEARCH</text>
      </svg>
      <div className="globe-topics">
        {topics.map((topic, index) => {
          const point = projectForView(TOPIC_ANCHORS[index]);
          const active = activeId === topic.id;
          const depth = flat ? 1 : Math.max(.64, Math.min(1, .82 + point.z / 650));
          const nearCenter = Math.hypot(point.x - STAGE.cx, point.y - STAGE.cy) < 100 && point.z < 0;
          return <div key={topic.id} className={`focus-topic ${active ? 'is-selected' : ''} ${preview === topic.id ? 'is-previewed' : ''}`}
            style={{ left: `${point.x / STAGE.width * 100}%`, top: `${point.y / STAGE.height * 100}%`, '--depth-scale': Math.max(.72, Math.min(1.08, point.scale)), '--depth-opacity': nearCenter ? .38 : depth, '--popover-shift': point.x < 220 ? '26px' : point.x > 540 ? '-26px' : '0px', zIndex: preview === topic.id ? 100 : Math.round(40 + point.z / 10) } as CSSProperties}
            onMouseEnter={() => { if (!drag.current?.moved) { setSelected(topic.id); setPreview(topic.id); } }} onMouseLeave={() => { if (!focused) setPreview(null); }}>
            <button className="topic-button" aria-expanded={preview === topic.id} aria-describedby={preview === topic.id ? `preview-${topic.id}` : undefined}
              onFocus={() => { if (!drag.current) { setSelected(topic.id); setPreview(topic.id); } }}
              onClick={() => { if (!suppressClick.current) { setSelected(topic.id); setPreview(topic.id); } }}
              onKeyDown={event => { if (event.key === 'Escape') setPreview(null); }}>
              <span className="topic-marker"><TopicGlyph topic={topic.id} /></span><span className="topic-label">{topic.lines[0]}<br />{topic.lines[1]}</span>
            </button>
            {preview === topic.id && !dragging && <div className={`topic-preview ${point.y > STAGE.cy ? 'above' : ''}`} id={`preview-${topic.id}`}><p>{topic.question}</p>{topic.url && <a href={topic.url} target="_blank" rel="noopener noreferrer">Read the study <span aria-hidden="true">↗</span></a>}</div>}
          </div>;
        })}
      </div>
    </div>
    </>}
  </div>;
}
