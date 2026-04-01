// Types – Pose Detection
// MediaPipe Pose Landmarker outputs 33 landmarks with x, y, z, visibility

export interface Keypoint {
  x: number;
  y: number;
  z?: number;
  score?: number; // visibility (0–1)
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

/** Fully-computed head placement anchor — derived from shoulders, hips, ears, and nose. */
export interface HeadAnchor {
  /** Bottom-center of the head SVG; maps to the shoulder midpoint. */
  base: PointAnchor;
  /** Torso right unit vector (left shoulder → right shoulder direction). */
  right: PointAnchor;
  /** Torso up unit vector (hip midpoint → shoulder midpoint direction). */
  up: PointAnchor;
  /** Smoothed ear-to-ear distance in screen pixels (head width reference). */
  earWidth: number;
  /** Distance from nose to shoulder midpoint in screen pixels (head height reference). */
  noseToShoulderDist: number;
}

export type PartAnchors = QuadAnchor | SegmentAnchor | HeadAnchor;

export interface AnchorsMap {
  torso?: QuadAnchor;
  head?: HeadAnchor;
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
