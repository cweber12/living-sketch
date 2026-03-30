// Anchor descriptors – maps body parts to landmark keypoint indices
// Migrated from drawing-app/constants/descriptors/anchorDescriptors.js

export const ANCHOR_MAP = {
  torso: { topLeft: 5, topRight: 6, bottomLeft: 11, bottomRight: 12 },
  head: { leftAnchor: 3, rightAnchor: 4 },
  leftUpperArm: { start: 5, end: 7 },
  leftLowerArm: { start: 7, end: 9 },
  leftHand: { wrist: 9, elbow: 7 },
  rightUpperArm: { start: 6, end: 8 },
  rightLowerArm: { start: 8, end: 10 },
  rightHand: { wrist: 10, elbow: 8 },
  leftUpperLeg: { start: 11, end: 13 },
  leftLowerLeg: { start: 13, end: 15 },
  leftFoot: { ankle: 15, foot: 17 },
  rightUpperLeg: { start: 12, end: 14 },
  rightLowerLeg: { start: 14, end: 16 },
  rightFoot: { ankle: 16, foot: 18 },
} as const;

export const BODY_PARTS = Object.keys(
  ANCHOR_MAP,
) as (keyof typeof ANCHOR_MAP)[];
