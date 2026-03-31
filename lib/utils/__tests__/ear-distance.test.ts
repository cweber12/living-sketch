import { EarDistance } from '../ear-distance';

describe('EarDistance', () => {
  it('initialises with zero', () => {
    const ed = new EarDistance();
    expect(ed.avgEarDistance).toBe(0);
  });

  it('first update sets distance directly', () => {
    const ed = new EarDistance();
    ed.updateAvgEarDistance(50);
    expect(ed.avgEarDistance).toBe(50);
  });

  it('subsequent updates use EMA (alpha=0.3)', () => {
    const ed = new EarDistance();
    ed.updateAvgEarDistance(100);
    ed.updateAvgEarDistance(200);
    // 0.3*200 + 0.7*100 = 130
    expect(ed.avgEarDistance).toBeCloseTo(130, 5);
  });

  it('getEarX returns x difference', () => {
    const ed = new EarDistance();
    expect(ed.getEarX({ x: 10 }, { x: 50 })).toBe(40);
  });
});
