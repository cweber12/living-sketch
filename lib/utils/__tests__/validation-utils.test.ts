import { validateAnchors } from '../validation-utils';

describe('validateAnchors', () => {
  it('returns false for all valid anchors', () => {
    const anchors = [
      { x: 10, y: 10 },
      { x: 100, y: 200 },
    ];
    expect(validateAnchors(anchors, 640, 480)).toBe(false);
  });

  it('returns true when an anchor is null', () => {
    expect(validateAnchors([null, { x: 10, y: 10 }], 640, 480)).toBe(true);
  });

  it('returns true for NaN coords', () => {
    expect(validateAnchors([{ x: NaN, y: 10 }], 640, 480)).toBe(true);
  });

  it('returns true for out-of-bounds x', () => {
    expect(validateAnchors([{ x: 700, y: 10 }], 640, 480)).toBe(true);
  });

  it('returns true for negative y', () => {
    expect(validateAnchors([{ x: 10, y: -5 }], 640, 480)).toBe(true);
  });
});
