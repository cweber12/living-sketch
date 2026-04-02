import {
  setTorsoAnchors,
  setHeadAnchors,
  setArmAnchors,
  setFootAnchors,
} from '../set-anchors';
import { TorsoDimensions } from '../torso-dimensions';
import { EarDistance } from '../ear-distance';
import type { LandmarkFrame, ShiftFactors } from '@/lib/types';
import { ANCHOR_MAP } from '@/lib/constants';

const ZERO = { x: 0, y: 0 };
const DEFAULT_SHIFTS: ShiftFactors = {
  torsoShift: ZERO,
  headShift: ZERO,
  shoulderShift: ZERO,
  elbowShift: ZERO,
  wristShift: ZERO,
  hipShift: ZERO,
  kneeShift: ZERO,
  ankleShift: ZERO,
  footShift: ZERO,
};

function makeFrame(): LandmarkFrame {
  return Array.from({ length: 33 }, (_, i) => ({
    x: 100 + i * 10,
    y: 200 + i * 5,
    score: 0.95,
  }));
}

describe('setTorsoAnchors', () => {
  it('returns quad anchor with zero shifts', () => {
    const frame = makeFrame();
    const td = new TorsoDimensions();
    td.updateAvgTorsoWidth(100);
    td.updateAvgTorsoHeight(200);
    const result = setTorsoAnchors(frame, ANCHOR_MAP.torso, td, DEFAULT_SHIFTS);
    expect(result).toBeDefined();
    expect(result!.tl).toHaveProperty('x');
    expect(result!.tr).toHaveProperty('y');
  });

  it('returns undefined for low-score landmarks', () => {
    const frame = makeFrame();
    frame[11] = { x: 100, y: 200, score: 0.1 };
    const td = new TorsoDimensions();
    const result = setTorsoAnchors(frame, ANCHOR_MAP.torso, td, DEFAULT_SHIFTS);
    expect(result).toBeUndefined();
  });
});

describe('setHeadAnchors', () => {
  it('returns HeadAnchor with leftAnchor, rightAnchor, and baseAnchor', () => {
    const frame = makeFrame();
    const td = new TorsoDimensions();
    td.updateAvgTorsoWidth(100);
    td.updateAvgTorsoHeight(200);
    const ed = new EarDistance();
    const result = setHeadAnchors(
      frame,
      ANCHOR_MAP.head,
      td,
      ed,
      DEFAULT_SHIFTS,
    );
    expect(result).toBeDefined();
    expect(result!.leftAnchor).toHaveProperty('x');
    expect(result!.leftAnchor).toHaveProperty('y');
    expect(result!.rightAnchor).toHaveProperty('x');
    expect(result!.rightAnchor).toHaveProperty('y');
    expect(result!.baseAnchor).toHaveProperty('x');
    expect(result!.baseAnchor).toHaveProperty('y');

    // baseAnchor should be blended ear-midpoint + nose centre (NOT shoulder midpoint)
    const leftEar = frame[7];
    const rightEar = frame[8];
    const nose = frame[0];
    const earMidX = (leftEar.x + rightEar.x) / 2;
    const earMidY = (leftEar.y + rightEar.y) / 2;
    const expectedX = earMidX * 0.75 + nose.x * 0.25;
    const expectedY = earMidY * 0.75 + nose.y * 0.25;
    expect(result!.baseAnchor.x).toBeCloseTo(expectedX);
    expect(result!.baseAnchor.y).toBeCloseTo(expectedY);
  });

  it('returns undefined when ears have low confidence', () => {
    const frame = makeFrame();
    frame[7] = { x: 100, y: 200, score: 0.1 }; // low-confidence left ear
    const td = new TorsoDimensions();
    td.updateAvgTorsoWidth(100);
    td.updateAvgTorsoHeight(200);
    const ed = new EarDistance();
    const result = setHeadAnchors(
      frame,
      ANCHOR_MAP.head,
      td,
      ed,
      DEFAULT_SHIFTS,
    );
    expect(result).toBeUndefined();
  });

  it('still returns head anchor when shoulders have low confidence', () => {
    const frame = makeFrame();
    frame[11] = { x: 100, y: 200, score: 0.1 }; // low-confidence left shoulder
    const td = new TorsoDimensions();
    td.updateAvgTorsoWidth(100);
    td.updateAvgTorsoHeight(200);
    const ed = new EarDistance();
    const result = setHeadAnchors(
      frame,
      ANCHOR_MAP.head,
      td,
      ed,
      DEFAULT_SHIFTS,
    );
    // Head no longer depends on shoulders — should still succeed
    expect(result).toBeDefined();
  });
});

describe('setArmAnchors', () => {
  it('returns segment for left upper arm', () => {
    const frame = makeFrame();
    const td = new TorsoDimensions();
    td.updateAvgTorsoWidth(100);
    td.updateAvgTorsoHeight(200);
    const result = setArmAnchors(
      'leftUpperArm',
      frame,
      ANCHOR_MAP.leftUpperArm,
      td,
      DEFAULT_SHIFTS,
    );
    expect(result).toBeDefined();
    expect(result!.from.x).toBeDefined();
  });
});

describe('setFootAnchors', () => {
  it('returns segment for right foot', () => {
    const frame = makeFrame();
    const td = new TorsoDimensions();
    td.updateAvgTorsoWidth(100);
    td.updateAvgTorsoHeight(200);
    const result = setFootAnchors(
      'rightFoot',
      frame,
      ANCHOR_MAP.rightFoot,
      td,
      DEFAULT_SHIFTS,
    );
    expect(result).toBeDefined();
  });
});
