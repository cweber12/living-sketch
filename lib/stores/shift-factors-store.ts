import { create } from 'zustand';
import type { ShiftFactors, ShiftVector } from '@/lib/types';

const ZERO: ShiftVector = { x: 0, y: 0 };

const DEFAULT_SHIFTS: ShiftFactors = {
  torsoShift: { ...ZERO },
  headShift: { ...ZERO },
  shoulderShift: { ...ZERO },
  elbowShift: { ...ZERO },
  wristShift: { ...ZERO },
  hipShift: { ...ZERO },
  kneeShift: { ...ZERO },
  ankleShift: { ...ZERO },
  footShift: { ...ZERO },
};

interface ShiftFactorsState extends ShiftFactors {
  setShift: (key: keyof ShiftFactors, value: ShiftVector) => void;
  setAll: (factors: ShiftFactors) => void;
  reset: () => void;
  getFactors: () => ShiftFactors;
}

export const useShiftFactorsStore = create<ShiftFactorsState>((set, get) => ({
  ...DEFAULT_SHIFTS,
  setShift: (key, value) => set({ [key]: value }),
  setAll: (factors) => set(factors),
  reset: () => set(DEFAULT_SHIFTS),
  getFactors: () => {
    const s = get();
    return {
      torsoShift: s.torsoShift,
      headShift: s.headShift,
      shoulderShift: s.shoulderShift,
      elbowShift: s.elbowShift,
      wristShift: s.wristShift,
      hipShift: s.hipShift,
      kneeShift: s.kneeShift,
      ankleShift: s.ankleShift,
      footShift: s.footShift,
    };
  },
}));
