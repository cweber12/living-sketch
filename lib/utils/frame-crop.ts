/**
 * Subject crop computation for pose landmark data.
 *
 * After pose detection, these utilities:
 *   1. Compute a tight bounding box around the subject using body landmarks
 *      (shoulders, hips, knees, ankles, feet — excludes noisy face points)
 *   2. Expand the box with proportional padding on all sides
 *   3. Snap the padded box to the nearest standard display aspect ratio
 *   4. Clamp the result to the source frame boundaries
 *   5. Transform landmark coordinates from full-frame space into crop space
 *
 * Coordinate spaces:
 *   - Source / full-frame space: (0,0) → (frameDims.width, frameDims.height)
 *     Raw output of `toFrame()` in use-pose-detection.ts.
 *   - Crop space: (0,0) → (crop.width, crop.height)
 *     Saved landmark data and downstream rendering always use crop space.
 */

import type { LandmarkFrame, Keypoint, Dimensions } from '@/lib/types';

// ── Constants ───────────────────────────────────────────────────────────────

const MIN_VISIBILITY = 0.3;

/**
 * Landmark indices used to compute the subject bounding box.
 * Excludes face, ear, and eye points which are frequently occluded
 * and produce unstable / over-large bounding boxes.
 */
const BODY_LANDMARK_INDICES = [
  0, // nose — well-detected when frontal, skip if occluded handled by score check
  11,
  12, // shoulders
  13,
  14, // elbows
  15,
  16, // wrists
  23,
  24, // hips
  25,
  26, // knees
  27,
  28, // ankles
  29,
  30, // heels
  31,
  32, // foot indices
] as const;

/**
 * Standard display aspect ratios (width:height), ordered landscape → portrait.
 * The crop is expanded to the nearest ratio so it maps cleanly to a display.
 */
const STANDARD_ASPECTS = [
  { w: 16, h: 9 }, // 16:9  — wide landscape (1920×1080, 1280×720 …)
  { w: 4, h: 3 }, //  4:3  — classic landscape (640×480, 1024×768 …)
  { w: 3, h: 2 }, //  3:2  — photo landscape
  { w: 1, h: 1 }, //  1:1  — square
  { w: 3, h: 4 }, //  3:4  — portrait photo
  { w: 9, h: 16 }, // 9:16 — portrait phone
] as const;

// ── Types ───────────────────────────────────────────────────────────────────

/**
 * A rectangular crop region in source-frame pixel coordinates.
 * All values are in the same coordinate space as the raw landmark data.
 */
export interface Crop {
  /** Left edge of the crop region (source frame pixels). */
  x: number;
  /** Top edge of the crop region (source frame pixels). */
  y: number;
  /** Width of the crop region (source frame pixels). */
  width: number;
  /** Height of the crop region (source frame pixels). */
  height: number;
}

// ── Internal helpers ────────────────────────────────────────────────────────

/**
 * Compute the bounding box of all reliable body landmarks across all frames.
 * Returns null if no landmarks pass the visibility threshold.
 */
function computeLandmarkBounds(frames: LandmarkFrame[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  let found = false;

  for (const frame of frames) {
    for (const idx of BODY_LANDMARK_INDICES) {
      const lm = frame[idx];
      if (!lm) continue;
      if (lm.score !== undefined && lm.score < MIN_VISIBILITY) continue;
      minX = Math.min(minX, lm.x);
      minY = Math.min(minY, lm.y);
      maxX = Math.max(maxX, lm.x);
      maxY = Math.max(maxY, lm.y);
      found = true;
    }
  }

  return found ? { minX, minY, maxX, maxY } : null;
}

/**
 * Return the standard aspect ratio (from STANDARD_ASPECTS) whose ratio is
 * closest to the given width/height pair, measured in log-ratio space so
 * landscape and portrait distances are treated symmetrically.
 */
function nearestAspect(w: number, h: number): { w: number; h: number } {
  const ar = w / h;
  let best = STANDARD_ASPECTS[0] as { w: number; h: number };
  let bestDiff = Infinity;
  for (const aspect of STANDARD_ASPECTS) {
    const diff = Math.abs(Math.log(ar / (aspect.w / aspect.h)));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = aspect;
    }
  }
  return best;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute a subject-centered crop rectangle from a set of landmark frames.
 *
 * Algorithm:
 *   1. Find the tight bounding box of reliable body landmarks
 *   2. Expand by proportional padding (20% of subject extent per side)
 *   3. Snap to the nearest standard display aspect ratio by expanding the
 *      shorter axis — never crops the subject to fit
 *   4. Re-center the expanded box and clamp to the source frame
 *
 * Returns the full source frame as a fallback when no reliable landmarks exist.
 */
export function computeSubjectCrop(
  frames: LandmarkFrame[],
  frameDims: Dimensions,
): Crop {
  const bounds = computeLandmarkBounds(frames);
  if (!bounds) {
    // No reliable landmarks — fall back to the full source frame
    return { x: 0, y: 0, width: frameDims.width, height: frameDims.height };
  }

  const { minX, minY, maxX, maxY } = bounds;
  const subjectW = maxX - minX;
  const subjectH = maxY - minY;

  // Proportional padding: 20% of subject extent per side.
  // Minimum 20 px prevents degenerate crops on very small subjects.
  const padX = Math.max(subjectW * 0.2, 20);
  const padY = Math.max(subjectH * 0.2, 20);

  const paddedX = Math.max(0, minX - padX);
  const paddedY = Math.max(0, minY - padY);
  const paddedRight = Math.min(frameDims.width, maxX + padX);
  const paddedBottom = Math.min(frameDims.height, maxY + padY);
  const paddedW = paddedRight - paddedX;
  const paddedH = paddedBottom - paddedY;

  // Find the nearest standard aspect ratio and expand the shorter axis.
  // We NEVER shrink either axis (no subject will be clipped).
  const aspect = nearestAspect(paddedW, paddedH);
  const targetAR = aspect.w / aspect.h;
  const actualAR = paddedW / paddedH;

  let finalW: number, finalH: number;
  if (actualAR < targetAR) {
    // Box is too tall → expand width to reach target AR
    finalH = paddedH;
    finalW = paddedH * targetAR;
  } else {
    // Box is too wide → expand height to reach target AR
    finalW = paddedW;
    finalH = paddedW / targetAR;
  }

  // Re-center around the padded box center, then clamp to source frame.
  const centerX = paddedX + paddedW / 2;
  const centerY = paddedY + paddedH / 2;

  let cropX = centerX - finalW / 2;
  let cropY = centerY - finalH / 2;

  // Shift before clamping so we use as much of the expanded area as possible
  cropX = Math.max(0, Math.min(cropX, frameDims.width - finalW));
  cropY = Math.max(0, Math.min(cropY, frameDims.height - finalH));

  // After shifting, clamp size to what the frame can provide
  finalW = Math.min(finalW, frameDims.width - cropX);
  finalH = Math.min(finalH, frameDims.height - cropY);

  return { x: cropX, y: cropY, width: finalW, height: finalH };
}

/**
 * Transform a single landmark frame from full-frame coordinates to
 * crop-frame coordinates.
 *
 * Source space: (0,0) → (frameDims.width, frameDims.height)
 * Target space: (0,0) → (crop.width, crop.height)
 *
 * The transform is a simple translation: `x' = x - crop.x, y' = y - crop.y`
 */
export function transformFrameToCrop(
  frame: LandmarkFrame,
  crop: Crop,
): LandmarkFrame {
  return frame.map(
    (lm): Keypoint => ({
      ...lm,
      x: lm.x - crop.x,
      y: lm.y - crop.y,
    }),
  );
}

/**
 * Transform a batch of landmark frames to crop-frame coordinates.
 * See `transformFrameToCrop` for coordinate space details.
 */
export function transformFramesToCrop(
  frames: LandmarkFrame[],
  crop: Crop,
): LandmarkFrame[] {
  return frames.map((frame) => transformFrameToCrop(frame, crop));
}

/**
 * Returns the crop dimensions as a Dimensions object,
 * with integer values suitable for canvas size attributes.
 */
export function cropToDimensions(crop: Crop): Dimensions {
  return {
    width: Math.round(crop.width),
    height: Math.round(crop.height),
  };
}
