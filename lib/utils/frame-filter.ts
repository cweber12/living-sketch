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
export function lerpFrame(
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

// ── Per-landmark interpolation ─────────────────────────────────────────────

/**
 * Interpolate individual low-confidence landmarks within otherwise-valid frames.
 *
 * Where a specific keypoint has `score < minConfidence` in a frame, replace it
 * with a linear interpolation from the nearest neighbouring frames where that
 * keypoint has sufficient confidence.  Handles leading/trailing gaps by clamping
 * to the nearest good neighbour.
 *
 * Run this AFTER `filterAndInterpolateFrames` to fill per-landmark holes left
 * by partial occlusion (e.g. hand out of frame), before landmark smoothing.
 */
export function interpolateLowConfidenceLandmarks(
  frames: LandmarkFrame[],
  minConfidence = DEFAULT_MIN_CONFIDENCE,
): LandmarkFrame[] {
  if (frames.length === 0) return [];

  const numKeypoints = frames[0].length;
  // Deep-copy so we don't mutate the input
  const result: LandmarkFrame[] = frames.map((f) => f.map((kp) => ({ ...kp })));

  for (let kpIdx = 0; kpIdx < numKeypoints; kpIdx++) {
    // Collect frame indices where this keypoint has sufficient confidence
    const goodFrames: number[] = [];
    for (let fi = 0; fi < frames.length; fi++) {
      const kp = frames[fi][kpIdx];
      if (kp && (kp.score === undefined || kp.score >= minConfidence)) {
        goodFrames.push(fi);
      }
    }

    if (goodFrames.length === 0) continue; // no good data — leave as-is

    for (let fi = 0; fi < frames.length; fi++) {
      const kp = frames[fi][kpIdx];
      if (kp && (kp.score === undefined || kp.score >= minConfidence)) {
        continue; // already good
      }

      // Binary search for prev good frame
      let prevGood = -1;
      let lo = 0;
      let hi = goodFrames.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        if (goodFrames[mid] < fi) {
          prevGood = goodFrames[mid];
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }

      // Binary search for next good frame
      let nextGood = -1;
      lo = 0;
      hi = goodFrames.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        if (goodFrames[mid] > fi) {
          nextGood = goodFrames[mid];
          hi = mid - 1;
        } else {
          lo = mid + 1;
        }
      }

      if (prevGood >= 0 && nextGood >= 0) {
        const t = (fi - prevGood) / (nextGood - prevGood);
        const a = frames[prevGood][kpIdx];
        const b = frames[nextGood][kpIdx];
        result[fi][kpIdx] = {
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
          z:
            a.z !== undefined && b.z !== undefined
              ? a.z + (b.z - a.z) * t
              : a.z,
          score: Math.min(a.score ?? 0, b.score ?? 0),
        };
      } else if (prevGood >= 0) {
        result[fi][kpIdx] = { ...frames[prevGood][kpIdx] };
      } else {
        result[fi][kpIdx] = { ...frames[nextGood][kpIdx] };
      }
    }
  }

  return result;
}

// ── Frame interval (jitter reduction) ─────────────────────────────────────

/**
 * Downsample frames by `interval` and linearly interpolate the gaps.
 *
 * interval = 1 → every frame unchanged.
 * interval = N → only every Nth frame is used as a keyframe; intermediate
 *   frames are interpolated from the bracketing keyframes, giving a smoother
 *   (lower-frequency) motion.
 */
export function applyFrameInterval(
  frames: LandmarkFrame[],
  interval: number,
): LandmarkFrame[] {
  if (interval <= 1 || frames.length <= 1) return frames;
  const step = Math.max(1, Math.round(interval));
  return frames.map((_, i) => {
    const keyA = Math.floor(i / step) * step;
    const keyB = Math.min(keyA + step, frames.length - 1);
    if (keyB <= keyA) return frames[Math.min(keyA, frames.length - 1)];
    const t = (i - keyA) / (keyB - keyA);
    return lerpFrame(frames[keyA], frames[keyB], Math.min(1, t));
  });
}
