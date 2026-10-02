'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import TopicGlyph from './topic-glyph';
import { INITIAL_LOGO_ROTATION, LOGO_ENVELOPES, LOGO_NODE_PETALS, LOGO_PETALS, LOGO_POSITIONS } from './logo-geometry';
import { researchTopics } from './research-data';
import { INITIAL_GRAPH_CAMERA, INITIAL_GRAPH_ROTATION, KNOWLEDGE_EDGES, KNOWLEDGE_POSITIONS, KNOWLEDGE_STAGE, NODE_DEGREES, clampZoom, projectKnowledge, type GraphCamera } from './knowledge-geometry';

const newCamera = (): GraphCamera => ({ ...INITIAL_GRAPH_CAMERA, center: { ...INITIAL_GRAPH_CAMERA.center } });
const colors = ['#3155d8', '#5575c9', '#417c91', '#7866bc'];
type Pointer = { x: number; y: number };

export default function KnowledgeGraph({ variant = 'graph' }: { variant?: 'graph' | 'logo' }) {
  const isLogo = variant === 'logo';
  const positions = isLogo ? LOGO_POSITIONS : KNOWLEDGE_POSITIONS;
  const initialRotation = isLogo ? INITIAL_LOGO_ROTATION : INITIAL_GRAPH_ROTATION;
  const nodeColor = (index: number) => isLogo ? LOGO_PETALS[LOGO_NODE_PETALS[index]].ink : colors[index%colors.length];
  const viewport = useRef<HTMLDivElement>(null);
  const camera = useRef(newCamera()), target = useRef(newCamera());
  const rotation = useRef({ ...initialRotation });
  const elapsed = useRef(0), visible = useRef(true), reduced = useRef(false);
  const velocity = useRef({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, Pointer>());
  const gesture = useRef<{ x: number; y: number; startX: number; startY: number; moved: boolean; node: number | null; pan: boolean } | null>(null);
  const pinch = useRef<{ distance: number; zoom: number; x: number; y: number; panX: number; panY: number } | null>(null);
  const skipClick = useRef(false);
  const [scene, setScene] = useState({ rotation: { ...initialRotation }, camera: newCamera(), phase: 0 });
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [inside, setInside] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const active = hovered ?? selected;
  const connected = new Set<number>();
  if (active !== null) {
    connected.add(active);
    KNOWLEDGE_EDGES.forEach(([a,b]) => { if (a === active) connected.add(b); if (b === active) connected.add(a); });
  }
  const points = positions.map(point => projectKnowledge(point, scene.rotation, scene.camera));

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reduced.current = media.matches; }; update();
    media.addEventListener('change', update);
    const observer = new IntersectionObserver(([entry]) => { visible.current = entry.isIntersecting; });
    const element = viewport.current;
    if (element) observer.observe(element);
    const wheel = (event: WheelEvent) => {
      if (!element) return;
      event.preventDefault();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 300 : 1);
      target.current.zoom = clampZoom(target.current.zoom * Math.exp(-delta * .0018));
    };
    element?.addEventListener('wheel', wheel, { passive: false });
    return () => { observer.disconnect(); media.removeEventListener('change', update); element?.removeEventListener('wheel', wheel); };
  }, []);

  useEffect(() => {
    let frame = 0, last = 0;
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (now - last < 30 || !visible.current || document.hidden) return;
      const dt = Math.min((now - (last || now)) / 1000, .05); last = now;
      if (!dragging && !inside && !keyboardFocus && selected === null && !reduced.current) {
        rotation.current.yaw += (isLogo ? .012 * Math.cos(elapsed.current * .18) : .055) * dt + velocity.current.x;
        rotation.current.pitch += velocity.current.y + (isLogo ? .006 * Math.cos(elapsed.current * .15) * dt : 0);
        velocity.current.x *= .9; velocity.current.y *= .9;
      }
      const easing = reduced.current ? 1 : 1 - Math.exp(-dt * 10);
      const current = camera.current, goal = target.current;
      current.zoom += (goal.zoom-current.zoom) * easing;
      current.panX += (goal.panX-current.panX) * easing;
      current.panY += (goal.panY-current.panY) * easing;
      current.center.x += (goal.center.x-current.center.x) * easing;
      current.center.y += (goal.center.y-current.center.y) * easing;
      current.center.z += (goal.center.z-current.center.z) * easing;
      if (!reduced.current) elapsed.current += dt;
      setScene({ rotation: { ...rotation.current }, camera: { ...current, center: { ...current.center } }, phase: elapsed.current });
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dragging, inside, keyboardFocus, selected, isLogo]);

  function focusNode(index: number) {
    setSelected(index); setHovered(null); velocity.current = { x: 0, y: 0 };
    target.current = { zoom: 2.1, panX: 0, panY: -70, center: { ...positions[index] } };
  }
  function reset() {
    if (isLogo) rotation.current = { ...INITIAL_LOGO_ROTATION };
    target.current = newCamera(); setSelected(null); setHovered(null);
    velocity.current = { x: 0, y: 0 };
  }
  function zoom(factor: number) { target.current.zoom = clampZoom(target.current.zoom * factor); }

  function start(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.button !== 2) return;
    skipClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const [a,b] = [...pointers.current.values()];
      pinch.current = { distance: Math.max(1, Math.hypot(a.x-b.x,a.y-b.y)), zoom: target.current.zoom, x: (a.x+b.x)/2, y: (a.y+b.y)/2, panX: target.current.panX, panY: target.current.panY };
      if (gesture.current) gesture.current.moved = true;
      setDragging(true); setHovered(null); return;
    }
    const node = (event.target as Element).closest<HTMLElement>('[data-knowledge-node]');
    gesture.current = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false, node: node ? Number(node.dataset.knowledgeNode) : null, pan: event.shiftKey || event.button === 2 };
    velocity.current = { x: 0, y: 0 };
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const bounds = event.currentTarget.getBoundingClientRect();
    if (pointers.current.size === 2 && pinch.current) {
      const [a,b] = [...pointers.current.values()], origin = pinch.current;
      target.current.zoom = clampZoom(origin.zoom * Math.hypot(a.x-b.x,a.y-b.y) / origin.distance);
      target.current.panX = origin.panX + ((a.x+b.x)/2-origin.x) * KNOWLEDGE_STAGE.width/bounds.width;
      target.current.panY = origin.panY + ((a.y+b.y)/2-origin.y) * KNOWLEDGE_STAGE.height/bounds.height;
      return;
    }
    const current = gesture.current;
    if (!current) return;
    if (!current.moved && Math.hypot(event.clientX-current.startX,event.clientY-current.startY) < 5) return;
    current.moved = true; setDragging(true); setHovered(null);
    const dx = event.clientX-current.x, dy = event.clientY-current.y;
    if (current.pan) {
      target.current.panX += dx * KNOWLEDGE_STAGE.width/bounds.width;
      target.current.panY += dy * KNOWLEDGE_STAGE.height/bounds.height;
    } else {
      rotation.current.yaw += dx * 4/bounds.width;
      rotation.current.pitch -= dy * 4/bounds.width;
      velocity.current = { x: dx*.0008, y: -dy*.0008 };
    }
    current.x = event.clientX; current.y = event.clientY;
  }
  function end(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (event.type === 'pointerup' && pointers.current.size === 1 && current && !current.moved && current.node !== null) focusNode(current.node);
    pointers.current.delete(event.pointerId);
    skipClick.current = true;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (pointers.current.size === 0) { gesture.current = null; pinch.current = null; setDragging(false); }
    else {
      const point = [...pointers.current.values()][0];
      gesture.current = { ...point, startX: point.x, startY: point.y, moved: true, node: null, pan: false }; pinch.current = null;
    }
  }

  const focusedTopic = selected !== null ? researchTopics[selected] : null;
  return <div className={`knowledge-graph ${isLogo ? 'logo-knowledge-graph' : ''} ${dragging ? 'is-dragging' : ''}`}>
    <div ref={viewport} className="knowledge-viewport" role="group" tabIndex={0}
      aria-label={`${isLogo ? "Vizuara six-petal logo shaped" : "3D"} knowledge graph of all 32 research questions. Drag to rotate; scroll or pinch to zoom; Shift-drag to pan. Select an icon to explore its question and connections. Arrow keys rotate, plus and minus zoom, and Home resets.`}
      onMouseEnter={() => setInside(true)} onMouseLeave={() => { setInside(false); setHovered(null); }}
      onFocusCapture={() => setKeyboardFocus(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setKeyboardFocus(false); }}
      onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      onLostPointerCapture={event => { if (pointers.current.has(event.pointerId)) end(event); }}
      onContextMenu={event => event.preventDefault()}
      onClickCapture={event => { if (skipClick.current) { event.preventDefault(); event.stopPropagation(); skipClick.current = false; } }}
      onKeyDown={event => {
        if (event.key === 'Escape') { reset(); return; }
        if (event.target !== event.currentTarget) return;
        if (['+', '=', '-', 'Home', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
        if (event.key === '+' || event.key === '=') zoom(1.25);
        if (event.key === '-') zoom(.8);
        if (event.key === 'Home') { rotation.current = { ...initialRotation }; reset(); }
        rotation.current.yaw += event.key === 'ArrowRight' ? .15 : event.key === 'ArrowLeft' ? -.15 : 0;
        rotation.current.pitch += event.key === 'ArrowUp' ? .15 : event.key === 'ArrowDown' ? -.15 : 0;
      }}>
      <svg className="knowledge-edges" viewBox={`0 0 ${KNOWLEDGE_STAGE.width} ${KNOWLEDGE_STAGE.height}`} aria-hidden="true">
        <defs><radialGradient id="knowledge-glow"><stop stopColor="#647fed" stopOpacity=".12" /><stop offset="1" stopColor="#647fed" stopOpacity="0" /></radialGradient></defs>
        <ellipse cx="380" cy="310" rx="310" ry="285" fill="url(#knowledge-glow)" />
        {isLogo && LOGO_ENVELOPES.map((envelope,index) => {
          const outline = envelope.map((point,i) => { const p = projectKnowledge(point,scene.rotation,scene.camera); return `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`; }).join(' ') + 'Z';
          return <path key={index} d={outline} fill={LOGO_PETALS[index].color} fillOpacity={active === null ? .07 : .035} stroke={LOGO_PETALS[index].color} strokeOpacity=".2" strokeWidth=".85" />;
        })}
        {KNOWLEDGE_EDGES.map(([a,b],index) => {
          const p = points[a], q = points[b], isActive = active === a || active === b;
          const tint = nodeColor(a);
          const withinPetal = !isLogo || LOGO_NODE_PETALS[a] === LOGO_NODE_PETALS[b];
          const progress = (scene.phase/6 + index*.17)%1;
          return <g key={`${a}-${b}`} opacity={active === null ? isLogo ? withinPetal ? .36 : .12 : .25 : isActive ? .82 : isLogo ? .055 : .075}>
            <path d={`M${p.x} ${p.y}L${q.x} ${q.y}`} stroke={isActive ? '#2545d5' : tint} strokeWidth={isActive ? 1.7 : .85} />
            {(isActive || active === null && index%5 === 0) && <circle cx={p.x+(q.x-p.x)*progress} cy={p.y+(q.y-p.y)*progress} r={isActive ? 2.6 : 1.6} fill={tint} />}
          </g>;
        })}
      </svg>
      <div className="knowledge-nodes">
        {researchTopics.map((topic,index) => {
          const point = points[index];
          const related = connected.has(index), chosen = selected === index, highlighted = active === index;
          const depth = Math.max(.62,Math.min(1.15,point.scale));
          const showLabel = highlighted || chosen || scene.camera.zoom > 1.6 && point.z > -50 || active === null && NODE_DEGREES[index] >= 6 && point.z > 30;
          const inFrame = point.x > -90 && point.x < KNOWLEDGE_STAGE.width+90 && point.y > -90 && point.y < KNOWLEDGE_STAGE.height+90;
          const size = chosen ? 90 : Math.min(68, 38 + (scene.camera.zoom-1)*14);
          return <div key={topic.id} className={`knowledge-node ${highlighted ? 'is-highlighted' : ''} ${chosen ? 'is-chosen' : ''} ${related ? 'is-related' : ''} ${showLabel ? 'show-label' : ''}`}
            style={{ left:`${point.x/KNOWLEDGE_STAGE.width*100}%`, top:`${point.y/KNOWLEDGE_STAGE.height*100}%`, '--node-scale':depth, '--node-size':`${size}px`, '--node-color':nodeColor(index), opacity: !inFrame ? 0 : active !== null && !related ? .3 : Math.max(.52,Math.min(1,.78+point.z/650)), zIndex: highlighted || chosen ? 95 : Math.round(40+point.z/15), pointerEvents: inFrame ? 'auto' : 'none' } as CSSProperties}
            onMouseEnter={() => { if (!dragging) setHovered(index); }} onMouseLeave={() => setHovered(null)}>
            <button type="button" className="knowledge-node-button" data-knowledge-node={index} aria-label={`Explore ${topic.lines.join(' ')}`} aria-pressed={chosen}
              onFocus={() => { if (pointers.current.size === 0) focusNode(index); }} onClick={() => focusNode(index)}>
              <TopicGlyph topic={topic.id} />
            </button>
            <span className="knowledge-node-label" aria-hidden="true">{topic.lines[0]}<br />{topic.lines[1]}</span>
          </div>;
        })}
      </div>
    </div>
    {focusedTopic && <aside className="knowledge-inspector" aria-label="Selected research question">
      <button className="knowledge-close" onClick={reset} aria-label="Close question and return to the whole graph">×</button>
      <h3>{focusedTopic.lines.join(' ')}</h3><p>{focusedTopic.question}</p>
      {focusedTopic.url && <a href={focusedTopic.url} target="_blank" rel="noopener noreferrer">Read the study <span aria-hidden="true">↗</span></a>}
    </aside>}
    <div className="knowledge-controls" role="group" aria-label="Knowledge graph camera controls">
      <button onClick={() => zoom(.8)} aria-label="Zoom out" disabled={scene.camera.zoom <= .66}>−</button>
      <button onClick={reset} className="knowledge-reset" aria-label="Fit all research questions in view" title="Fit graph"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5" /></svg></button>
      <button onClick={() => zoom(1.25)} aria-label="Zoom in" disabled={scene.camera.zoom >= 3.99}>+</button>
    </div>
  </div>;
}
