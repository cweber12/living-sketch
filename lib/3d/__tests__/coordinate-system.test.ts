import type { Keypoint } from '@/lib/types';
import {
  landmarkToScene,
  frameTo3D,
  frameConfidences,
  DEFAULT_SCENE_CONFIG,
} from '../coordinate-system';

function kp(x: number, y: number, z: number, score = 1): Keypoint {
  return { x, y, z, score };
}

describe('coordinate-system', () => {
  describe('DEFAULT_SCENE_CONFIG', () => {
    it('has expected defaults', () => {
      expect(DEFAULT_SCENE_CONFIG.sceneWidth).toBe(2.0);
      expect(DEFAULT_SCENE_CONFIG.sceneHeight).toBe(2.0);
      expect(DEFAULT_SCENE_CONFIG.depthScale).toBe(0.5);
    });
  });

  describe('landmarkToScene', () => {
    const config = DEFAULT_SCENE_CONFIG;

    it('maps (0.5, 0.5, 0) to scene origin', () => {
      const result = landmarkToScene(kp(0.5, 0.5, 0), config);
      expect(result.x).toBeCloseTo(0);
      expect(result.y).toBeCloseTo(0);
      expect(result.z).toBeCloseTo(0);
    });

    it('maps (0, 0, 0) to top-left of scene', () => {
      const result = landmarkToScene(kp(0, 0, 0), config);
      // x: (0 - 0.5) * 2 = -1
      expect(result.x).toBeCloseTo(-1);
      // y: -(0 - 0.5) * 2 = 1
      expect(result.y).toBeCloseTo(1);
      expect(result.z).toBeCloseTo(0);
    });

    it('maps (1, 1, 0) to bottom-right of scene', () => {
      const result = landmarkToScene(kp(1, 1, 0), config);
      expect(result.x).toBeCloseTo(1);
      expect(result.y).toBeCloseTo(-1);
    });

    it('flips Z and applies depth scale', () => {
      // z = -0.5 in MediaPipe → scene z = -(-0.5) * 0.5 = 0.25
      const result = landmarkToScene(kp(0.5, 0.5, -0.5), config);
      expect(result.z).toBeCloseTo(0.25);
    });

    it('handles missing z as 0', () => {
      const result = landmarkToScene({ x: 0.5, y: 0.5 }, config);
      expect(result.z).toBeCloseTo(0);
    });

    it('respects custom scene dimensions', () => {
      const custom = { sceneWidth: 4, sceneHeight: 3, depthScale: 1.0 };
      const result = landmarkToScene(kp(1, 0, 0), custom);
      // x: (1 - 0.5) * 4 = 2
      expect(result.x).toBeCloseTo(2);
      // y: -(0 - 0.5) * 3 = 1.5
      expect(result.y).toBeCloseTo(1.5);
    });
  });

  describe('frameTo3D', () => {
    it('converts all keypoints in a frame', () => {
      const frame = [kp(0.5, 0.5, 0), kp(0.25, 0.75, -0.1)];
      const result = frameTo3D(frame);
      expect(result).toHaveLength(2);
      expect(result[0].x).toBeCloseTo(0);
      expect(result[0].y).toBeCloseTo(0);
      // kp(0.25, 0.75, -0.1): x = (0.25 - 0.5) * 2 = -0.5
      expect(result[1].x).toBeCloseTo(-0.5);
    });

    it('preserves index correspondence', () => {
      const frame = Array.from({ length: 33 }, (_, i) => kp(i / 33, i / 33, 0));
      const result = frameTo3D(frame);
      expect(result).toHaveLength(33);
    });
  });

  describe('frameConfidences', () => {
    it('extracts scores', () => {
      const frame = [kp(0, 0, 0, 0.9), kp(0, 0, 0, 0.5)];
      expect(frameConfidences(frame)).toEqual([0.9, 0.5]);
    });

    it('defaults missing scores to 0', () => {
      const frame = [{ x: 0, y: 0 }];
      expect(frameConfidences(frame)).toEqual([0]);
    });
  });
});
