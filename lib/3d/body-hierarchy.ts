/**
 * 3D Pipeline – Body Part Hierarchy
 *
 * Defines the parent-child tree for all 14 body parts.
 * Used for render ordering, confidence fallback propagation,
 * and future local-transform computation.
 */

import type { BodyPartKey, HierarchyNode } from './types';

// ── Tree Definition ────────────────────────────────────────────────────────

/** Complete body hierarchy as a flat lookup table. */
export const BODY_HIERARCHY: Readonly<Record<BodyPartKey, HierarchyNode>> = {
  torso: {
    part: 'torso',
    parent: null,
    children: [
      'head',
      'leftUpperArm',
      'rightUpperArm',
      'leftUpperLeg',
      'rightUpperLeg',
    ],
    depth: 0,
  },
  head: {
    part: 'head',
    parent: 'torso',
    children: [],
    depth: 1,
  },
  leftUpperArm: {
    part: 'leftUpperArm',
    parent: 'torso',
    children: ['leftLowerArm'],
    depth: 1,
  },
  leftLowerArm: {
    part: 'leftLowerArm',
    parent: 'leftUpperArm',
    children: ['leftHand'],
    depth: 2,
  },
  leftHand: {
    part: 'leftHand',
    parent: 'leftLowerArm',
    children: [],
    depth: 3,
  },
  rightUpperArm: {
    part: 'rightUpperArm',
    parent: 'torso',
    children: ['rightLowerArm'],
    depth: 1,
  },
  rightLowerArm: {
    part: 'rightLowerArm',
    parent: 'rightUpperArm',
    children: ['rightHand'],
    depth: 2,
  },
  rightHand: {
    part: 'rightHand',
    parent: 'rightLowerArm',
    children: [],
    depth: 3,
  },
  leftUpperLeg: {
    part: 'leftUpperLeg',
    parent: 'torso',
    children: ['leftLowerLeg'],
    depth: 1,
  },
  leftLowerLeg: {
    part: 'leftLowerLeg',
    parent: 'leftUpperLeg',
    children: ['leftFoot'],
    depth: 2,
  },
  leftFoot: {
    part: 'leftFoot',
    parent: 'leftLowerLeg',
    children: [],
    depth: 3,
  },
  rightUpperLeg: {
    part: 'rightUpperLeg',
    parent: 'torso',
    children: ['rightLowerLeg'],
    depth: 1,
  },
  rightLowerLeg: {
    part: 'rightLowerLeg',
    parent: 'rightUpperLeg',
    children: ['rightFoot'],
    depth: 2,
  },
  rightFoot: {
    part: 'rightFoot',
    parent: 'rightLowerLeg',
    children: [],
    depth: 3,
  },
};

// ── Traversal ──────────────────────────────────────────────────────────────

/**
 * Breadth-first traversal order starting from torso.
 * Useful for rendering (parent before child) or propagating transforms.
 */
export const HIERARCHY_BFS_ORDER: readonly BodyPartKey[] = [
  'torso',
  'head',
  'leftUpperArm',
  'rightUpperArm',
  'leftUpperLeg',
  'rightUpperLeg',
  'leftLowerArm',
  'rightLowerArm',
  'leftLowerLeg',
  'rightLowerLeg',
  'leftHand',
  'rightHand',
  'leftFoot',
  'rightFoot',
];

/**
 * Reverse BFS order (leaves first → root last).
 * Useful for back-facing render order (limbs behind torso).
 */
export const HIERARCHY_REVERSE_ORDER: readonly BodyPartKey[] = [
  ...HIERARCHY_BFS_ORDER,
].reverse();

/** All 14 body part keys. */
export const ALL_PARTS: readonly BodyPartKey[] = HIERARCHY_BFS_ORDER;
