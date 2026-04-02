/**
 * 3D Pipeline – Coordinate System
 *
 * Converts MediaPipe Pose Landmarker normalized landmarks into
 * scene-space 3D coordinates suitable for Three.js rendering.
 *
 * MediaPipe: x ∈ [0,1] left→right, y ∈ [0,1] top→bottom,
 *            z ∈ (negative = toward camera, relative to hip midpoint)
 *
 * Scene:     X = right, Y = up, Z = toward camera (right-handed)
 */

import type { Keypoint, LandmarkFrame } from '@/lib/types';
import type { SceneConfig, Vec3 } from './types';

// ── Defaults ───────────────────────────────────────────────────────────────

export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  sceneWidth: 2.0,
  sceneHeight: 2.0,
  depthScale: 0.5,
};

// ── Single Landmark ────────────────────────────────────────────────────────

/**
 * Convert one normalized MediaPipe keypoint to scene coordinates.
 *
 *   sceneX =  (x − 0.5) × sceneWidth
 *   sceneY = −(y − 0.5) × sceneHeight   (flip Y)
 *   sceneZ = −z × depthScale             (flip Z)
 */
export function landmarkToScene(kp: Keypoint, config: SceneConfig): Vec3 {
  return {
    x: (kp.x - 0.5) * config.sceneWidth,
    y: -(kp.y - 0.5) * config.sceneHeight,
    z: -(kp.z ?? 0) * config.depthScale,
  };
}

// ── Full Frame ─────────────────────────────────────────────────────────────

/**
 * Convert an entire landmark frame (33 keypoints) to scene coordinates.
 * Preserves array index correspondence (index 11 → landmarks3D[11]).
 */
export function frameTo3D(
  frame: LandmarkFrame,
  config: SceneConfig = DEFAULT_SCENE_CONFIG,
): Vec3[] {
  return frame.map((kp) => landmarkToScene(kp, config));
}

/**
 * Extract confidence scores from a landmark frame.
 * Returns an array parallel to the frame (index-aligned).
 * Missing scores default to 0.
 */
export function frameConfidences(frame: LandmarkFrame): number[] {
  return frame.map((kp) => kp.score ?? 0);
}
