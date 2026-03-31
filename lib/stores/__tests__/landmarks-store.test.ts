import { describe, it, expect, beforeEach } from 'vitest';
import { useLandmarksStore } from '../landmarks-store';
import type { LandmarkFrame, Dimensions } from '@/lib/types';

const mockFrame: LandmarkFrame = [
  { x: 10, y: 20, z: 0, score: 0.9 },
  { x: 30, y: 40, z: 0, score: 0.8 },
];

const mockDimensions: Dimensions = { width: 640, height: 480 };

describe('useLandmarksStore', () => {
  beforeEach(() => {
    useLandmarksStore.getState().reset();
  });

  it('starts with empty defaults', () => {
    const state = useLandmarksStore.getState();
    expect(state.frames).toEqual([]);
    expect(state.currentFrame).toBeNull();
    expect(state.dimensions).toEqual({ width: 0, height: 0 });
  });

  it('setFrames stores frames', () => {
    useLandmarksStore.getState().setFrames([mockFrame, mockFrame]);
    expect(useLandmarksStore.getState().frames).toHaveLength(2);
  });

  it('setCurrentFrame sets current frame', () => {
    useLandmarksStore.getState().setCurrentFrame(mockFrame);
    expect(useLandmarksStore.getState().currentFrame).toBe(mockFrame);
  });

  it('setCurrentFrame accepts null', () => {
    useLandmarksStore.getState().setCurrentFrame(mockFrame);
    useLandmarksStore.getState().setCurrentFrame(null);
    expect(useLandmarksStore.getState().currentFrame).toBeNull();
  });

  it('setDimensions stores dimensions', () => {
    useLandmarksStore.getState().setDimensions(mockDimensions);
    expect(useLandmarksStore.getState().dimensions).toEqual(mockDimensions);
  });

  it('clearFrames resets frames and currentFrame but keeps dimensions', () => {
    useLandmarksStore.getState().setFrames([mockFrame]);
    useLandmarksStore.getState().setCurrentFrame(mockFrame);
    useLandmarksStore.getState().setDimensions(mockDimensions);

    useLandmarksStore.getState().clearFrames();
    const state = useLandmarksStore.getState();
    expect(state.frames).toEqual([]);
    expect(state.currentFrame).toBeNull();
    expect(state.dimensions).toEqual(mockDimensions);
  });

  it('reset clears everything including dimensions', () => {
    useLandmarksStore.getState().setFrames([mockFrame]);
    useLandmarksStore.getState().setCurrentFrame(mockFrame);
    useLandmarksStore.getState().setDimensions(mockDimensions);

    useLandmarksStore.getState().reset();
    const state = useLandmarksStore.getState();
    expect(state.frames).toEqual([]);
    expect(state.currentFrame).toBeNull();
    expect(state.dimensions).toEqual({ width: 0, height: 0 });
  });
});
