// Foot vector estimation from hip-knee-ankle keypoints
// TODO: Migrate from drawing-app/utils/calcFootVectors.js
//
// Functions to implement:
// - addFeetFromHipKneeVectors(landmarksArray, opts)
//   Estimate feet landmarks (17-18) since MoveNet doesn't provide them.
//   Algorithm: extrapolate ankle→foot from ankle→knee vector,
//   apply EMA smoothing, optional foreshortening.

export {};
