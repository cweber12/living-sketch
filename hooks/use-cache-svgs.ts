'use client';

import { useEffect, useRef, useState } from 'react';
import type { SvgParts } from '@/lib/types';
import { svgStringToImage } from '@/lib/utils/svg-utils';
import { TorsoDimensions } from '@/lib/utils/torso-dimensions';

/**
 * Convert SVG strings → HTMLImageElement cache.
 * Updates torso SVG dimensions when the torso part is loaded.
 */
export function useCacheSvgs(
  svgs: SvgParts,
  torsoDims: TorsoDimensions | null,
): Record<string, HTMLImageElement> {
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const prev = useRef<string>('');

  useEffect(() => {
    const key = JSON.stringify(svgs);
    if (key === prev.current) return;
    prev.current = key;

    let cancelled = false;

    (async () => {
      const next: Record<string, HTMLImageElement> = {};
      for (const [part, svgStr] of Object.entries(svgs)) {
        if (!svgStr || typeof svgStr !== 'string') continue;
        const img = await svgStringToImage(svgStr);
        if (cancelled) return;
        if (img) {
          next[part] = img;
          if (part === 'torso' && torsoDims) {
            torsoDims.updateTorsoSvgDimensions(
              img.naturalHeight || img.height || 1,
              img.naturalWidth || img.width || 1,
            );
          }
        }
      }
      if (!cancelled) setImages(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [svgs, torsoDims]);

  return images;
}
