import type { PointAnchor } from '@/lib/types';

/** Compute 2×3 affine transform from 3 source → 3 destination points. */
export function affineFrom3Points(
  src0: PointAnchor,
  src1: PointAnchor,
  src2: PointAnchor,
  dst0: PointAnchor,
  dst1: PointAnchor,
  dst2: PointAnchor,
): { a: number; b: number; c: number; d: number; e: number; f: number } | null {
  const { x: x0, y: y0 } = src0;
  const { x: x1, y: y1 } = src1;
  const { x: x2, y: y2 } = src2;
  const { x: X0, y: Y0 } = dst0;
  const { x: X1, y: Y1 } = dst1;
  const { x: X2, y: Y2 } = dst2;

  const det = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1);
  if (Math.abs(det) < 1e-6) return null;

  const a = (X0 * (y1 - y2) + X1 * (y2 - y0) + X2 * (y0 - y1)) / det;
  const c = (X0 * (x2 - x1) + X1 * (x0 - x2) + X2 * (x1 - x0)) / det;
  const e =
    (X0 * (x1 * y2 - x2 * y1) +
      X1 * (x2 * y0 - x0 * y2) +
      X2 * (x0 * y1 - x1 * y0)) /
    det;

  const b = (Y0 * (y1 - y2) + Y1 * (y2 - y0) + Y2 * (y0 - y1)) / det;
  const d = (Y0 * (x2 - x1) + Y1 * (x0 - x2) + Y2 * (x1 - x0)) / det;
  const f =
    (Y0 * (x1 * y2 - x2 * y1) +
      Y1 * (x2 * y0 - x0 * y2) +
      Y2 * (x0 * y1 - x1 * y0)) /
    det;

  return { a, b, c, d, e, f };
}

/** Convert an SVG string into an Image element (browser only). */
export function svgStringToImage(
  svgString: string,
): Promise<HTMLImageElement | null> {
  if (!svgString || typeof window === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    const blob = new Blob([svgString], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/** Get the natural dimensions of an Image. */
export function getSvgSize(img: HTMLImageElement): { w: number; h: number } {
  return {
    w: img.naturalWidth || img.width || 1,
    h: img.naturalHeight || img.height || 1,
  };
}
