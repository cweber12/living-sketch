import type { LandmarkFrame, Keypoint } from '@/lib/types';

// ── Configuration ──────────────────────────────────────────────────────────

/**
 * One-Euro filter parameters.
 * Tuned for MediaPipe pose landmarks at 30 fps.
 */
export interface SmootherConfig {
  /** Minimum cutoff frequency (Hz). Lower = smoother, more lag. */
  minCutoff: number;
  /** Speed coefficient. Higher = less smoothing during fast movement. */
  beta: number;
  /** Derivative cutoff frequency (Hz). */
  dCutoff: number;
}

export const DEFAULT_SMOOTHER_CONFIG: SmootherConfig = {
  minCutoff: 1.0,
  beta: 0.007,
  dCutoff: 1.0,
};

// ── One-Euro filter internals ──────────────────────────────────────────────

function smoothingFactor(te: number, cutoff: number): number {
  const r = 2 * Math.PI * cutoff * te;
  return r / (r + 1);
}

function expSmooth(alpha: number, x: number, prev: number): number {
  return alpha * x + (1 - alpha) * prev;
}

interface OneEuroState {
  prevX: number;
  prevDx: number;
  initialized: boolean;
}

function oneEuroStep(
  state: OneEuroState,
  x: number,
  te: number,
  config: SmootherConfig,
): number {
  if (!state.initialized) {
    state.prevX = x;
    state.prevDx = 0;
    state.initialized = true;
    return x;
  }

  // Estimate derivative
  const dx = (x - state.prevX) / te;
  const edx = expSmooth(smoothingFactor(te, config.dCutoff), dx, state.prevDx);
  state.prevDx = edx;

  // Adaptive cutoff: static parts smooth heavily, moving parts stay responsive
  const cutoff = config.minCutoff + config.beta * Math.abs(edx);
  const filtered = expSmooth(smoothingFactor(te, cutoff), x, state.prevX);
  state.prevX = filtered;

  return filtered;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Smooth a sequence of landmark frames using a One-Euro filter.
 *
 * Each keypoint's x, y, z channels are filtered independently.
 * Static poses get heavy smoothing; fast motion stays responsive.
 *
 * @param frames - Raw or pre-filtered landmark frames
 * @param fps    - Frame rate for time-step calculation (default 30)
 * @param config - One-Euro filter parameters
 * @returns Smoothed frames (new array; originals not mutated)
 */
export function smoothLandmarkFrames(
  frames: LandmarkFrame[],
  fps = 30,
  config: SmootherConfig = DEFAULT_SMOOTHER_CONFIG,
): LandmarkFrame[] {
  if (frames.length === 0) return [];

  const numKeypoints = frames[0].length;
  const te = 1 / fps;

  // Independent filter state per keypoint per axis
  const states: OneEuroState[][] = Array.from({ length: numKeypoints }, () => [
    { prevX: 0, prevDx: 0, initialized: false }, // x
    { prevX: 0, prevDx: 0, initialized: false }, // y
    { prevX: 0, prevDx: 0, initialized: false }, // z
  ]);

  return frames.map((frame) =>
    frame.map((kp, i): Keypoint => {
      const st = states[i];
      return {
        ...kp,
        x: oneEuroStep(st[0], kp.x, te, config),
        y: oneEuroStep(st[1], kp.y, te, config),
        z: kp.z !== undefined ? oneEuroStep(st[2], kp.z, te, config) : kp.z,
      };
    }),
  );
}
