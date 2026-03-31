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

  // Map: keypoint index → shift key
  // Shoulders: 11, 12
  // Elbows: 13, 14
  // Wrists: 15, 16
  // Hips: 23, 24
  // Knees: 25, 26
  // Ankles: 27, 28
  // Feet: 29-32
  // Head: 0-10
  const shiftMap: Record<number, { x: number; y: number }> = {};
  for (let i = 0; i <= 10; i++) shiftMap[i] = shifts.headShift;
  shiftMap[11] = shifts.shoulderShift;
  shiftMap[12] = shifts.shoulderShift;
  shiftMap[13] = shifts.elbowShift;
  shiftMap[14] = shifts.elbowShift;
  shiftMap[15] = shifts.wristShift;
  shiftMap[16] = shifts.wristShift;
  for (let i = 17; i <= 22; i++) shiftMap[i] = shifts.wristShift;
  shiftMap[23] = shifts.hipShift;
  shiftMap[24] = shifts.hipShift;
  shiftMap[25] = shifts.kneeShift;
  shiftMap[26] = shifts.kneeShift;
  shiftMap[27] = shifts.ankleShift;
  shiftMap[28] = shifts.ankleShift;
  for (let i = 29; i <= 32; i++) shiftMap[i] = shifts.footShift;

  return frame.map((kp, i) => {
    const s = shiftMap[i];
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
