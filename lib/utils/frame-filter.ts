import type { LandmarkFrame, Keypoint } from '@/lib/types';

// ── Constants ──────────────────────────────────────────────────────────────

/** Minimum confidence for a landmark to be considered present. */
const DEFAULT_MIN_CONFIDENCE = 0.3;

/**
 * Structural landmarks required for a valid frame.
 * Shoulders (11, 12) and hips (23, 24) define the torso quadrilateral.
 */
const DEFAULT_REQUIRED_INDICES = [11, 12, 23, 24];

// ── Validation ─────────────────────────────────────────────────────────────

/**
 * Check whether a frame has sufficient landmark quality for rendering.
 * Returns true when all required landmarks meet the confidence threshold.
 */
export function isFrameValid(
  frame: LandmarkFrame,
  minConfidence = DEFAULT_MIN_CONFIDENCE,
  requiredIndices: readonly number[] = DEFAULT_REQUIRED_INDICES,
): boolean {
  for (const idx of requiredIndices) {
    const kp = frame[idx];
    if (!kp || (kp.score !== undefined && kp.score < minConfidence)) {
      return false;
    }
  }
  return true;
}

// ── Interpolation ──────────────────────────────────────────────────────────

/**
 * Linearly interpolate between two landmark frames.
 * @param a - Start frame
 * @param b - End frame
 * @param t - Interpolation factor (0 = a, 1 = b)
 */
function lerpFrame(
  a: LandmarkFrame,
  b: LandmarkFrame,
  t: number,
): LandmarkFrame {
  const len = Math.min(a.length, b.length);
  const result: Keypoint[] = [];
  for (let i = 0; i < len; i++) {
    const ka = a[i];
    const kb = b[i];
    result.push({
      x: ka.x + (kb.x - ka.x) * t,
      y: ka.y + (kb.y - ka.y) * t,
      z:
        ka.z !== undefined && kb.z !== undefined
          ? ka.z + (kb.z - ka.z) * t
          : ka.z,
      score: Math.min(ka.score ?? 0, kb.score ?? 0),
    });
  }
  return result;
}

// ── Filter + Interpolate ───────────────────────────────────────────────────

/**
 * Filter out invalid frames and fill gaps with linear interpolation.
 *
 * Preserves the original frame count — invalid frames are replaced with
 * interpolated data so animation timing stays consistent.
 * Gaps at the start/end are filled from the nearest valid frame.
 */
export function filterAndInterpolateFrames(
  frames: LandmarkFrame[],
  minConfidence = DEFAULT_MIN_CONFIDENCE,
  requiredIndices: readonly number[] = DEFAULT_REQUIRED_INDICES,
): LandmarkFrame[] {
  if (frames.length === 0) return [];

  const valid = frames.map((f) =>
    isFrameValid(f, minConfidence, requiredIndices),
  );
  const result: LandmarkFrame[] = new Array(frames.length);

  // Collect valid frame indices for efficient lookup
  const validIndices: number[] = [];
  for (let i = 0; i < frames.length; i++) {
    if (valid[i]) validIndices.push(i);
  }

  // No valid frames at all — return originals untouched
  if (validIndices.length === 0) return [...frames];

  for (let i = 0; i < frames.length; i++) {
    if (valid[i]) {
      result[i] = frames[i];
      continue;
    }

    // Binary search for nearest valid neighbours
    let lo = 0;
    let hi = validIndices.length - 1;
    let prevValid = -1;
    let nextValid = -1;

    // Find largest valid index < i
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (validIndices[mid] < i) {
        prevValid = validIndices[mid];
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }

    // Find smallest valid index > i
    lo = 0;
    hi = validIndices.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (validIndices[mid] > i) {
        nextValid = validIndices[mid];
        hi = mid - 1;
      } else {
        lo = mid + 1;
      }
    }

    if (prevValid >= 0 && nextValid >= 0) {
      const t = (i - prevValid) / (nextValid - prevValid);
      result[i] = lerpFrame(frames[prevValid], frames[nextValid], t);
    } else if (prevValid >= 0) {
      result[i] = frames[prevValid];
    } else {
      result[i] = frames[nextValid];
    }
  }

  return result;
}
