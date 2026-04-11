/**
 * Display transform utilities — object-contain coordinate mapping.
 *
 * Used to map source-space coordinates (e.g. landmark pixel positions in
 * the original video frame) into a display container of arbitrary size,
 * applying the same letterbox logic as CSS `object-fit: contain`:
 *   - uniform scale (no stretching)
 *   - centered within the container (equal bars on opposing sides)
 *
 * This keeps PoseCanvas overlays perfectly aligned with their underlying
 * video regardless of the container's aspect ratio.
 */

export interface DisplayTransform {
  /** Uniform scale: source px → container px. */
  scale: number;
  /** Horizontal offset (container px) to center the content. */
  offsetX: number;
  /** Vertical offset (container px) to center the content. */
  offsetY: number;
}

/**
 * Compute the object-contain transform from a source frame into a display
 * container.
 *
 * @param sourceW - Width of the source coordinate space (e.g. videoWidth)
 * @param sourceH - Height of the source coordinate space (e.g. videoHeight)
 * @param containerW - Width of the display container in CSS/canvas pixels
 * @param containerH - Height of the display container in CSS/canvas pixels
 */
export function objectContainTransform(
  sourceW: number,
  sourceH: number,
  containerW: number,
  containerH: number,
): DisplayTransform {
  if (sourceW <= 0 || sourceH <= 0 || containerW <= 0 || containerH <= 0) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }
  const scale = Math.min(containerW / sourceW, containerH / sourceH);
  return {
    scale,
    offsetX: (containerW - sourceW * scale) / 2,
    offsetY: (containerH - sourceH * scale) / 2,
  };
}

/**
 * Apply a display transform to a single (x, y) coordinate pair.
 * Maps source-space coordinates to display-space coordinates.
 */
export function applyDisplayTransform(
  x: number,
  y: number,
  t: DisplayTransform,
): { x: number; y: number } {
  return {
    x: x * t.scale + t.offsetX,
    y: y * t.scale + t.offsetY,
  };
}
