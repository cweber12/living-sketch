import {
  computeSubjectCrop,
  transformFrameToCrop,
  transformFramesToCrop,
  cropToDimensions,
} from '../frame-crop';
import type { LandmarkFrame, Dimensions } from '@/lib/types';

// Minimal 33-landmark frame: all zeros with score=0 (will be filtered out
// when testing the no-visible-landmarks path)
function makeFrame(
  overrides: Partial<Record<number, { x: number; y: number; score?: number }>>,
): LandmarkFrame {
  return Array.from({ length: 33 }, (_, i) => {
    const o = overrides[i];
    return o
      ? { x: o.x, y: o.y, score: o.score ?? 1 }
      : { x: 0, y: 0, score: 0 };
  });
}

const frameDims: Dimensions = { width: 1920, height: 1080 };

describe('computeSubjectCrop', () => {
  it('returns full source frame when no frames are provided', () => {
    const crop = computeSubjectCrop([], frameDims);
    expect(crop).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
  });

  it('returns full source frame when all landmarks have low visibility', () => {
    const frame = makeFrame({}); // all score=0
    const crop = computeSubjectCrop([frame], frameDims);
    expect(crop).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
  });

  it('returns a crop that contains the visible body landmarks', () => {
    // Place shoulder (11) at (800, 200) and hip (23) at (800, 700)
    const frame = makeFrame({ 11: { x: 800, y: 200 }, 23: { x: 800, y: 700 } });
    const crop = computeSubjectCrop([frame], frameDims);

    // The crop must contain both landmark points
    expect(crop.x).toBeLessThanOrEqual(800);
    expect(crop.y).toBeLessThanOrEqual(200);
    expect(crop.x + crop.width).toBeGreaterThanOrEqual(800);
    expect(crop.y + crop.height).toBeGreaterThanOrEqual(700);
  });

  it('clamps crop to source frame boundaries', () => {
    // Subject right at the edge
    const frame = makeFrame({ 11: { x: 10, y: 10 }, 23: { x: 1910, y: 1070 } });
    const crop = computeSubjectCrop([frame], frameDims);

    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(frameDims.width + 1); // rounding tolerance
    expect(crop.y + crop.height).toBeLessThanOrEqual(frameDims.height + 1);
  });

  it('produces a crop with a positive width and height', () => {
    const frame = makeFrame({ 11: { x: 400, y: 300 }, 23: { x: 600, y: 500 } });
    const crop = computeSubjectCrop([frame], frameDims);
    expect(crop.width).toBeGreaterThan(0);
    expect(crop.height).toBeGreaterThan(0);
  });
});

describe('transformFrameToCrop', () => {
  it('translates landmark coordinates to crop-relative space', () => {
    const frame: LandmarkFrame = [
      { x: 500, y: 300, score: 1 },
      { x: 700, y: 400, score: 0.9 },
    ];
    const crop = { x: 400, y: 200, width: 400, height: 300 };
    const result = transformFrameToCrop(frame, crop);

    expect(result[0].x).toBe(100); // 500 - 400
    expect(result[0].y).toBe(100); // 300 - 200
    expect(result[1].x).toBe(300); // 700 - 400
    expect(result[1].y).toBe(200); // 400 - 200
  });

  it('preserves score and other keypoint properties', () => {
    const frame: LandmarkFrame = [{ x: 100, y: 100, score: 0.75 }];
    const crop = { x: 50, y: 50, width: 200, height: 200 };
    const result = transformFrameToCrop(frame, crop);
    expect(result[0].score).toBe(0.75);
  });
});

describe('transformFramesToCrop', () => {
  it('applies crop transform to all frames', () => {
    const frame1: LandmarkFrame = [{ x: 300, y: 200, score: 1 }];
    const frame2: LandmarkFrame = [{ x: 400, y: 300, score: 1 }];
    const crop = { x: 100, y: 100, width: 500, height: 400 };
    const result = transformFramesToCrop([frame1, frame2], crop);

    expect(result).toHaveLength(2);
    expect(result[0][0].x).toBe(200); // 300 - 100
    expect(result[1][0].x).toBe(300); // 400 - 100
  });
});

describe('cropToDimensions', () => {
  it('rounds fractional dimensions to nearest integer', () => {
    const crop = { x: 0, y: 0, width: 319.6, height: 179.4 };
    const dims = cropToDimensions(crop);
    expect(dims.width).toBe(320);
    expect(dims.height).toBe(179);
  });

  it('preserves exact integer dimensions', () => {
    const crop = { x: 0, y: 0, width: 640, height: 360 };
    const dims = cropToDimensions(crop);
    expect(dims.width).toBe(640);
    expect(dims.height).toBe(360);
  });
});
