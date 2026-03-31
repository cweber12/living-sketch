import { create } from 'zustand';
import type { ScaleFactors, ScaleVector } from '@/lib/types';

const ONE: ScaleVector = { x: 1, y: 1 };

const DEFAULT_SCALES: ScaleFactors = {
  headScale: { ...ONE },
  armScale: { ...ONE },
  handScale: { ...ONE },
  legScale: { ...ONE },
  footScale: { ...ONE },
};

interface ScaleFactorsState extends ScaleFactors {
  setScale: (key: keyof ScaleFactors, value: ScaleVector) => void;
  setAll: (factors: ScaleFactors) => void;
  reset: () => void;
  getFactors: () => ScaleFactors;
}

export const useScaleFactorsStore = create<ScaleFactorsState>((set, get) => ({
  ...DEFAULT_SCALES,
  setScale: (key, value) => set({ [key]: value }),
  setAll: (factors) => set(factors),
  reset: () => set(DEFAULT_SCALES),
  getFactors: () => {
    const s = get();
    return {
      headScale: s.headScale,
      armScale: s.armScale,
      handScale: s.handScale,
      legScale: s.legScale,
      footScale: s.footScale,
    };
  },
}));
