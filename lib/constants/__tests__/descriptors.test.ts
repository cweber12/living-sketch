import { describe, it, expect } from 'vitest';
import { ANCHOR_MAP, BODY_PARTS } from '@/lib/constants/anchor-descriptors';
import {
  KEYPOINT_NAMES,
  CONNECTED_KEYPOINTS,
} from '@/lib/constants/landmark-descriptors';

describe('anchor-descriptors', () => {
  it('exports 14 body parts', () => {
    expect(BODY_PARTS).toHaveLength(14);
  });

  it('ANCHOR_MAP keys match BODY_PARTS', () => {
    expect(Object.keys(ANCHOR_MAP).sort()).toEqual([...BODY_PARTS].sort());
  });

  it('torso anchors reference shoulder and hip keypoints', () => {
    const t = ANCHOR_MAP.torso;
    expect(t.topLeft).toBe(11); // left shoulder
    expect(t.topRight).toBe(12); // right shoulder
    expect(t.bottomLeft).toBe(23); // left hip
    expect(t.bottomRight).toBe(24); // right hip
  });

  it('head anchors reference nose, ear and shoulder keypoints', () => {
    const h = ANCHOR_MAP.head;
    expect(h.nose).toBe(0); // nose
    expect(h.leftEar).toBe(7); // left ear
    expect(h.rightEar).toBe(8); // right ear
    expect(h.leftShoulder).toBe(11); // left shoulder
    expect(h.rightShoulder).toBe(12); // right shoulder
  });

  it('all anchor keypoint indices are within MediaPipe 33-keypoint range', () => {
    for (const part of BODY_PARTS) {
      const desc = ANCHOR_MAP[part];
      for (const val of Object.values(desc)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(33);
      }
    }
  });
});

describe('landmark-descriptors', () => {
  it('exports 33 keypoint names', () => {
    expect(KEYPOINT_NAMES).toHaveLength(33);
  });

  it('first keypoint is nose', () => {
    expect(KEYPOINT_NAMES[0]).toBe('nose');
  });

  it('CONNECTED_KEYPOINTS has 16 connections', () => {
    expect(CONNECTED_KEYPOINTS).toHaveLength(16);
  });

  it('all connected keypoint indices are valid', () => {
    for (const [a, b] of CONNECTED_KEYPOINTS) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(33);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(33);
    }
  });

  it('shoulder connection exists', () => {
    expect(CONNECTED_KEYPOINTS).toContainEqual([11, 12]);
  });
});
