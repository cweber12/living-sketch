'use client';

import { useEffect, useRef, useState } from 'react';
import type { SvgParts } from '@/lib/types';
import { svgStringToImage } from '@/lib/utils/svg-utils';
import { TorsoDimensions } from '@/lib/utils/torso-dimensions';

/** Load a data URL (e.g. WebP base64) into an HTMLImageElement. */
function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!dataUrl.startsWith('data:image/')) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/** Shallow comparison of string-keyed record (avoids JSON.stringify of large data URLs). */
function shallowEqual(a: SvgParts, b: SvgParts): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}

/**
 * Convert SVG strings or data-URL images → HTMLImageElement cache.
 * Updates torso SVG dimensions when the torso part is loaded.
 */
export function useCacheSvgs(
  svgs: SvgParts,
  torsoDims: TorsoDimensions | null,
): Record<string, HTMLImageElement> {
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});
  const prev = useRef<SvgParts>({});

  useEffect(() => {
    if (shallowEqual(svgs, prev.current)) return;
    prev.current = svgs;

    let cancelled = false;

    (async () => {
      const next: Record<string, HTMLImageElement> = {};
      for (const [part, value] of Object.entries(svgs)) {
        if (!value || typeof value !== 'string') continue;
        const img = value.startsWith('data:')
          ? await dataUrlToImage(value)
          : await svgStringToImage(value);
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
