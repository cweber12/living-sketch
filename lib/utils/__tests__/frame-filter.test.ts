import type { LandmarkFrame } from '@/lib/types';
import { isFrameValid, filterAndInterpolateFrames } from '../frame-filter';

function makeValidFrame(): LandmarkFrame {
  return Array.from({ length: 33 }, (_, i) => ({
    x: 100 + i,
    y: 200 + i,
    score: 0.9,
  }));
}

function makeInvalidFrame(): LandmarkFrame {
  const frame = makeValidFrame();
  // Set left shoulder below threshold
  frame[11] = { x: 100, y: 200, score: 0.1 };
  return frame;
}

describe('isFrameValid', () => {
  it('returns true for a fully-confident frame', () => {
    expect(isFrameValid(makeValidFrame())).toBe(true);
  });

  it('returns false when a required landmark is below threshold', () => {
    expect(isFrameValid(makeInvalidFrame())).toBe(false);
  });

  it('returns false when a required landmark is missing', () => {
    const frame = makeValidFrame();
    // Delete right hip entirely
    frame[24] = undefined as never;
    expect(isFrameValid(frame)).toBe(false);
  });

  it('respects custom minConfidence', () => {
    const frame = makeValidFrame();
    frame[11] = { x: 0, y: 0, score: 0.5 };
    expect(isFrameValid(frame, 0.4)).toBe(true);
    expect(isFrameValid(frame, 0.6)).toBe(false);
  });

  it('respects custom requiredIndices', () => {
    const frame = makeValidFrame();
    frame[0] = { x: 0, y: 0, score: 0.1 }; // nose low-confidence
    // Default required (11,12,23,24) are fine
    expect(isFrameValid(frame)).toBe(true);
    // Custom required includes nose
    expect(isFrameValid(frame, 0.3, [0, 11, 12])).toBe(false);
  });
});

describe('filterAndInterpolateFrames', () => {
  it('returns empty array for empty input', () => {
    expect(filterAndInterpolateFrames([])).toEqual([]);
  });

  it('returns all frames unchanged when all are valid', () => {
    const frames = [makeValidFrame(), makeValidFrame(), makeValidFrame()];
    const result = filterAndInterpolateFrames(frames);
    expect(result).toHaveLength(3);
    // Frames should be the same references
    expect(result[0]).toBe(frames[0]);
    expect(result[2]).toBe(frames[2]);
  });

  it('interpolates a single invalid frame between two valid frames', () => {
    const f0 = makeValidFrame();
    const f2 = makeValidFrame();
    // Make them distinct so interpolation is visible
    f0[0] = { x: 0, y: 0, score: 0.9 };
    f2[0] = { x: 10, y: 20, score: 0.9 };

    const fBad = makeInvalidFrame();
    const result = filterAndInterpolateFrames([f0, fBad, f2]);

    expect(result).toHaveLength(3);
    // Middle frame should be interpolated (t=0.5)
    expect(result[1][0].x).toBeCloseTo(5);
    expect(result[1][0].y).toBeCloseTo(10);
  });

  it('holds first valid frame for leading invalid frames', () => {
    const fBad = makeInvalidFrame();
    const fGood = makeValidFrame();
    fGood[0] = { x: 42, y: 99, score: 0.9 };

    const result = filterAndInterpolateFrames([fBad, fBad, fGood]);
    expect(result).toHaveLength(3);
    // Leading invalid frames should copy first valid
    expect(result[0][0].x).toBeCloseTo(42);
    expect(result[1][0].x).toBeCloseTo(42);
  });

  it('holds last valid frame for trailing invalid frames', () => {
    const fGood = makeValidFrame();
    fGood[0] = { x: 7, y: 8, score: 0.9 };
    const fBad = makeInvalidFrame();

    const result = filterAndInterpolateFrames([fGood, fBad, fBad]);
    expect(result).toHaveLength(3);
    expect(result[1][0].x).toBeCloseTo(7);
    expect(result[2][0].x).toBeCloseTo(7);
  });

  it('returns originals when all frames are invalid', () => {
    const frames = [makeInvalidFrame(), makeInvalidFrame()];
    const result = filterAndInterpolateFrames(frames);
    expect(result).toHaveLength(2);
    // Should return copies of originals since nothing can be interpolated
    expect(result[0]).toBe(frames[0]);
  });

  it('preserves frame count', () => {
    const frames = Array.from({ length: 10 }, (_, i) =>
      i % 3 === 0 ? makeValidFrame() : makeInvalidFrame(),
    );
    const result = filterAndInterpolateFrames(frames);
    expect(result).toHaveLength(10);
  });
});
