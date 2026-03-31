import { create } from 'zustand';
import type { LandmarkFrame, Dimensions } from '@/lib/types';

interface LandmarksState {
  /** All collected frames (set in batch after detection stops) */
  frames: LandmarkFrame[];
  /** Latest single-frame result for live overlay */
  currentFrame: LandmarkFrame | null;
  /** Video/canvas dimensions for scaling */
  dimensions: Dimensions;

  setFrames: (frames: LandmarkFrame[]) => void;
  setCurrentFrame: (frame: LandmarkFrame | null) => void;
  setDimensions: (dims: Dimensions) => void;
  clearFrames: () => void;
  reset: () => void;
}

export const useLandmarksStore = create<LandmarksState>((set) => ({
  frames: [],
  currentFrame: null,
  dimensions: { width: 0, height: 0 },

  setFrames: (frames) => set({ frames }),
  setCurrentFrame: (frame) => set({ currentFrame: frame }),
  setDimensions: (dims) => set({ dimensions: dims }),
  clearFrames: () => set({ frames: [], currentFrame: null }),
  reset: () =>
    set({
      frames: [],
      currentFrame: null,
      dimensions: { width: 0, height: 0 },
    }),
}));
