# Vizuara research hero

A local Next.js App Router implementation of the Vizuara Research hero, with an interactive research atlas replacing the original statistics card.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3000.

```sh
npm run lint
npm run build
```

## Content and interaction

- 32 specific problem statements, arranged into nine automatically rotating groups of five. Related questions recur across groups.
- A perspective-projected 3D scene: dragging rotates the sphere, its three continuous orbital rings (six lobes), connection paths, and the topic positions together. Depth affects topic size and opacity; labels remain upright. The center spins continuously and smoothly, including while inspecting a topic.
- Mouse and touch dragging have a movement threshold to preserve taps; rotation has gentle inertia. Arrow keys rotate; Home or double-clicking the background resets the view.
- Topic groups advance every ten seconds and hold while inspecting a question or dragging. Animation pauses offscreen/in a hidden tab. Reduced-motion disables passive rotation, signal movement, and icon animation, while manual rotation remains available.
- Every topic has its own animated conceptual SVG diagram, such as token selection, schema mismatch, OCR extraction, waveform comparison, or eight-GPU communication. Diagrams illustrate mechanisms, not empirical results.
- Hover, focus, or tap a topic to read its research question. Four supplied studies include direct links. Other statements are illustrative content rather than verified ongoing projects.
- Four compact view buttons offer **2D**, **3D**, **Graph**, and **Logo**. Logo is the default preview; the other three views remain available.
- Graph shows all 32 animated topic icons simultaneously. Its 3D spring layout uses the curated related-question references to form real thematic edges, rather than decorative spokes around a central globe.
- **Logo** is a separate layout: all 32 animated research icons form six petals in the Vizuara mark’s magenta, cyan, and amber colors. It preserves the curated graph connections and adds gentle automatic rotation.
- In Graph and Logo, drag to rotate, scroll/pinch or use +/− to zoom, and Shift-drag/right-drag to pan. Clicking a topic smoothly centers and enlarges it, highlights connected questions, and opens its research prompt and supplied study link where available. The fit button returns to the whole network.
- Keyboard support: Tab focuses questions, arrows rotate, +/− zoom, Home resets, and Escape exits a focused question.
- No page heading, playback controls, topic pagination, venue strip, or closing tagline.

Edit `app/research-data.ts` for questions and threads. `app/globe-geometry.ts` contains the 3D projection and scene geometry; `app/research-graph.tsx` handles interaction/rendering; `app/topic-glyph.tsx` contains the animated diagrams.

`app/knowledge-graph.tsx` handles the all-topics view and camera interaction. `app/knowledge-geometry.ts` derives the graph edges, deterministic 3D spring layout, and zoomable projection.
