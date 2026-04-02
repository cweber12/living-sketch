/**
 * 3D Pipeline – Core Types
 *
 * Type definitions for 3D body-part transforms, coordinate systems,
 * and scene configuration. Used throughout lib/3d/.
 */

// ── Vectors & Basis ────────────────────────────────────────────────────────

/** 3D vector / point. */
export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * Orthonormal basis (right-handed).
 * Defines orientation as three perpendicular unit vectors.
 */
export interface Basis3 {
  /** Local X axis – points right relative to the body part. */
  readonly right: Vec3;
  /** Local Y axis – points up (or along the limb direction). */
  readonly up: Vec3;
  /** Local Z axis – points toward the camera (plane normal). */
  readonly forward: Vec3;
}

// ── Transforms ─────────────────────────────────────────────────────────────

/** Full 3D transform for a single body part. */
export interface PartTransform3D {
  /** World-space center position. */
  readonly position: Vec3;
  /** Orientation basis. */
  readonly basis: Basis3;
  /** Visual width in scene units. */
  readonly width: number;
  /** Visual height in scene units. */
  readonly height: number;
  /** Minimum landmark confidence that produced this transform (0–1). */
  readonly confidence: number;
}

/** All 14 body-part transforms for one frame. */
export interface BodyTransforms {
  readonly torso: PartTransform3D | null;
  readonly head: PartTransform3D | null;
  readonly leftUpperArm: PartTransform3D | null;
  readonly leftLowerArm: PartTransform3D | null;
  readonly leftHand: PartTransform3D | null;
  readonly rightUpperArm: PartTransform3D | null;
  readonly rightLowerArm: PartTransform3D | null;
  readonly rightHand: PartTransform3D | null;
  readonly leftUpperLeg: PartTransform3D | null;
  readonly leftLowerLeg: PartTransform3D | null;
  readonly leftFoot: PartTransform3D | null;
  readonly rightUpperLeg: PartTransform3D | null;
  readonly rightLowerLeg: PartTransform3D | null;
  readonly rightFoot: PartTransform3D | null;
  /** true when the character faces the camera. */
  readonly isFront: boolean;
}

/** Names of every body part (keys of BodyTransforms minus isFront). */
export type BodyPartKey =
  | 'torso'
  | 'head'
  | 'leftUpperArm'
  | 'leftLowerArm'
  | 'leftHand'
  | 'rightUpperArm'
  | 'rightLowerArm'
  | 'rightHand'
  | 'leftUpperLeg'
  | 'leftLowerLeg'
  | 'leftFoot'
  | 'rightUpperLeg'
  | 'rightLowerLeg'
  | 'rightFoot';

// ── Scene Config ───────────────────────────────────────────────────────────

/** Configuration for the landmark → scene coordinate mapping. */
export interface SceneConfig {
  /** Scene width in world units (default 2). */
  readonly sceneWidth: number;
  /** Scene height in world units (default 2). */
  readonly sceneHeight: number;
  /** Multiplier applied to landmark z (default 0.5). */
  readonly depthScale: number;
}

// ── Hierarchy ──────────────────────────────────────────────────────────────

/** A node in the body-part tree. */
export interface HierarchyNode {
  readonly part: BodyPartKey;
  readonly parent: BodyPartKey | null;
  readonly children: readonly BodyPartKey[];
  /** Hierarchy depth (0 = torso root). */
  readonly depth: number;
}

// ── SVG Plane Mapping ──────────────────────────────────────────────────────

/** How an SVG is anchored within its part's 3D plane. */
export type AnchorOrigin = 'center' | 'top-center' | 'bottom-center';

/** Per-part plane attachment rules. */
export interface PlaneMapping {
  readonly anchor: AnchorOrigin;
  /** Additional local offset in part-local coordinates. */
  readonly localOffset: Vec3;
  /** Z-offset to prevent z-fighting (scene units). */
  readonly zOffset: number;
  /** Render order (lower = rendered first / behind). */
  readonly renderOrder: number;
}

// ── Smoother State ─────────────────────────────────────────────────────────

/** Per-part state held by the temporal smoother. */
export interface SmootherState {
  prev: PartTransform3D | null;
  staleCount: number;
  isRecovering: boolean;
}
