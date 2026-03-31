import { useShiftFactorsStore } from '../shift-factors-store';

describe('useShiftFactorsStore', () => {
  beforeEach(() => {
    useShiftFactorsStore.getState().reset();
  });

  it('starts with all-zero defaults', () => {
    const f = useShiftFactorsStore.getState().getFactors();
    for (const v of Object.values(f)) {
      expect(v).toEqual({ x: 0, y: 0 });
    }
  });

  it('setShift updates a single key', () => {
    useShiftFactorsStore.getState().setShift('headShift', { x: 3, y: -2 });
    expect(useShiftFactorsStore.getState().headShift).toEqual({ x: 3, y: -2 });
    // Others unchanged
    expect(useShiftFactorsStore.getState().torsoShift).toEqual({ x: 0, y: 0 });
  });

  it('setAll replaces all factors', () => {
    const patch = useShiftFactorsStore.getState().getFactors();
    patch.torsoShift = { x: 1, y: 1 };
    patch.footShift = { x: -5, y: 5 };
    useShiftFactorsStore.getState().setAll(patch);
    expect(useShiftFactorsStore.getState().torsoShift).toEqual({ x: 1, y: 1 });
    expect(useShiftFactorsStore.getState().footShift).toEqual({ x: -5, y: 5 });
  });

  it('reset restores defaults', () => {
    useShiftFactorsStore.getState().setShift('kneeShift', { x: 9, y: 9 });
    useShiftFactorsStore.getState().reset();
    expect(useShiftFactorsStore.getState().kneeShift).toEqual({ x: 0, y: 0 });
  });

  it('getFactors returns a plain snapshot', () => {
    const f = useShiftFactorsStore.getState().getFactors();
    expect(f).toHaveProperty('torsoShift');
    expect(f).toHaveProperty('footShift');
    expect(f).not.toHaveProperty('setShift'); // no actions
  });
});
