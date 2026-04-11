import {
  objectContainTransform,
  applyDisplayTransform,
} from '../display-transform';

describe('objectContainTransform', () => {
  it('returns identity-like values when aspect ratios match', () => {
    // 100×100 source in 200×200 container → scale = 2, no offset
    const t = objectContainTransform(100, 100, 200, 200);
    expect(t.scale).toBe(2);
    expect(t.offsetX).toBe(0);
    expect(t.offsetY).toBe(0);
  });

  it('letterboxes vertically for a wide source in a tall container', () => {
    // 160×90 (16:9) into 200×200 square → constrained by width
    // scale = min(200/160, 200/90) = min(1.25, 2.22) = 1.25
    // offsetX = (200 - 160*1.25)/2 = (200-200)/2 = 0
    // offsetY = (200 - 90*1.25)/2 = (200-112.5)/2 = 43.75
    const t = objectContainTransform(160, 90, 200, 200);
    expect(t.scale).toBeCloseTo(1.25);
    expect(t.offsetX).toBeCloseTo(0);
    expect(t.offsetY).toBeCloseTo(43.75);
  });

  it('pillarboxes horizontally for a tall source in a wide container', () => {
    // 90×160 (9:16) into 200×200 square → constrained by height
    // scale = min(200/90, 200/160) = min(2.22, 1.25) = 1.25
    // offsetX = (200 - 90*1.25)/2 = 43.75
    // offsetY = 0
    const t = objectContainTransform(90, 160, 200, 200);
    expect(t.scale).toBeCloseTo(1.25);
    expect(t.offsetX).toBeCloseTo(43.75);
    expect(t.offsetY).toBeCloseTo(0);
  });

  it('returns safe defaults when source dimensions are zero', () => {
    const t = objectContainTransform(0, 100, 200, 200);
    expect(t.scale).toBe(1);
    expect(t.offsetX).toBe(0);
    expect(t.offsetY).toBe(0);
  });

  it('returns safe defaults when container dimensions are zero', () => {
    const t = objectContainTransform(100, 100, 0, 0);
    expect(t.scale).toBe(1);
    expect(t.offsetX).toBe(0);
    expect(t.offsetY).toBe(0);
  });

  it('handles downscaling when source is larger than container', () => {
    // 1920×1080 source in 640×360 container (same AR) → scale = 1/3
    const t = objectContainTransform(1920, 1080, 640, 360);
    expect(t.scale).toBeCloseTo(1 / 3);
    expect(t.offsetX).toBeCloseTo(0);
    expect(t.offsetY).toBeCloseTo(0);
  });
});

describe('applyDisplayTransform', () => {
  it('maps origin to offset', () => {
    const t = { scale: 2, offsetX: 10, offsetY: 20 };
    const result = applyDisplayTransform(0, 0, t);
    expect(result.x).toBe(10);
    expect(result.y).toBe(20);
  });

  it('applies scale and offset correctly', () => {
    const t = { scale: 0.5, offsetX: 5, offsetY: 5 };
    const result = applyDisplayTransform(100, 80, t);
    expect(result.x).toBe(55); // 100*0.5 + 5
    expect(result.y).toBe(45); // 80*0.5 + 5
  });
});
