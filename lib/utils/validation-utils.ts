import type { PointAnchor } from '@/lib/types';

/** Return true when ANY anchor is out-of-bounds or invalid. */
export function validateAnchors(
  anchors: (PointAnchor | undefined | null)[],
  width: number,
  height: number,
): boolean {
  return anchors.some(
    (lm) =>
      !lm ||
      typeof lm.x !== 'number' ||
      typeof lm.y !== 'number' ||
      isNaN(lm.x) ||
      isNaN(lm.y) ||
      lm.x < 0 ||
      lm.y < 0 ||
      lm.x > width ||
      lm.y > height,
  );
}
