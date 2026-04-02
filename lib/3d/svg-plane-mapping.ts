/**
 * 3D Pipeline – SVG Plane Mapping
 *
 * Defines how each SVG asset is anchored and offset within its
 * body part's 3D plane. Controls anchor origin, local offsets,
 * z-fighting prevention, and render ordering.
 */

import type { BodyPartKey, PlaneMapping } from './types';

// ── Zero Offset ────────────────────────────────────────────────────────────

const ZERO = { x: 0, y: 0, z: 0 } as const;

// ── Z-Offsets per Hierarchy Depth ──────────────────────────────────────────
// Small additive offsets in scene units to prevent z-fighting
// when coplanar parts overlap (e.g., arm crossing torso).

const Z_DEPTH_0 = 0.0; // torso
const Z_DEPTH_1 = 0.005; // head, upper arms, upper legs
const Z_DEPTH_2 = 0.01; // lower arms, lower legs
const Z_DEPTH_3 = 0.015; // hands, feet

// ── Render Orders ──────────────────────────────────────────────────────────
// Lower = rendered first (behind). Used for Three.js renderOrder property.

const RO_TORSO = 0;
const RO_DEPTH_1 = 1;
const RO_DEPTH_2 = 2;
const RO_DEPTH_3 = 3;

// ── Mapping Table ──────────────────────────────────────────────────────────

/**
 * Per-body-part SVG plane mapping rules.
 *
 * Anchor conventions:
 * - `center`: SVG centered on the transform position.
 * - `top-center`: Top edge of SVG at the "from" joint; extends downward.
 * - `bottom-center`: Bottom edge at the anchor point; extends upward (head).
 *
 * Local offsets shift the plane in part-local coordinates after anchoring.
 * Most parts use zero offset; head uses a positive Y offset to place the
 * SVG above the neck point.
 */
export const PLANE_MAPPINGS: Readonly<Record<BodyPartKey, PlaneMapping>> = {
  torso: {
    anchor: 'center',
    localOffset: ZERO,
    zOffset: Z_DEPTH_0,
    renderOrder: RO_TORSO,
  },
  head: {
    anchor: 'bottom-center',
    localOffset: ZERO, // position already computed with neck offset
    zOffset: Z_DEPTH_1,
    renderOrder: RO_DEPTH_1,
  },
  leftUpperArm: {
    anchor: 'top-center',
    localOffset: ZERO,
    zOffset: Z_DEPTH_1,
    renderOrder: RO_DEPTH_1,
  },
  rightUpperArm: {
    anchor: 'top-center',
    localOffset: ZERO,
    zOffset: Z_DEPTH_1,
    renderOrder: RO_DEPTH_1,
  },
  leftLowerArm: {
    anchor: 'top-center',
    localOffset: ZERO,
    zOffset: Z_DEPTH_2,
    renderOrder: RO_DEPTH_2,
  },
  rightLowerArm: {
    anchor: 'top-center',
    localOffset: ZERO,
    zOffset: Z_DEPTH_2,
    renderOrder: RO_DEPTH_2,
  },
  leftHand: {
    anchor: 'top-center',
    localOffset: ZERO,
    zOffset: Z_DEPTH_3,
    renderOrder: RO_DEPTH_3,
  },
  rightHand: {
    anchor: 'top-center',
    localOffset: ZERO,
    zOffset: Z_DEPTH_3,
    renderOrder: RO_DEPTH_3,
  },
  leftUpperLeg: {
    anchor: 'top-center',
    localOffset: ZERO,
    zOffset: Z_DEPTH_1,
    renderOrder: RO_DEPTH_1,
  },
  rightUpperLeg: {
    anchor: 'top-center',
    localOffset: ZERO,
    zOffset: Z_DEPTH_1,
    renderOrder: RO_DEPTH_1,
  },
  leftLowerLeg: {
    anchor: 'top-center',
    localOffset: ZERO,
    zOffset: Z_DEPTH_2,
    renderOrder: RO_DEPTH_2,
  },
  rightLowerLeg: {
    anchor: 'top-center',
    localOffset: ZERO,
    zOffset: Z_DEPTH_2,
    renderOrder: RO_DEPTH_2,
  },
  leftFoot: {
    anchor: 'top-center',
    localOffset: ZERO,
    zOffset: Z_DEPTH_3,
    renderOrder: RO_DEPTH_3,
  },
  rightFoot: {
    anchor: 'top-center',
    localOffset: ZERO,
    zOffset: Z_DEPTH_3,
    renderOrder: RO_DEPTH_3,
  },
};

// ── Anchor Offset Computation ──────────────────────────────────────────────

/**
 * Compute the Y-axis shift needed to convert from 'center' placement
 * to the part's anchor convention.
 *
 * - `center`: 0 (no shift)
 * - `top-center`: -height/2 (shift down so top edge lines up)
 * - `bottom-center`: +height/2 (shift up so bottom edge lines up)
 */
export function anchorYShift(
  anchor: PlaneMapping['anchor'],
  height: number,
): number {
  switch (anchor) {
    case 'top-center':
      return -height / 2;
    case 'bottom-center':
      return height / 2;
    case 'center':
    default:
      return 0;
  }
}
