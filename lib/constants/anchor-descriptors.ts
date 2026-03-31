// Anchor descriptors – maps body parts to MediaPipe Pose Landmarker keypoint indices
// https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker

export const ANCHOR_MAP = {
  torso: { topLeft: 11, topRight: 12, bottomLeft: 23, bottomRight: 24 },
  head: { leftAnchor: 2, rightAnchor: 5 },
  leftUpperArm: { start: 11, end: 13 },
  leftLowerArm: { start: 13, end: 15 },
  leftHand: { start: 15, end: 19 },
  rightUpperArm: { start: 12, end: 14 },
  rightLowerArm: { start: 14, end: 16 },
  rightHand: { start: 16, end: 20 },
  leftUpperLeg: { start: 23, end: 25 },
  leftLowerLeg: { start: 25, end: 27 },
  leftFoot: { ankle: 27, foot: 31 },
  rightUpperLeg: { start: 24, end: 26 },
  rightLowerLeg: { start: 26, end: 28 },
  rightFoot: { ankle: 28, foot: 32 },
} as const;

export const BODY_PARTS = Object.keys(
  ANCHOR_MAP,
) as (keyof typeof ANCHOR_MAP)[];
