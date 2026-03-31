// Landmark descriptors – MediaPipe Pose Landmarker keypoint indices
// https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker

export const KEYPOINT_NAMES = [
  'nose', // 0
  'left_eye_inner', // 1
  'left_eye', // 2
  'left_eye_outer', // 3
  'right_eye_inner', // 4
  'right_eye', // 5
  'right_eye_outer', // 6
  'left_ear', // 7
  'right_ear', // 8
  'mouth_left', // 9
  'mouth_right', // 10
  'left_shoulder', // 11
  'right_shoulder', // 12
  'left_elbow', // 13
  'right_elbow', // 14
  'left_wrist', // 15
  'right_wrist', // 16
  'left_pinky', // 17
  'right_pinky', // 18
  'left_index', // 19
  'right_index', // 20
  'left_thumb', // 21
  'right_thumb', // 22
  'left_hip', // 23
  'right_hip', // 24
  'left_knee', // 25
  'right_knee', // 26
  'left_ankle', // 27
  'right_ankle', // 28
  'left_heel', // 29
  'right_heel', // 30
  'left_foot_index', // 31
  'right_foot_index', // 32
] as const;

export const CONNECTED_KEYPOINTS: [number, number][] = [
  [11, 12], // shoulders
  [11, 13], // left shoulder → elbow
  [13, 15], // left elbow → wrist
  [12, 14], // right shoulder → elbow
  [14, 16], // right elbow → wrist
  [11, 23], // left shoulder → hip
  [12, 24], // right shoulder → hip
  [23, 24], // hips
  [23, 25], // left hip → knee
  [25, 27], // left knee → ankle
  [24, 26], // right hip → knee
  [26, 28], // right knee → ankle
  [27, 31], // left ankle → foot index
  [28, 32], // right ankle → foot index
  [15, 19], // left wrist → index finger
  [16, 20], // right wrist → index finger
];
