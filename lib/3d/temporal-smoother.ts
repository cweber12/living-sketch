/**
 * 3D Pipeline – Temporal Smoother
 *
 * Frame-to-frame EMA smoothing for body part transforms.
 * Reduces jitter, prevents sign flips, and handles low-confidence gaps.
 *
 * Usage:
 *   const smoother = new TemporalSmoother();
 *   const smoothed = smoother.smooth(rawTransforms);
 */

import type {
  PartTransform3D,
  BodyTransforms,
  BodyPartKey,
  SmootherState,
  Vec3,
  Basis3,
} from './types';
import { lerp, normalize, dot, negate, lerpScalar } from './math';
import { ALL_PARTS } from './body-hierarchy';

// ── Smoothing Parameters ───────────────────────────────────────────────────

/** EMA alpha for position (higher = more responsive). */
const ALPHA_POSITION = 0.4;

/** EMA alpha for basis vectors (lower = smoother orientation). */
const ALPHA_BASIS = 0.3;

/** EMA alpha for width/height (very smooth; proportions change slowly). */
const ALPHA_DIMENSIONS = 0.2;

/** Max frames to reuse a stale transform before hiding the part. */
const MAX_STALE_FRAMES = 10;

/** Number of frames to ramp alpha when recovering from stale state. */
const RECOVERY_FRAMES = 3;

/** Reduced alpha used during recovery ramp. */
const RECOVERY_ALPHA = 0.1;

// ── Helpers ────────────────────────────────────────────────────────────────

function smoothVec3(prev: Vec3, curr: Vec3, alpha: number): Vec3 {
  return lerp(prev, curr, alpha);
}

/**
 * Smooth a basis vector with sign-flip protection.
 * If the new vector points opposite to the previous one, negate before blending.
 */
function smoothBasisVec(prev: Vec3, curr: Vec3, alpha: number): Vec3 {
  const aligned = dot(prev, curr) < 0 ? negate(curr) : curr;
  return normalize(lerp(prev, aligned, alpha));
}

function smoothBasis(prev: Basis3, curr: Basis3, alpha: number): Basis3 {
  return {
    right: smoothBasisVec(prev.right, curr.right, alpha),
    up: smoothBasisVec(prev.up, curr.up, alpha),
    forward: smoothBasisVec(prev.forward, curr.forward, alpha),
  };
}

function smoothTransform(
  prev: PartTransform3D,
  curr: PartTransform3D,
  alpha: number,
): PartTransform3D {
  // During recovery, use a lower alpha for gentler blending
  const posAlpha = alpha;
  const basisAlpha = Math.min(alpha, ALPHA_BASIS);
  const dimAlpha = Math.min(alpha, ALPHA_DIMENSIONS);

  return {
    position: smoothVec3(prev.position, curr.position, posAlpha),
    basis: smoothBasis(prev.basis, curr.basis, basisAlpha),
    width: lerpScalar(prev.width, curr.width, dimAlpha),
    height: lerpScalar(prev.height, curr.height, dimAlpha),
    confidence: curr.confidence,
  };
}

// ── Temporal Smoother Class ────────────────────────────────────────────────

export class TemporalSmoother {
  private state: Map<BodyPartKey, SmootherState> = new Map();

  constructor() {
    for (const part of ALL_PARTS) {
      this.state.set(part, {
        prev: null,
        staleCount: 0,
        isRecovering: false,
        recoverFrame: 0,
      });
    }
  }

  /** Reset all state (e.g., when switching animations). */
  reset(): void {
    for (const part of ALL_PARTS) {
      this.state.set(part, {
        prev: null,
        staleCount: 0,
        isRecovering: false,
        recoverFrame: 0,
      });
    }
  }

  /**
   * Smooth one frame of body transforms.
   *
   * For each body part:
   * - Valid current + previous → EMA blend
   * - Valid current, no previous → use current directly
   * - No current + recent previous → reuse previous (up to MAX_STALE_FRAMES)
   * - No current + stale previous → return null (hide the part)
   */
  smooth(raw: BodyTransforms): BodyTransforms {
    const result: Record<string, PartTransform3D | null> = {};

    for (const part of ALL_PARTS) {
      const s = this.state.get(part)!;
      const current = raw[part];

      if (current) {
        // Valid current transform
        if (s.prev) {
          // Determine effective alpha (reduced during recovery ramp)
          let alpha = ALPHA_POSITION;
          if (s.isRecovering) {
            const t = Math.min(s.recoverFrame / RECOVERY_FRAMES, 1);
            alpha = lerpScalar(RECOVERY_ALPHA, ALPHA_POSITION, t);
            s.recoverFrame++;
            if (s.recoverFrame >= RECOVERY_FRAMES) {
              s.isRecovering = false;
              s.recoverFrame = 0;
            }
          }

          const smoothed = smoothTransform(s.prev, current, alpha);
          s.prev = smoothed;
          s.staleCount = 0;
          result[part] = smoothed;
        } else {
          // First valid frame — use directly, no blending
          s.prev = current;
          s.staleCount = 0;
          s.isRecovering = false;
          s.recoverFrame = 0;
          result[part] = current;
        }
      } else {
        // No current transform
        if (s.prev && s.staleCount < MAX_STALE_FRAMES) {
          // Reuse previous
          s.staleCount++;
          result[part] = s.prev;
        } else {
          // Stale or never had a value
          s.prev = null;
          s.staleCount = 0;
          s.isRecovering = false;
          s.recoverFrame = 0;
          result[part] = null;
        }

        // Mark recovery so the next valid frame blends gently
        if (s.prev && !s.isRecovering) {
          s.isRecovering = true;
          s.recoverFrame = 0;
        }
      }
    }

    return {
      torso: result.torso ?? null,
      head: result.head ?? null,
      leftUpperArm: result.leftUpperArm ?? null,
      leftLowerArm: result.leftLowerArm ?? null,
      leftHand: result.leftHand ?? null,
      rightUpperArm: result.rightUpperArm ?? null,
      rightLowerArm: result.rightLowerArm ?? null,
      rightHand: result.rightHand ?? null,
      leftUpperLeg: result.leftUpperLeg ?? null,
      leftLowerLeg: result.leftLowerLeg ?? null,
      leftFoot: result.leftFoot ?? null,
      rightUpperLeg: result.rightUpperLeg ?? null,
      rightLowerLeg: result.rightLowerLeg ?? null,
      rightFoot: result.rightFoot ?? null,
      isFront: raw.isFront,
    };
  }
}
