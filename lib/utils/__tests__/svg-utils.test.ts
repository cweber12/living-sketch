import { affineFrom3Points, getSvgSize } from '../svg-utils';

describe('affineFrom3Points', () => {
  it('returns identity-like matrix for matching points', () => {
    const M = affineFrom3Points(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    );
    expect(M).not.toBeNull();
    expect(M!.a).toBeCloseTo(1);
    expect(M!.d).toBeCloseTo(1);
    expect(M!.e).toBeCloseTo(0);
    expect(M!.f).toBeCloseTo(0);
  });

  it('returns null for collinear points', () => {
    const M = affineFrom3Points(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    );
    expect(M).toBeNull();
  });

  it('computes a 2x scale transform', () => {
    const M = affineFrom3Points(
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
    );
    expect(M).not.toBeNull();
    expect(M!.a).toBeCloseTo(2);
    expect(M!.d).toBeCloseTo(2);
  });
});

describe('getSvgSize', () => {
  it('returns naturalWidth/naturalHeight', () => {
    const img = { naturalWidth: 100, naturalHeight: 200 } as HTMLImageElement;
    expect(getSvgSize(img)).toEqual({ w: 100, h: 200 });
  });

  it('falls back to width/height', () => {
    const img = {
      naturalWidth: 0,
      naturalHeight: 0,
      width: 50,
      height: 75,
    } as HTMLImageElement;
    expect(getSvgSize(img)).toEqual({ w: 50, h: 75 });
  });
});
