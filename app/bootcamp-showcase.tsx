'use client';

import { useState, type ComponentType } from 'react';
import dynamic from 'next/dynamic';
import type { VariantProps } from './bootcamp-shared';
import type { ViewId } from './bootcamp-views';

// The 3D views are computed per frame in the browser, so they skip server rendering.
const SCENES: Record<ViewId, ComponentType<VariantProps>> = {
  landscape: dynamic(() => import('./bootcamp-landscape'), { ssr: false }),
  interference: dynamic(() => import('./bootcamp-interference'), { ssr: false }),
  membrane: dynamic(() => import('./bootcamp-membrane'), { ssr: false }),
  spectra: dynamic(() => import('./bootcamp-spectra'), { ssr: false }),
  swell: dynamic(() => import('./bootcamp-swell'), { ssr: false }),
  helix: dynamic(() => import('./bootcamp-helix'), { ssr: false }),
  attractor: dynamic(() => import('./bootcamp-attractor'), { ssr: false }),
};

export default function BootcampShowcase({ view }: { view: ViewId }) {
  const [active, setActive] = useState(0);
  const Scene = SCENES[view];
  return <div className="bc-stage" role="region" aria-label="Vizuara research bootcamps">
    <Scene key={view} active={active} onActive={setActive} />
  </div>;
}
