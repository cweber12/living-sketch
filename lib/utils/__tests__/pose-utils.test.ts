import {
  scaleLandmarks,
  scaleLandmarkFrames,
  applyShiftsToFrame,
} from '../pose-utils';
import type { LandmarkFrame } from '@/lib/types';

const frame: LandmarkFrame = [
  { x: 100, y: 200, score: 1 },
  { x: 50, y: 100, score: 0.9 },
];

describe('scaleLandmarks', () => {
  it('scales coordinates from original to target dims', () => {
    const result = scaleLandmarks(
      frame,
      { width: 200, height: 400 },
      { width: 400, height: 800 },
    );
    expect(result[0].x).toBe(200);
    expect(result[0].y).toBe(400);
    expect(result[1].x).toBe(100);
    expect(result[1].y).toBe(200);
  });

  it('returns original when original dims are zero', () => {
    const result = scaleLandmarks(
      frame,
      { width: 0, height: 0 },
      { width: 100, height: 100 },
    );
    expect(result).toBe(frame);
  });
});

describe('scaleLandmarkFrames', () => {
  it('scales multiple frames', () => {
    const frames = [frame, frame];
    const result = scaleLandmarkFrames(
      frames,
      { width: 100, height: 100 },
      { width: 200, height: 200 },
    );
    expect(result).toHaveLength(2);
    expect(result[0][0].x).toBe(200);
  });
});

describe('applyShiftsToFrame', () => {
  const ZERO = { x: 0, y: 0 };
  const shifts = {
    torsoShift: ZERO,
    headShift: { x: 1, y: 1 },
    shoulderShift: ZERO,
    elbowShift: ZERO,
    wristShift: ZERO,
    hipShift: ZERO,
    kneeShift: ZERO,
    ankleShift: ZERO,
    footShift: ZERO,
  };

  it('shifts head keypoints (indices 0-10)', () => {
    const kps: LandmarkFrame = Array.from({ length: 33 }, () => ({
      x: 100,
      y: 100,
      score: 1,
    }));
    const result = applyShiftsToFrame(kps, shifts, 100, 100);
    // Head keypoints (0-10) shifted by headShift * 100 * 0.1 = 10
    expect(result[0].x).toBe(110);
    expect(result[0].y).toBe(110);
    // Non-head keypoints with zero shift remain unchanged
    expect(result[11].x).toBe(100);
    expect(result[11].y).toBe(100);
  });
});
