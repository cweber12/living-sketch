/**
 * 3D Pipeline – Scene Orchestrator
 *
 * Main entry point: takes a raw LandmarkFrame and outputs a
 * fully-resolved, smoothed BodyTransforms object ready for rendering.
 *
 * Usage:
 *   const orchestrator = new SceneOrchestrator(config);
 *   const transforms = orchestrator.processFrame(frame);
 */

import type { LandmarkFrame } from '@/lib/types';
import type {
  BodyTransforms,
  PartTransform3D,
  SceneConfig,
  Vec3,
} from './types';
import {
  frameTo3D,
  frameConfidences,
  DEFAULT_SCENE_CONFIG,
} from './coordinate-system';
import { computeTorsoFrame, isFrontFacing } from './torso-frame';
import { computeAllPartTransforms } from './part-transforms';
import { TemporalSmoother } from './temporal-smoother';

// ── Orchestrator ───────────────────────────────────────────────────────────

export class SceneOrchestrator {
  private config: SceneConfig;
  private smoother: TemporalSmoother;
  private prevTorsoForward: Vec3 | null = null;

  constructor(config: SceneConfig = DEFAULT_SCENE_CONFIG) {
    this.config = config;
    this.smoother = new TemporalSmoother();
  }

  /** Reset all internal state (e.g., when switching animations). */
  reset(): void {
    this.smoother.reset();
    this.prevTorsoForward = null;
  }

  /** Update the scene config (e.g., when depth scale changes). */
  setConfig(config: SceneConfig): void {
    this.config = config;
  }

  /**
   * Process one landmark frame into smoothed body transforms.
   *
   * Pipeline:
   *   1. Convert landmarks to 3D scene coordinates
   *   2. Extract confidence scores
   *   3. Compute torso reference frame
   *   4. Compute all body part transforms
   *   5. Apply temporal smoothing
   *   6. Return BodyTransforms
   *
   * Returns null if the torso cannot be computed (all parts hidden).
   */
  processFrame(frame: LandmarkFrame): BodyTransforms | null {
    // ── Step 1: Coordinate conversion ──────────────────────────────────
    const landmarks3D = frameTo3D(frame, this.config);
    const confidences = frameConfidences(frame);

    // ── Step 2: Torso reference frame ──────────────────────────────────
    const torso = computeTorsoFrame(
      landmarks3D,
      confidences,
      this.prevTorsoForward,
    );

    if (!torso) {
      // Cannot build any transforms without torso
      return null;
    }

    // Track torso forward for sign-flip prevention next frame
    this.prevTorsoForward = torso.basis.forward;

    // ── Step 3: Facing direction ───────────────────────────────────────
    const isFront = isFrontFacing(torso.basis.forward);

    // ── Step 4: All body part transforms ───────────────────────────────
    const parts = computeAllPartTransforms(landmarks3D, confidences, torso);

    // ── Step 5: Assemble raw BodyTransforms ────────────────────────────
    const raw: BodyTransforms = {
      torso,
      head: (parts.head as PartTransform3D) ?? null,
      leftUpperArm: (parts.leftUpperArm as PartTransform3D) ?? null,
      leftLowerArm: (parts.leftLowerArm as PartTransform3D) ?? null,
      leftHand: (parts.leftHand as PartTransform3D) ?? null,
      rightUpperArm: (parts.rightUpperArm as PartTransform3D) ?? null,
      rightLowerArm: (parts.rightLowerArm as PartTransform3D) ?? null,
      rightHand: (parts.rightHand as PartTransform3D) ?? null,
      leftUpperLeg: (parts.leftUpperLeg as PartTransform3D) ?? null,
      leftLowerLeg: (parts.leftLowerLeg as PartTransform3D) ?? null,
      leftFoot: (parts.leftFoot as PartTransform3D) ?? null,
      rightUpperLeg: (parts.rightUpperLeg as PartTransform3D) ?? null,
      rightLowerLeg: (parts.rightLowerLeg as PartTransform3D) ?? null,
      rightFoot: (parts.rightFoot as PartTransform3D) ?? null,
      isFront,
    };

    // ── Step 6: Temporal smoothing ─────────────────────────────────────
    return this.smoother.smooth(raw);
  }
}
