import { vec3, dot, len } from '../math';
import type { Vec3 } from '../types';
import {
  computeTorsoFrame,
  isFrontFacing,
  getShoulderMidpoint,
} from '../torso-frame';

/**
 * Build a 33-element landmark array with specified positions.
 * Landmarks not specified default to origin.
 */
function makeLandmarks(overrides: Record<number, Vec3>): Vec3[] {
  const arr: Vec3[] = Array.from({ length: 33 }, () => vec3(0, 0, 0));
  for (const [idx, v] of Object.entries(overrides)) {
    arr[Number(idx)] = v;
  }
  return arr;
}

function makeConfidences(value = 1.0): number[] {
  return Array.from({ length: 33 }, () => value);
}

describe('torso-frame', () => {
  // Standard upright torso: shoulders at top, hips at bottom, facing camera
  const L_SHOULDER = 11;
  const R_SHOULDER = 12;
  const L_HIP = 23;
  const R_HIP = 24;

  const standardLandmarks = makeLandmarks({
    [L_SHOULDER]: vec3(-0.3, 0.3, 0), // left shoulder
    [R_SHOULDER]: vec3(0.3, 0.3, 0), // right shoulder
    [L_HIP]: vec3(-0.2, -0.3, 0), // left hip
    [R_HIP]: vec3(0.2, -0.3, 0), // right hip
  });

  describe('computeTorsoFrame', () => {
    it('computes a valid torso frame for an upright pose', () => {
      const confidences = makeConfidences(0.9);
      const result = computeTorsoFrame(standardLandmarks, confidences, null);

      expect(result).not.toBeNull();
      if (!result) return;

      // Center should be average of all 4 landmarks
      // shoulderMid = (0, 0.3, 0), hipMid = (0, -0.3, 0), center = (0, 0, 0)
      expect(result.position.x).toBeCloseTo(0);
      expect(result.position.y).toBeCloseTo(0);
      expect(result.position.z).toBeCloseTo(0);

      // Width = distance between shoulders = 0.6
      expect(result.width).toBeCloseTo(0.6);

      // Height = distance shoulder-mid to hip-mid = 0.6
      expect(result.height).toBeCloseTo(0.6);

      // Basis vectors should be orthogonal
      expect(dot(result.basis.right, result.basis.up)).toBeCloseTo(0);
      expect(dot(result.basis.right, result.basis.forward)).toBeCloseTo(0);
      expect(dot(result.basis.up, result.basis.forward)).toBeCloseTo(0);

      // All basis vectors should be unit length
      expect(len(result.basis.right)).toBeCloseTo(1);
      expect(len(result.basis.up)).toBeCloseTo(1);
      expect(len(result.basis.forward)).toBeCloseTo(1);

      // Up should point roughly in +Y (shoulder above hip)
      expect(result.basis.up.y).toBeGreaterThan(0.9);

      // Forward should point roughly in +Z (facing camera)
      expect(result.basis.forward.z).toBeGreaterThan(0.9);
    });

    it('returns null when confidence is too low', () => {
      const confidences = makeConfidences(0.1);
      const result = computeTorsoFrame(standardLandmarks, confidences, null);
      expect(result).toBeNull();
    });

    it('returns null when one shoulder has low confidence', () => {
      const confidences = makeConfidences(0.9);
      confidences[L_SHOULDER] = 0.1;
      const result = computeTorsoFrame(standardLandmarks, confidences, null);
      expect(result).toBeNull();
    });

    it('reports minimum confidence score', () => {
      const confidences = makeConfidences(0.9);
      confidences[R_HIP] = 0.5;
      const result = computeTorsoFrame(standardLandmarks, confidences, null);
      expect(result).not.toBeNull();
      expect(result!.confidence).toBeCloseTo(0.5);
    });

    it('prevents sign flip when prevForward is provided', () => {
      const confidences = makeConfidences(0.9);
      // First frame
      const frame1 = computeTorsoFrame(standardLandmarks, confidences, null);
      expect(frame1).not.toBeNull();

      // Second frame with same data: forward should stay consistent
      const frame2 = computeTorsoFrame(
        standardLandmarks,
        confidences,
        frame1!.basis.forward,
      );
      expect(frame2).not.toBeNull();
      expect(dot(frame1!.basis.forward, frame2!.basis.forward)).toBeGreaterThan(
        0.99,
      );
    });

    it('handles edge-on torso by falling back to prevForward', () => {
      // All landmarks on the same line (degenerate plane)
      const edgeOn = makeLandmarks({
        [L_SHOULDER]: vec3(-0.3, 0.3, 0),
        [R_SHOULDER]: vec3(-0.3, 0.3, 0), // same position as left shoulder!
        [L_HIP]: vec3(-0.2, -0.3, 0),
        [R_HIP]: vec3(-0.2, -0.3, 0),
      });

      const prevForward = vec3(0, 0, 1);
      const confidences = makeConfidences(0.9);
      const result = computeTorsoFrame(edgeOn, confidences, prevForward);

      expect(result).not.toBeNull();
      // Forward should fall back to prevForward direction
      expect(result!.basis.forward.z).toBeGreaterThan(0.9);
    });

    it('handles torso with depth variation', () => {
      const landmarks = makeLandmarks({
        [L_SHOULDER]: vec3(-0.3, 0.3, 0.1),
        [R_SHOULDER]: vec3(0.3, 0.3, -0.1),
        [L_HIP]: vec3(-0.2, -0.3, 0.05),
        [R_HIP]: vec3(0.2, -0.3, -0.05),
      });

      const confidences = makeConfidences(0.9);
      const result = computeTorsoFrame(landmarks, confidences, null);

      expect(result).not.toBeNull();
      // Should still produce orthogonal basis
      expect(dot(result!.basis.right, result!.basis.up)).toBeCloseTo(0, 4);
      expect(dot(result!.basis.right, result!.basis.forward)).toBeCloseTo(0, 4);
    });
  });

  describe('isFrontFacing', () => {
    it('returns true when forward points toward camera (+Z)', () => {
      expect(isFrontFacing(vec3(0, 0, 1))).toBe(true);
    });

    it('returns false when forward points away (-Z)', () => {
      expect(isFrontFacing(vec3(0, 0, -1))).toBe(false);
    });

    it('returns true at exactly Z=0 (edge case)', () => {
      expect(isFrontFacing(vec3(1, 0, 0))).toBe(true);
    });
  });

  describe('getShoulderMidpoint', () => {
    it('returns midpoint of shoulders', () => {
      const mid = getShoulderMidpoint(standardLandmarks);
      expect(mid.x).toBeCloseTo(0);
      expect(mid.y).toBeCloseTo(0.3);
      expect(mid.z).toBeCloseTo(0);
    });
  });
});
