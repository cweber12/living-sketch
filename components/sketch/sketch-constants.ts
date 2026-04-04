// Sketch page layout constants – shared between the page and sketch sub-components
import type { BodyPartName } from '@/hooks/use-sketch-canvas-rig';

export const GRID_ARMS_UP = `
  ".     .     .     head  head  .     .     ."
  "rhand rlarm ruarm torso torso luarm llarm lhand"
  ".     .     .     torso torso .     .     ."
  ".     .     .     rulg  lulg  .     .     ."
  ".     .     .     rllg  lllg  .     .     ."
  ".     .     .     rfoot lfoot .     .     ."
`;

export const GRID_ARMS_DOWN = `
  ".     head  head  ."
  "ruarm torso torso luarm"
  "rlarm torso torso llarm"
  "rhand rulg  lulg  lhand"
  ".     rllg  lllg  ."
  ".     rfoot lfoot ."
`;

// Grid areas: left body parts on screen-right, right on screen-left
// (matches anatomical anterior view / camera mirror)
export const GRID_AREA: Record<BodyPartName, string> = {
  head: 'head',
  torso: 'torso',
  leftUpperArm: 'luarm',
  leftLowerArm: 'llarm',
  leftHand: 'lhand',
  rightUpperArm: 'ruarm',
  rightLowerArm: 'rlarm',
  rightHand: 'rhand',
  leftUpperLeg: 'lulg',
  leftLowerLeg: 'lllg',
  leftFoot: 'lfoot',
  rightUpperLeg: 'rulg',
  rightLowerLeg: 'rllg',
  rightFoot: 'rfoot',
};

export const PART_LABEL: Record<BodyPartName, string> = {
  head: 'Head',
  torso: 'Torso',
  leftUpperArm: 'L Upper Arm',
  leftLowerArm: 'L Lower Arm',
  leftHand: 'L Hand',
  rightUpperArm: 'R Upper Arm',
  rightLowerArm: 'R Lower Arm',
  rightHand: 'R Hand',
  leftUpperLeg: 'L Upper Leg',
  leftLowerLeg: 'L Lower Leg',
  leftFoot: 'L Foot',
  rightUpperLeg: 'R Upper Leg',
  rightLowerLeg: 'R Lower Leg',
  rightFoot: 'R Foot',
};

export const PART_PROPORTIONS: Record<BodyPartName, { w: number; h: number }> =
  {
    head: { w: 1, h: 1 },
    torso: { w: 2.3, h: 2.6 },
    leftUpperArm: { w: 1.15, h: 1.3 },
    leftLowerArm: { w: 1.15, h: 1.3 },
    leftHand: { w: 1, h: 1.75 },
    rightUpperArm: { w: 1.15, h: 1.3 },
    rightLowerArm: { w: 1.15, h: 1.3 },
    rightHand: { w: 1, h: 1.75 },
    leftUpperLeg: { w: 1.15, h: 1.75 },
    leftLowerLeg: { w: 1.15, h: 1.6 },
    leftFoot: { w: 1.15, h: 1.6 },
    rightUpperLeg: { w: 1.15, h: 1.75 },
    rightLowerLeg: { w: 1.15, h: 1.6 },
    rightFoot: { w: 1.15, h: 1.6 },
  };

export const PARTS_ORDER: BodyPartName[] = [
  'head',
  'torso',
  'leftUpperArm',
  'rightUpperArm',
  'leftLowerArm',
  'rightLowerArm',
  'leftHand',
  'rightHand',
  'leftUpperLeg',
  'rightUpperLeg',
  'leftLowerLeg',
  'rightLowerLeg',
  'leftFoot',
  'rightFoot',
];
