/**
 * 3D Pipeline – Torso Reference Frame
 *
 * Computes the torso as the master 3D reference frame for the character.
 * Uses left/right shoulders and hips to define position, orientation,
 * width, and height. All other body parts reference this frame for
 * plane orientation stability.
 */

import type { Vec3, Basis3, PartTransform3D } from './types';
import {
  sub,
  midpoint,
  dist,
  normalize,
  cross,
  dot,
  negate,
  isNearZero,
} from './math';

// ── Landmark Indices ───────────────────────────────────────────────────────

const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_HIP = 23;
const R_HIP = 24;

// ── Confidence Threshold ───────────────────────────────────────────────────

const MIN_CONFIDENCE = 0.3;

// ── Core Computation ───────────────────────────────────────────────────────

/**
 * Compute the torso reference frame from 3D landmarks.
 *
 * @param landmarks3D  - Scene-space positions (from `frameTo3D`)
 * @param confidences  - Per-landmark confidence scores (parallel array)
 * @param prevForward  - Previous frame's forward vector (for sign-flip prevention).
 *                       Pass `null` on the first frame.
 * @returns The torso `PartTransform3D`, or `null` if any required landmark
 *          is below the confidence threshold.
 */
export function computeTorsoFrame(
  landmarks3D: Vec3[],
  confidences: number[],
  prevForward: Vec3 | null,
): PartTransform3D | null {
  // ── Validate confidence ────────────────────────────────────────────────
  const scores = [
    confidences[L_SHOULDER],
    confidences[R_SHOULDER],
    confidences[L_HIP],
    confidences[R_HIP],
  ];
  const minScore = Math.min(...scores);
  if (minScore < MIN_CONFIDENCE) return null;

  // ── Read landmarks ─────────────────────────────────────────────────────
  const lShoulder = landmarks3D[L_SHOULDER];
  const rShoulder = landmarks3D[R_SHOULDER];
  const lHip = landmarks3D[L_HIP];
  const rHip = landmarks3D[R_HIP];

  // ── Midpoints and center ───────────────────────────────────────────────
  const shoulderMid = midpoint(lShoulder, rShoulder);
  const hipMid = midpoint(lHip, rHip);
  const center = midpoint(shoulderMid, hipMid);

  // ── Dimensions ─────────────────────────────────────────────────────────
  const width = dist(lShoulder, rShoulder);
  const height = dist(shoulderMid, hipMid);

  // ── Basis vectors ──────────────────────────────────────────────────────
  const rawUp = sub(shoulderMid, hipMid);
  const rawRight = sub(rShoulder, lShoulder);

  // Forward = perpendicular to the torso plane
  let forward = cross(rawRight, rawUp);

  // Edge-on guard: if torso plane is nearly degenerate, reuse previous
  if (isNearZero(forward)) {
    if (prevForward) {
      forward = prevForward;
    } else {
      // No previous reference; assume facing camera
      forward = { x: 0, y: 0, z: 1 };
    }
  }

  forward = normalize(forward);

  // Sign-flip protection: keep forward direction consistent with prev frame
  if (prevForward && dot(forward, prevForward) < 0) {
    forward = negate(forward);
  }

  const up = normalize(rawUp);
  // Re-orthogonalize right from up × forward
  const right = normalize(cross(up, forward));

  const basis: Basis3 = { right, up, forward };

  return { position: center, basis, width, height, confidence: minScore };
}

// ── Facing Detection ───────────────────────────────────────────────────────

/**
 * Determine whether the character is facing the camera.
 * Based on the torso forward vector's z-component:
 * positive z = facing camera (front), negative = facing away (back).
 */
export function isFrontFacing(torsoForward: Vec3): boolean {
  return torsoForward.z >= 0;
}

// ── Accessors ──────────────────────────────────────────────────────────────

/**
 * Extract shoulder midpoint from landmarks.
 * Used by head transform for neck positioning.
 */
export function getShoulderMidpoint(landmarks3D: Vec3[]): Vec3 {
  return midpoint(landmarks3D[L_SHOULDER], landmarks3D[R_SHOULDER]);
}

/**
 * Compute the raw torso width (shoulder span) without a full frame.
 * Used for limb/extremity width ratios.
 */
export function getTorsoWidth(landmarks3D: Vec3[]): number {
  return dist(landmarks3D[L_SHOULDER], landmarks3D[R_SHOULDER]);
}
