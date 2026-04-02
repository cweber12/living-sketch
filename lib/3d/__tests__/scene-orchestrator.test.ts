import type { Keypoint } from '@/lib/types';
import { SceneOrchestrator } from '../scene-orchestrator';

/**
 * Build a 33-keypoint frame with standard upright pose.
 * All scores default to 0.9 for high confidence.
 */
function makeUprightFrame(): Keypoint[] {
  const frame: Keypoint[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    score: 0.9,
  }));

  // Set standard upright pose in normalized MediaPipe coords
  // Nose
  frame[0] = { x: 0.5, y: 0.2, z: 0, score: 0.9 };
  // Left ear
  frame[7] = { x: 0.45, y: 0.22, z: 0, score: 0.9 };
  // Right ear
  frame[8] = { x: 0.55, y: 0.22, z: 0, score: 0.9 };
  // Left shoulder
  frame[11] = { x: 0.35, y: 0.35, z: 0, score: 0.9 };
  // Right shoulder
  frame[12] = { x: 0.65, y: 0.35, z: 0, score: 0.9 };
  // Left elbow
  frame[13] = { x: 0.25, y: 0.5, z: 0, score: 0.9 };
  // Right elbow
  frame[14] = { x: 0.75, y: 0.5, z: 0, score: 0.9 };
  // Left wrist
  frame[15] = { x: 0.2, y: 0.65, z: 0, score: 0.9 };
  // Right wrist
  frame[16] = { x: 0.8, y: 0.65, z: 0, score: 0.9 };
  // Left index finger
  frame[19] = { x: 0.18, y: 0.72, z: 0, score: 0.9 };
  // Right index finger
  frame[20] = { x: 0.82, y: 0.72, z: 0, score: 0.9 };
  // Left hip
  frame[23] = { x: 0.4, y: 0.65, z: 0, score: 0.9 };
  // Right hip
  frame[24] = { x: 0.6, y: 0.65, z: 0, score: 0.9 };
  // Left knee
  frame[25] = { x: 0.38, y: 0.8, z: 0, score: 0.9 };
  // Right knee
  frame[26] = { x: 0.62, y: 0.8, z: 0, score: 0.9 };
  // Left ankle
  frame[27] = { x: 0.37, y: 0.95, z: 0, score: 0.9 };
  // Right ankle
  frame[28] = { x: 0.63, y: 0.95, z: 0, score: 0.9 };
  // Left foot index
  frame[31] = { x: 0.35, y: 0.98, z: 0.02, score: 0.9 };
  // Right foot index
  frame[32] = { x: 0.65, y: 0.98, z: 0.02, score: 0.9 };

  return frame;
}

describe('SceneOrchestrator', () => {
  it('processes a standard upright frame', () => {
    const orch = new SceneOrchestrator();
    const frame = makeUprightFrame();
    const result = orch.processFrame(frame);

    expect(result).not.toBeNull();
    if (!result) return;

    // Torso should be present
    expect(result.torso).not.toBeNull();
    expect(result.torso!.width).toBeGreaterThan(0);
    expect(result.torso!.height).toBeGreaterThan(0);

    // Head
    expect(result.head).not.toBeNull();

    // All limbs
    expect(result.leftUpperArm).not.toBeNull();
    expect(result.rightUpperArm).not.toBeNull();
    expect(result.leftLowerArm).not.toBeNull();
    expect(result.rightLowerArm).not.toBeNull();
    expect(result.leftUpperLeg).not.toBeNull();
    expect(result.rightUpperLeg).not.toBeNull();
    expect(result.leftLowerLeg).not.toBeNull();
    expect(result.rightLowerLeg).not.toBeNull();

    // Hands and feet
    expect(result.leftHand).not.toBeNull();
    expect(result.rightHand).not.toBeNull();
    expect(result.leftFoot).not.toBeNull();
    expect(result.rightFoot).not.toBeNull();

    // Should be front-facing
    expect(result.isFront).toBe(true);
  });

  it('returns null when all landmarks have zero confidence', () => {
    const orch = new SceneOrchestrator();
    const frame = makeUprightFrame().map((kp) => ({ ...kp, score: 0 }));
    const result = orch.processFrame(frame);
    expect(result).toBeNull();
  });

  it('processes multiple frames with temporal smoothing', () => {
    const orch = new SceneOrchestrator();
    const frame1 = makeUprightFrame();

    const result1 = orch.processFrame(frame1);
    expect(result1).not.toBeNull();
    const torso1X = result1!.torso!.position.x;

    // Shift the whole pose slightly right
    const frame2 = makeUprightFrame().map((kp) => ({
      ...kp,
      x: kp.x + 0.05,
    }));
    const result2 = orch.processFrame(frame2);
    expect(result2).not.toBeNull();

    // Smoothed position should be between frame1 and frame2
    const torso2X = result2!.torso!.position.x;
    // frame1 center x: ~0 (centered), frame2 center x: ~0.1 (shifted)
    // smoothed should be > frame1 but < frame2
    expect(torso2X).toBeGreaterThan(torso1X);
  });

  it('reset clears internal state', () => {
    const orch = new SceneOrchestrator();
    const frame = makeUprightFrame();

    orch.processFrame(frame);
    orch.reset();

    // After reset, next frame should be passed through without blending
    const result = orch.processFrame(frame);
    expect(result).not.toBeNull();
  });

  it('setConfig changes coordinate conversion', () => {
    const orch = new SceneOrchestrator();
    const frame = makeUprightFrame();

    const result1 = orch.processFrame(frame);
    orch.reset();

    // Double the scene size
    orch.setConfig({ sceneWidth: 4.0, sceneHeight: 4.0, depthScale: 0.5 });
    const result2 = orch.processFrame(frame);

    // Torso should be wider with the larger scene
    expect(result2!.torso!.width).toBeGreaterThan(result1!.torso!.width);
  });

  it('correctly identifies front-facing', () => {
    const orch = new SceneOrchestrator();
    const frame = makeUprightFrame();
    const result = orch.processFrame(frame);

    // Standard upright pose facing camera should be front
    expect(result!.isFront).toBe(true);
  });
});
