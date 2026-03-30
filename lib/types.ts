// Types – Pose Detection
// Mirrors MoveNet 17 keypoints + 2 estimated feet (18-19)

export interface Keypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

export type LandmarkFrame = Keypoint[];

export interface Dimensions {
  width: number;
  height: number;
}

// Types – Anchors (computed from landmarks for SVG placement)

export interface PointAnchor {
  x: number;
  y: number;
}

export interface QuadAnchor {
  tl: PointAnchor;
  tr: PointAnchor;
  bl: PointAnchor;
  br: PointAnchor;
}

export interface SegmentAnchor {
  from: PointAnchor;
  to: PointAnchor;
}

export type PartAnchors = QuadAnchor | SegmentAnchor;

export interface AnchorsMap {
  torso?: QuadAnchor;
  head?: SegmentAnchor;
  leftUpperArm?: SegmentAnchor;
  leftLowerArm?: SegmentAnchor;
  leftHand?: SegmentAnchor;
  rightUpperArm?: SegmentAnchor;
  rightLowerArm?: SegmentAnchor;
  rightHand?: SegmentAnchor;
  leftUpperLeg?: SegmentAnchor;
  leftLowerLeg?: SegmentAnchor;
  leftFoot?: SegmentAnchor;
  rightUpperLeg?: SegmentAnchor;
  rightLowerLeg?: SegmentAnchor;
  rightFoot?: SegmentAnchor;
}

// Types – Shift & Scale factors

export interface ShiftVector {
  x: number;
  y: number;
}

export interface ScaleVector {
  x: number;
  y: number;
}

export interface ShiftFactors {
  torsoShift: ShiftVector;
  headShift: ShiftVector;
  shoulderShift: ShiftVector;
  elbowShift: ShiftVector;
  wristShift: ShiftVector;
  hipShift: ShiftVector;
  kneeShift: ShiftVector;
  ankleShift: ShiftVector;
  footShift: ShiftVector;
}

export interface ScaleFactors {
  headScale: ScaleVector;
  armScale: ScaleVector;
  handScale: ScaleVector;
  legScale: ScaleVector;
  footScale: ScaleVector;
}

// Types – SVG data

export interface SvgParts {
  [partName: string]: string; // SVG string per body part
}

// Types – Capture view modes

export type CaptureViewMode = 'live' | 'replay' | 'select-video';

// Types – Storage

export interface StoredAnimation {
  timestamp: string;
  landmarks: LandmarkFrame[];
  svgs: SvgParts;
}

export interface FileEntry {
  key: string;
  name: string;
  source: 'cloud' | 'device';
}
