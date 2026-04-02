import { vec3, len, dot } from '../math';
import type { Vec3, PartTransform3D } from '../types';
import {
  computeHeadTransform,
  computeSegmentTransform,
  computeHandTransform,
  computeFootTransform,
  computeAllPartTransforms,
} from '../part-transforms';

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

/** Standard upright torso frame for tests. */
function makeTorso(): PartTransform3D {
  return {
    position: vec3(0, 0, 0),
    basis: {
      right: vec3(1, 0, 0),
      up: vec3(0, 1, 0),
      forward: vec3(0, 0, 1),
    },
    width: 0.6,
    height: 0.6,
    confidence: 0.9,
  };
}

describe('part-transforms', () => {
  const torso = makeTorso();

  describe('computeHeadTransform', () => {
    const landmarks = makeLandmarks({
      0: vec3(0, 0.6, 0.05), // nose
      7: vec3(-0.1, 0.5, 0), // left ear
      8: vec3(0.1, 0.5, 0), // right ear
      11: vec3(-0.3, 0.3, 0), // left shoulder (for midpoint)
      12: vec3(0.3, 0.3, 0), // right shoulder
    });

    it('computes a valid head transform', () => {
      const confidences = makeConfidences(0.9);
      const result = computeHeadTransform(landmarks, confidences, torso);

      expect(result).not.toBeNull();
      if (!result) return;

      // Width should be ear-to-ear distance = 0.2
      expect(result.width).toBeCloseTo(0.2);

      // Height should be nose-to-shoulder × multiplier
      // nose = (0, 0.6), shoulderMid = (0, 0.3), dist = 0.3
      // height = 0.3 * 1.6 = 0.48
      expect(result.height).toBeCloseTo(0.48, 1);

      // Position should be at shoulder midpoint (head base anchored there)
      expect(result.position.x).toBeCloseTo(0);
      expect(result.position.y).toBeCloseTo(0.3);

      // Basis should match torso
      expect(result.basis.forward.z).toBeCloseTo(1);
    });

    it('returns null when ears have low confidence', () => {
      const confidences = makeConfidences(0.9);
      confidences[7] = 0.1; // left ear below threshold
      const result = computeHeadTransform(landmarks, confidences, torso);
      expect(result).toBeNull();
    });
  });

  describe('computeSegmentTransform', () => {
    // Left upper arm: shoulder (11) → elbow (13)
    const landmarks = makeLandmarks({
      11: vec3(-0.3, 0.3, 0), // left shoulder
      13: vec3(-0.5, 0.0, 0), // left elbow
    });

    it('computes upper arm transform', () => {
      const confidences = makeConfidences(0.9);
      const result = computeSegmentTransform(
        'leftUpperArm',
        landmarks,
        confidences,
        torso,
      );

      expect(result).not.toBeNull();
      if (!result) return;

      // Center is midpoint of shoulder and elbow
      expect(result.position.x).toBeCloseTo(-0.4);
      expect(result.position.y).toBeCloseTo(0.15);

      // Height should be segment length
      const expectedLength = Math.sqrt(0.04 + 0.09); // ~0.36
      expect(result.height).toBeCloseTo(expectedLength);

      // Width should be torso.width * 0.25 = 0.6 * 0.25 = 0.15
      expect(result.width).toBeCloseTo(0.15);

      // Basis should be orthogonal
      expect(dot(result.basis.right, result.basis.up)).toBeCloseTo(0, 4);
      expect(dot(result.basis.right, result.basis.forward)).toBeCloseTo(0, 4);
    });

    it('computes lower leg transform', () => {
      const legLandmarks = makeLandmarks({
        25: vec3(-0.2, -0.3, 0), // left knee
        27: vec3(-0.2, -0.7, 0), // left ankle
      });
      const confidences = makeConfidences(0.9);
      const result = computeSegmentTransform(
        'leftLowerLeg',
        legLandmarks,
        confidences,
        torso,
      );

      expect(result).not.toBeNull();
      // Height should be 0.4 (straight vertical segment)
      expect(result!.height).toBeCloseTo(0.4);
      // Width ratio for lower leg is 0.22
      expect(result!.width).toBeCloseTo(0.6 * 0.22);
    });

    it('returns null for unknown part name', () => {
      const result = computeSegmentTransform(
        'nonexistent',
        landmarks,
        makeConfidences(),
        torso,
      );
      expect(result).toBeNull();
    });

    it('returns null when confidence is low', () => {
      const confidences = makeConfidences(0.9);
      confidences[11] = 0.1;
      const result = computeSegmentTransform(
        'leftUpperArm',
        landmarks,
        confidences,
        torso,
      );
      expect(result).toBeNull();
    });

    it('handles limb pointing toward camera (fallback basis)', () => {
      // Limb pointing along Z (same direction as torso.forward)
      const forwardLimb = makeLandmarks({
        11: vec3(0, 0, 0),
        13: vec3(0, 0, 0.5),
      });
      const confidences = makeConfidences(0.9);
      const result = computeSegmentTransform(
        'leftUpperArm',
        forwardLimb,
        confidences,
        torso,
      );

      expect(result).not.toBeNull();
      // Basis should still be orthogonal (used fallback reference)
      expect(dot(result!.basis.right, result!.basis.up)).toBeCloseTo(0, 4);
      expect(len(result!.basis.right)).toBeCloseTo(1, 4);
    });
  });

  describe('computeHandTransform', () => {
    const landmarks = makeLandmarks({
      15: vec3(-0.5, -0.1, 0), // left wrist
      19: vec3(-0.6, -0.2, 0), // left finger tip
    });

    it('computes hand transform', () => {
      const confidences = makeConfidences(0.9);
      const result = computeHandTransform(
        'leftHand',
        landmarks,
        confidences,
        torso,
      );

      expect(result).not.toBeNull();
      if (!result) return;

      // Width should be torso.width * 0.18
      expect(result.width).toBeCloseTo(0.6 * 0.18);
      expect(result.height).toBeGreaterThan(0);
    });

    it('returns null for unknown hand', () => {
      const result = computeHandTransform(
        'leftUpperArm',
        landmarks,
        makeConfidences(),
        torso,
      );
      expect(result).toBeNull();
    });
  });

  describe('computeFootTransform', () => {
    const landmarks = makeLandmarks({
      27: vec3(-0.2, -0.7, 0), // left ankle
      31: vec3(-0.25, -0.8, 0.05), // left foot index
    });

    it('computes foot transform with length multiplier', () => {
      const confidences = makeConfidences(0.9);
      const result = computeFootTransform(
        'leftFoot',
        landmarks,
        confidences,
        torso,
      );

      expect(result).not.toBeNull();
      if (!result) return;

      // Raw distance
      const rawDist = Math.sqrt(0.0025 + 0.01 + 0.0025);
      // Height should be raw * 1.3 (FOOT_LENGTH_MULTIPLIER)
      expect(result.height).toBeCloseTo(rawDist * 1.3, 2);

      // Width should be torso.width * 0.2
      expect(result.width).toBeCloseTo(0.6 * 0.2);
    });
  });

  describe('computeAllPartTransforms', () => {
    it('returns transforms for all parts when landmarks are present', () => {
      const landmarks = makeLandmarks({
        0: vec3(0, 0.6, 0),
        7: vec3(-0.1, 0.5, 0),
        8: vec3(0.1, 0.5, 0),
        11: vec3(-0.3, 0.3, 0),
        12: vec3(0.3, 0.3, 0),
        13: vec3(-0.5, 0.0, 0),
        14: vec3(0.5, 0.0, 0),
        15: vec3(-0.6, -0.2, 0),
        16: vec3(0.6, -0.2, 0),
        19: vec3(-0.65, -0.3, 0),
        20: vec3(0.65, -0.3, 0),
        23: vec3(-0.2, -0.3, 0),
        24: vec3(0.2, -0.3, 0),
        25: vec3(-0.2, -0.5, 0),
        26: vec3(0.2, -0.5, 0),
        27: vec3(-0.2, -0.7, 0),
        28: vec3(0.2, -0.7, 0),
        31: vec3(-0.25, -0.8, 0),
        32: vec3(0.25, -0.8, 0),
      });

      const confidences = makeConfidences(0.9);
      const result = computeAllPartTransforms(landmarks, confidences, torso);

      // Should have all 13 non-torso parts
      expect(result.head).not.toBeNull();
      expect(result.leftUpperArm).not.toBeNull();
      expect(result.rightUpperArm).not.toBeNull();
      expect(result.leftLowerArm).not.toBeNull();
      expect(result.rightLowerArm).not.toBeNull();
      expect(result.leftHand).not.toBeNull();
      expect(result.rightHand).not.toBeNull();
      expect(result.leftUpperLeg).not.toBeNull();
      expect(result.rightUpperLeg).not.toBeNull();
      expect(result.leftLowerLeg).not.toBeNull();
      expect(result.rightLowerLeg).not.toBeNull();
      expect(result.leftFoot).not.toBeNull();
      expect(result.rightFoot).not.toBeNull();
    });

    it('returns null for parts with zero-length segments', () => {
      // All landmarks at origin → zero-length segments
      const landmarks = makeLandmarks({});
      const confidences = makeConfidences(0.9);
      const result = computeAllPartTransforms(landmarks, confidences, torso);

      // Segments at origin have zero length → null
      expect(result.leftUpperArm).toBeNull();
    });
  });
});
