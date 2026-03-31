import { useScaleFactorsStore } from '../scale-factors-store';

describe('useScaleFactorsStore', () => {
  beforeEach(() => {
    useScaleFactorsStore.getState().reset();
  });

  it('starts with all-one defaults', () => {
    const f = useScaleFactorsStore.getState().getFactors();
    for (const v of Object.values(f)) {
      expect(v).toEqual({ x: 1, y: 1 });
    }
  });

  it('setScale updates a single key', () => {
    useScaleFactorsStore.getState().setScale('headScale', { x: 2, y: 0.5 });
    expect(useScaleFactorsStore.getState().headScale).toEqual({ x: 2, y: 0.5 });
    expect(useScaleFactorsStore.getState().armScale).toEqual({ x: 1, y: 1 });
  });

  it('setAll replaces all factors', () => {
    const patch = useScaleFactorsStore.getState().getFactors();
    patch.legScale = { x: 3, y: 3 };
    useScaleFactorsStore.getState().setAll(patch);
    expect(useScaleFactorsStore.getState().legScale).toEqual({ x: 3, y: 3 });
  });

  it('reset restores defaults', () => {
    useScaleFactorsStore.getState().setScale('footScale', { x: 9, y: 9 });
    useScaleFactorsStore.getState().reset();
    expect(useScaleFactorsStore.getState().footScale).toEqual({ x: 1, y: 1 });
  });

  it('getFactors returns a plain snapshot', () => {
    const f = useScaleFactorsStore.getState().getFactors();
    expect(f).toHaveProperty('headScale');
    expect(f).toHaveProperty('footScale');
    expect(f).not.toHaveProperty('setScale');
  });
});
