import { TorsoDimensions } from '../torso-dimensions';

describe('TorsoDimensions', () => {
  it('initialises with zero averages', () => {
    const td = new TorsoDimensions();
    expect(td.avgTorsoHeight).toBe(0);
    expect(td.avgTorsoWidth).toBe(0);
    expect(td.avgHipWidth).toBe(0);
  });

  it('first update sets average directly', () => {
    const td = new TorsoDimensions();
    td.updateAvgTorsoHeight(100);
    expect(td.avgTorsoHeight).toBe(100);
    td.updateAvgTorsoWidth(50);
    expect(td.avgTorsoWidth).toBe(50);
  });

  it('subsequent updates use EMA', () => {
    const td = new TorsoDimensions();
    td.updateAvgTorsoHeight(100);
    td.updateAvgTorsoHeight(200);
    // alpha=0.1 → 0.1*200 + 0.9*100 = 110
    expect(td.avgTorsoHeight).toBeCloseTo(110, 5);
  });

  it('updateTorsoSvgDimensions stores svg dimensions', () => {
    const td = new TorsoDimensions();
    td.updateTorsoSvgDimensions(300, 200);
    expect(td.torsoSvgHeight).toBe(300);
    expect(td.torsoSvgWidth).toBe(200);
  });

  it('scaleFactorY updates when svg height is set', () => {
    const td = new TorsoDimensions();
    td.updateTorsoSvgDimensions(100, 50);
    td.updateAvgTorsoHeight(200);
    // 200 / 100 * 1.2 = 2.4
    expect(td.scaleFactorY).toBeCloseTo(2.4, 5);
  });

  it('initialises facing as front (positive)', () => {
    const td = new TorsoDimensions();
    expect(td.facingSmoothed).toBe(1);
    expect(td.isFront).toBe(true);
  });

  it('updateFacing smooths toward front for positive cross product', () => {
    const td = new TorsoDimensions();
    td.facingSmoothed = 0; // start at neutral
    td.updateFacing(100); // positive → front
    expect(td.facingSmoothed).toBeGreaterThan(0);
    expect(td.isFront).toBe(true);
  });

  it('updateFacing smooths toward back for negative cross product', () => {
    const td = new TorsoDimensions();
    // Drive it firmly toward back
    for (let i = 0; i < 30; i++) td.updateFacing(-100);
    expect(td.facingSmoothed).toBeLessThan(0);
    expect(td.isFront).toBe(false);
  });

  it('facing transitions smoothly without jumping', () => {
    const td = new TorsoDimensions();
    // Start front-facing
    expect(td.facingSmoothed).toBe(1);
    // Single back-facing update should not flip immediately
    td.updateFacing(-100);
    expect(td.facingSmoothed).toBeGreaterThan(0);
    expect(td.isFront).toBe(true);
  });
});
