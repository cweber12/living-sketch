import type { Keypoint, LandmarkFrame, Dimensions } from '@/lib/types';

/** Scale a single frame from original to target dimensions (aspect-aware). */
export function scaleLandmarks(
  landmarks: LandmarkFrame,
  original: Dimensions,
  target: Dimensions,
): LandmarkFrame {
  if (original.width <= 0 || original.height <= 0) return landmarks;
  const sx = target.width / original.width;
  const sy = target.height / original.height;
  return landmarks.map(
    (kp): Keypoint => ({
      ...kp,
      x: kp.x * sx,
      y: kp.y * sy,
    }),
  );
}

/** Scale a batch of frames from original to target dimensions. */
export function scaleLandmarkFrames(
  frames: LandmarkFrame[],
  original: Dimensions,
  target: Dimensions,
): LandmarkFrame[] {
  return frames.map((f) => scaleLandmarks(f, original, target));
}

/**
 * Static mapping: keypoint index → shift-factor key name.
 * Computed once at module load instead of per-frame.
 */
const SHIFT_KEY_BY_INDEX: string[] = (() => {
  const arr: string[] = new Array(33).fill('');
  for (let i = 0; i <= 10; i++) arr[i] = 'headShift';
  arr[11] = 'shoulderShift';
  arr[12] = 'shoulderShift';
  arr[13] = 'elbowShift';
  arr[14] = 'elbowShift';
  arr[15] = 'wristShift';
  arr[16] = 'wristShift';
  for (let i = 17; i <= 22; i++) arr[i] = 'wristShift';
  arr[23] = 'hipShift';
  arr[24] = 'hipShift';
  arr[25] = 'kneeShift';
  arr[26] = 'kneeShift';
  arr[27] = 'ankleShift';
  arr[28] = 'ankleShift';
  for (let i = 29; i <= 32; i++) arr[i] = 'footShift';
  return arr;
})();

/** Apply shift factors to a landmark frame (mutate coordinates in-place for perf). */
export function applyShiftsToFrame(
  frame: LandmarkFrame,
  shifts: {
    torsoShift: { x: number; y: number };
    headShift: { x: number; y: number };
    shoulderShift: { x: number; y: number };
    elbowShift: { x: number; y: number };
    wristShift: { x: number; y: number };
    hipShift: { x: number; y: number };
    kneeShift: { x: number; y: number };
    ankleShift: { x: number; y: number };
    footShift: { x: number; y: number };
  },
  avgTorsoWidth: number,
  avgTorsoHeight: number,
): LandmarkFrame {
  const factor = 0.1;
  const tw = avgTorsoWidth * factor;
  const th = avgTorsoHeight * factor;

  return frame.map((kp, i) => {
    const key = SHIFT_KEY_BY_INDEX[i];
    if (!key) return kp;
    const s = shifts[key as keyof typeof shifts];
    if (!s) return kp;
    return {
      ...kp,
      x: kp.x + s.x * tw,
      y: kp.y + s.y * th,
    };
  });
}

/** Apply shifts to all frames. Returns new array (does not mutate input). */
export function applyShiftsToFrames(
  frames: LandmarkFrame[],
  shifts: Parameters<typeof applyShiftsToFrame>[1],
  avgTorsoWidth: number,
  avgTorsoHeight: number,
): LandmarkFrame[] {
  return frames.map((f) =>
    applyShiftsToFrame(f, shifts, avgTorsoWidth, avgTorsoHeight),
  );
}
