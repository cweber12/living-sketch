// Landmark descriptors – MoveNet keypoint indices
// Migrated from drawing-app/constants/descriptors/landmarkDescriptors.js

export const KEYPOINT_NAMES = [
  'nose', // 0
  'left_eye', // 1
  'right_eye', // 2
  'left_ear', // 3
  'right_ear', // 4
  'left_shoulder', // 5
  'right_shoulder', // 6
  'left_elbow', // 7
  'right_elbow', // 8
  'left_wrist', // 9
  'right_wrist', // 10
  'left_hip', // 11
  'right_hip', // 12
  'left_knee', // 13
  'right_knee', // 14
  'left_ankle', // 15
  'right_ankle', // 16
  'left_foot', // 17 (estimated)
  'right_foot', // 18 (estimated)
] as const;

export const CONNECTED_KEYPOINTS: [number, number][] = [
  [5, 6], // shoulders
  [5, 7], // left shoulder → elbow
  [7, 9], // left elbow → wrist
  [6, 8], // right shoulder → elbow
  [8, 10], // right elbow → wrist
  [5, 11], // left shoulder → hip
  [6, 12], // right shoulder → hip
  [11, 12], // hips
  [11, 13], // left hip → knee
  [13, 15], // left knee → ankle
  [12, 14], // right hip → knee
  [14, 16], // right knee → ankle
  [15, 17], // left ankle → foot
  [16, 18], // right ankle → foot
];
