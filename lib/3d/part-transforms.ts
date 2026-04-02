/**
 * 3D Pipeline – Body Part Transforms
 *
 * Computes 3D transforms for head, limbs, hands, and feet.
 * All transforms are in world space. The torso basis is used as a
 * reference for limb plane orientation (roll stability).
 */

import type { Vec3, Basis3, PartTransform3D } from './types';
import {
  sub,
  add,
  mul,
  midpoint,
  dist,
  normalize,
  cross,
  isNearZero,
} from './math';
import { getShoulderMidpoint } from './torso-frame';

// ── Constants ──────────────────────────────────────────────────────────────

const MIN_CONFIDENCE = 0.3;

// Head
const HEAD_HEIGHT_MULTIPLIER = 1.6;
const NECK_OFFSET_RATIO = 0.08;

// Limb width as fraction of torso width
const WIDTH_RATIOS: Record<string, number> = {
  leftUpperArm: 0.25,
  rightUpperArm: 0.25,
  leftLowerArm: 0.2,
  rightLowerArm: 0.2,
  leftUpperLeg: 0.3,
  rightUpperLeg: 0.3,
  leftLowerLeg: 0.22,
  rightLowerLeg: 0.22,
};

// Extremities
const HAND_WIDTH_RATIO = 0.18;
const FOOT_WIDTH_RATIO = 0.2;
const FOOT_LENGTH_MULTIPLIER = 1.3;

// ── Landmark Indices ───────────────────────────────────────────────────────

const L_EAR = 7;
const R_EAR = 8;
const NOSE = 0;

/** Segment definitions: [fromIndex, toIndex] for each limb part. */
const SEGMENT_INDICES: Record<string, [number, number]> = {
  leftUpperArm: [11, 13],
  leftLowerArm: [13, 15],
  rightUpperArm: [12, 14],
  rightLowerArm: [14, 16],
  leftUpperLeg: [23, 25],
  leftLowerLeg: [25, 27],
  rightUpperLeg: [24, 26],
  rightLowerLeg: [26, 28],
};

const HAND_INDICES: Record<string, [number, number]> = {
  leftHand: [15, 19],
  rightHand: [16, 20],
};

const FOOT_INDICES: Record<string, [number, number]> = {
  leftFoot: [27, 31],
  rightFoot: [28, 32],
};

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build an orientation basis for a segment defined by direction + reference normal.
 *
 * - `up` = direction along the segment (from → to)
 * - `forward` = plane normal (so the SVG faces the camera)
 * - `right` = perpendicular to both (cross-width axis)
 *
 * Uses `refForward` (typically torso.forward) as the preferred plane normal.
 * Falls back to `fallbackRef` when the segment is nearly parallel to refForward.
 */
function buildSegmentBasis(
  direction: Vec3,
  refForward: Vec3,
  fallbackRef: Vec3,
): Basis3 {
  // Try cross with refForward to get the right vector
  let right = cross(direction, refForward);

  // If segment is parallel to refForward, use fallback
  if (isNearZero(right)) {
    right = cross(direction, fallbackRef);
  }

  // Still degenerate → default to +X
  if (isNearZero(right)) {
    right = { x: 1, y: 0, z: 0 };
  }

  right = normalize(right);
  const forward = normalize(cross(right, direction));

  return { right, up: direction, forward };
}

/**
 * Check all given indices have confidence ≥ threshold.
 * Returns the minimum score if all pass, or -1 if any fails.
 */
function checkConfidence(confidences: number[], indices: number[]): number {
  let min = 1;
  for (const idx of indices) {
    const s = confidences[idx] ?? 0;
    if (s < MIN_CONFIDENCE) return -1;
    if (s < min) min = s;
  }
  return min;
}

// ── Head ───────────────────────────────────────────────────────────────────

/**
 * Compute the head transform.
 *
 * Width from ear-to-ear distance. Height from nose-to-shoulder × multiplier.
 * Position above the shoulder midpoint with a neck offset.
 * Orientation matches the torso plane.
 */
export function computeHeadTransform(
  landmarks3D: Vec3[],
  confidences: number[],
  torso: PartTransform3D,
): PartTransform3D | null {
  const conf = checkConfidence(confidences, [L_EAR, R_EAR, NOSE]);
  if (conf < 0) return null;

  const leftEar = landmarks3D[L_EAR];
  const rightEar = landmarks3D[R_EAR];
  const nose = landmarks3D[NOSE];
  const shoulderMid = getShoulderMidpoint(landmarks3D);

  const width = dist(leftEar, rightEar);
  const noseToShoulder = dist(nose, shoulderMid);
  const height = noseToShoulder * HEAD_HEIGHT_MULTIPLIER;

  // Position: shoulder midpoint + torso.up × (half head height + neck gap)
  const neckOffset = torso.height * NECK_OFFSET_RATIO;
  const position = add(
    shoulderMid,
    mul(torso.basis.up, height * 0.5 + neckOffset),
  );

  return {
    position,
    basis: torso.basis, // head plane aligned with torso
    width,
    height,
    confidence: Math.min(conf, torso.confidence),
  };
}

// ── Limb Segments ──────────────────────────────────────────────────────────

/**
 * Compute a limb segment transform.
 *
 * Applicable to upper/lower arms and legs. Width is a ratio of
 * torso width. Height equals segment length. Orientation uses the
 * torso forward as reference for roll stability.
 */
export function computeSegmentTransform(
  part: string,
  landmarks3D: Vec3[],
  confidences: number[],
  torso: PartTransform3D,
): PartTransform3D | null {
  const indices = SEGMENT_INDICES[part];
  if (!indices) return null;

  const [fromIdx, toIdx] = indices;
  const conf = checkConfidence(confidences, [fromIdx, toIdx]);
  if (conf < 0) return null;

  const from = landmarks3D[fromIdx];
  const to = landmarks3D[toIdx];
  const center = midpoint(from, to);
  const segmentLength = dist(from, to);

  if (segmentLength < 1e-6) return null;

  const direction = normalize(sub(to, from));
  const basis = buildSegmentBasis(
    direction,
    torso.basis.forward,
    torso.basis.right,
  );

  const widthRatio = WIDTH_RATIOS[part] ?? 0.25;

  return {
    position: center,
    basis,
    width: torso.width * widthRatio,
    height: segmentLength,
    confidence: Math.min(conf, torso.confidence),
  };
}

// ── Hands ──────────────────────────────────────────────────────────────────

/**
 * First-pass hand transform.
 *
 * Uses wrist → finger-tip direction. Width from torso proportion.
 * Approximate: ignores finger splay. Future versions could use
 * MediaPipe Hand Landmarker for detailed hand pose.
 */
export function computeHandTransform(
  part: string,
  landmarks3D: Vec3[],
  confidences: number[],
  torso: PartTransform3D,
): PartTransform3D | null {
  const indices = HAND_INDICES[part];
  if (!indices) return null;

  const [wristIdx, fingerIdx] = indices;
  const conf = checkConfidence(confidences, [wristIdx, fingerIdx]);
  if (conf < 0) return null;

  const wrist = landmarks3D[wristIdx];
  const finger = landmarks3D[fingerIdx];
  const segmentLength = dist(wrist, finger);

  if (segmentLength < 1e-6) return null;

  const center = midpoint(wrist, finger);
  const direction = normalize(sub(finger, wrist));
  const basis = buildSegmentBasis(
    direction,
    torso.basis.forward,
    torso.basis.right,
  );

  return {
    position: center,
    basis,
    width: torso.width * HAND_WIDTH_RATIO,
    height: segmentLength,
    confidence: Math.min(conf, torso.confidence),
  };
}

// ── Feet ───────────────────────────────────────────────────────────────────

/**
 * First-pass foot transform.
 *
 * Uses ankle → foot-index direction. Length is extended by a multiplier
 * since the ankle-to-toe landmark span underestimates visible foot size.
 * Future versions could use heel + toe landmarks for better foot plane.
 */
export function computeFootTransform(
  part: string,
  landmarks3D: Vec3[],
  confidences: number[],
  torso: PartTransform3D,
): PartTransform3D | null {
  const indices = FOOT_INDICES[part];
  if (!indices) return null;

  const [ankleIdx, footIdx] = indices;
  const conf = checkConfidence(confidences, [ankleIdx, footIdx]);
  if (conf < 0) return null;

  const ankle = landmarks3D[ankleIdx];
  const foot = landmarks3D[footIdx];
  const rawLength = dist(ankle, foot);

  if (rawLength < 1e-6) return null;

  const segmentLength = rawLength * FOOT_LENGTH_MULTIPLIER;
  const direction = normalize(sub(foot, ankle));

  // Extend center to account for the multiplied length
  const center = add(ankle, mul(direction, segmentLength * 0.5));

  const basis = buildSegmentBasis(
    direction,
    torso.basis.forward,
    torso.basis.right,
  );

  return {
    position: center,
    basis,
    width: torso.width * FOOT_WIDTH_RATIO,
    height: segmentLength,
    confidence: Math.min(conf, torso.confidence),
  };
}

// ── Convenience: Compute All Part Transforms ───────────────────────────────

const SEGMENT_PARTS = Object.keys(SEGMENT_INDICES);
const HAND_PARTS = Object.keys(HAND_INDICES);
const FOOT_PARTS = Object.keys(FOOT_INDICES);

/**
 * Compute transforms for all non-torso body parts given a torso frame.
 * Returns a record keyed by part name.
 */
export function computeAllPartTransforms(
  landmarks3D: Vec3[],
  confidences: number[],
  torso: PartTransform3D,
): Record<string, PartTransform3D | null> {
  const result: Record<string, PartTransform3D | null> = {};

  result.head = computeHeadTransform(landmarks3D, confidences, torso);

  for (const part of SEGMENT_PARTS) {
    result[part] = computeSegmentTransform(
      part,
      landmarks3D,
      confidences,
      torso,
    );
  }

  for (const part of HAND_PARTS) {
    result[part] = computeHandTransform(part, landmarks3D, confidences, torso);
  }

  for (const part of FOOT_PARTS) {
    result[part] = computeFootTransform(part, landmarks3D, confidences, torso);
  }

  return result;
}
