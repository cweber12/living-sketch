/**
 * 3D Pipeline – Barrel Export
 */

// Types
export type {
  Vec3,
  Basis3,
  PartTransform3D,
  BodyTransforms,
  BodyPartKey,
  SceneConfig,
  HierarchyNode,
  AnchorOrigin,
  PlaneMapping,
  SmootherState,
} from './types';

// Math
export {
  vec3,
  ZERO,
  UNIT_X,
  UNIT_Y,
  UNIT_Z,
  add,
  sub,
  mul,
  negate,
  dot,
  cross,
  len,
  lenSq,
  dist,
  normalize,
  lerp,
  midpoint,
  projectOnPlane,
  lerpScalar,
  isNearZero,
} from './math';

// Coordinate system
export {
  DEFAULT_SCENE_CONFIG,
  landmarkToScene,
  frameTo3D,
  frameConfidences,
} from './coordinate-system';

// Torso
export {
  computeTorsoFrame,
  isFrontFacing,
  getShoulderMidpoint,
  getTorsoWidth,
} from './torso-frame';

// Part transforms
export {
  computeHeadTransform,
  computeSegmentTransform,
  computeHandTransform,
  computeFootTransform,
  computeAllPartTransforms,
} from './part-transforms';

// Hierarchy
export {
  BODY_HIERARCHY,
  HIERARCHY_BFS_ORDER,
  HIERARCHY_REVERSE_ORDER,
  ALL_PARTS,
} from './body-hierarchy';

// Temporal smoothing
export { TemporalSmoother } from './temporal-smoother';

// SVG plane mapping
export { PLANE_MAPPINGS, anchorYShift } from './svg-plane-mapping';

// Scene orchestrator
export { SceneOrchestrator } from './scene-orchestrator';
