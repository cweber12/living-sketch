import type { LandmarkFrame } from '@/lib/types';
import {
  smoothLandmarkFrames,
  DEFAULT_SMOOTHER_CONFIG,
} from '../landmark-smoother';

function makeStaticFrames(n: number, x = 100, y = 200): LandmarkFrame[] {
  return Array.from({ length: n }, () =>
    Array.from({ length: 33 }, () => ({ x, y, score: 0.9 })),
  );
}

function makeNoisyFrames(
  n: number,
  baseX: number,
  noiseAmp: number,
): LandmarkFrame[] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: 33 }, () => ({
      x: baseX + (i % 2 === 0 ? noiseAmp : -noiseAmp),
      y: 200,
      score: 0.9,
    })),
  );
}

describe('smoothLandmarkFrames', () => {
  it('returns empty array for empty input', () => {
    expect(smoothLandmarkFrames([])).toEqual([]);
  });

  it('passes through first frame unchanged', () => {
    const frames = makeStaticFrames(1, 42, 99);
    const result = smoothLandmarkFrames(frames);
    expect(result).toHaveLength(1);
    expect(result[0][0].x).toBeCloseTo(42);
    expect(result[0][0].y).toBeCloseTo(99);
  });

  it('smooths static frames to the same value', () => {
    const frames = makeStaticFrames(10, 100, 200);
    const result = smoothLandmarkFrames(frames);
    // After convergence, should be very close to the static value
    const last = result[result.length - 1];
    expect(last[0].x).toBeCloseTo(100, 1);
    expect(last[0].y).toBeCloseTo(200, 1);
  });

  it('reduces noise amplitude in alternating frames', () => {
    const frames = makeNoisyFrames(30, 100, 5);
    const result = smoothLandmarkFrames(frames);

    // Measure variance of last few smoothed frames vs raw
    const rawXs = frames.slice(-10).map((f) => f[0].x);
    const smoothXs = result.slice(-10).map((f) => f[0].x);

    const rawVariance = variance(rawXs);
    const smoothVariance = variance(smoothXs);

    // Smoothed variance should be significantly less
    expect(smoothVariance).toBeLessThan(rawVariance * 0.5);
  });

  it('preserves score and z fields', () => {
    const frames: LandmarkFrame[] = [
      [{ x: 1, y: 2, z: 3, score: 0.8 }],
      [{ x: 1, y: 2, z: 3, score: 0.8 }],
    ];
    const result = smoothLandmarkFrames(frames);
    expect(result[0][0].score).toBe(0.8);
    expect(result[0][0].z).toBeDefined();
  });

  it('handles missing z gracefully', () => {
    const frames: LandmarkFrame[] = [
      [{ x: 1, y: 2, score: 0.9 }],
      [{ x: 1, y: 2, score: 0.9 }],
    ];
    const result = smoothLandmarkFrames(frames);
    expect(result[0][0].z).toBeUndefined();
  });

  it('respects custom config', () => {
    const frames = makeNoisyFrames(20, 100, 10);

    // Very aggressive smoothing
    const smooth = smoothLandmarkFrames(frames, 30, {
      ...DEFAULT_SMOOTHER_CONFIG,
      minCutoff: 0.1,
      beta: 0.0,
    });

    // Very responsive (minimal smoothing)
    const responsive = smoothLandmarkFrames(frames, 30, {
      ...DEFAULT_SMOOTHER_CONFIG,
      minCutoff: 100,
      beta: 1.0,
    });

    const smoothVar = variance(smooth.slice(-10).map((f) => f[0].x));
    const respVar = variance(responsive.slice(-10).map((f) => f[0].x));

    // Aggressive smoothing should have less variance
    expect(smoothVar).toBeLessThan(respVar);
  });
});

function variance(arr: number[]): number {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
}
