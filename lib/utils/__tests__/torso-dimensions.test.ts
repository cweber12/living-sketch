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
});
