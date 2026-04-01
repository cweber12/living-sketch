import type {
  LandmarkFrame,
  PointAnchor,
  QuadAnchor,
  SegmentAnchor,
  HeadAnchor,
  ShiftFactors,
} from '@/lib/types';
import { TorsoDimensions } from './torso-dimensions';
import { EarDistance } from './ear-distance';

type Point = { x: number; y: number; score?: number };
const MIN_SCORE = 0.3;
const SHIFT_FACTOR = 0.1;

function kp(frame: LandmarkFrame, idx: number): Point | undefined {
  return frame[idx];
}

function valid(p: Point | undefined): p is Point {
  return !!p && (p.score === undefined || p.score >= MIN_SCORE);
}

/* ── Torso ────────────────────────────────────────────────────────────── */
export function setTorsoAnchors(
  scaledLandmarks: LandmarkFrame,
  map: {
    topLeft: number;
    topRight: number;
    bottomLeft: number;
    bottomRight: number;
  },
  torsoDims: TorsoDimensions,
  shifts: ShiftFactors,
): QuadAnchor | undefined {
  const tl = kp(scaledLandmarks, map.topLeft);
  const tr = kp(scaledLandmarks, map.topRight);
  const bl = kp(scaledLandmarks, map.bottomLeft);
  const br = kp(scaledLandmarks, map.bottomRight);
  if (!valid(tl) || !valid(tr) || !valid(bl) || !valid(br)) return undefined;

  const shoulderWidth = tr.x - tl.x;
  const hipWidth = br.x - bl.x;
  torsoDims.updateAvgTorsoHeight(
    Math.hypot(
      (tl.x + tr.x) / 2 - (bl.x + br.x) / 2,
      (tl.y + tr.y) / 2 - (bl.y + br.y) / 2,
    ),
  );
  torsoDims.updateAvgTorsoWidth(shoulderWidth);
  torsoDims.updateAvgHipWidth(hipWidth);

  const tw = torsoDims.avgTorsoWidth * SHIFT_FACTOR;
  const th = torsoDims.avgTorsoHeight * SHIFT_FACTOR;
  const s = shifts.torsoShift;

  // Positive x → spreads shoulders/hips apart; positive y → stretches vertically
  return {
    tl: { x: tl.x - s.x * tw, y: tl.y - s.y * th },
    tr: { x: tr.x + s.x * tw, y: tr.y - s.y * th },
    bl: { x: bl.x - s.x * tw, y: bl.y + s.y * th },
    br: { x: br.x + s.x * tw, y: br.y + s.y * th },
  };
}

/* ── Head ─────────────────────────────────────────────────────────────── */
export function setHeadAnchors(
  scaledLandmarks: LandmarkFrame,
  map: {
    nose: number;
    leftEar: number;
    rightEar: number;
    leftShoulder: number;
    rightShoulder: number;
  },
  torsoDims: TorsoDimensions,
  earDist: EarDistance,
  shifts: ShiftFactors,
): HeadAnchor | undefined {
  const nose = kp(scaledLandmarks, map.nose);
  const leftEar = kp(scaledLandmarks, map.leftEar);
  const rightEar = kp(scaledLandmarks, map.rightEar);
  const leftShoulder = kp(scaledLandmarks, map.leftShoulder);
  const rightShoulder = kp(scaledLandmarks, map.rightShoulder);
  if (!valid(leftEar) || !valid(rightEar)) return undefined;
  if (!valid(leftShoulder) || !valid(rightShoulder)) return undefined;

  // Update EarDistance EMA tracker with current frame measurement
  earDist.updateAvgEarDistance(
    Math.hypot(rightEar.x - leftEar.x, rightEar.y - leftEar.y),
  );

  const tw = torsoDims.avgTorsoWidth * SHIFT_FACTOR;
  const th = torsoDims.avgTorsoHeight * SHIFT_FACTOR;
  const s = shifts.headShift;

  // Shoulder midpoint (bottom-center anchor), shifted by headShift
  const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
  const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
  const baseX = shoulderMidX + s.x * tw;
  const baseY = shoulderMidY + s.y * th;

  // Nose-to-shoulder distance drives head height
  const noseToShoulderDist = valid(nose)
    ? Math.hypot(nose.x - shoulderMidX, nose.y - shoulderMidY)
    : earDist.avgEarDistance; // fallback if nose not detected

  // Torso right unit vector (left shoulder → right shoulder)
  const sdx = rightShoulder.x - leftShoulder.x;
  const sdy = rightShoulder.y - leftShoulder.y;
  const sLen = Math.hypot(sdx, sdy);
  const rx = sLen > 0 ? sdx / sLen : 1;
  const ry = sLen > 0 ? sdy / sLen : 0;

  // Torso up unit vector — prefer hip→shoulder axis, fall back to ⊥ shoulder line
  let ux = -ry; // perpendicular fallback (points "up" relative to shoulder tilt)
  let uy = rx;
  // Ensure it points upward in screen space (negative y)
  if (uy > 0) {
    ux = -ux;
    uy = -uy;
  }

  const leftHip = kp(scaledLandmarks, 23);
  const rightHip = kp(scaledLandmarks, 24);
  if (valid(leftHip) && valid(rightHip)) {
    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;
    const vx = baseX - s.x * tw - hipMidX; // shoulder mid (unshifted) → hip mid
    const vy = baseY - s.y * th - hipMidY;
    const vLen = Math.hypot(vx, vy);
    if (vLen > 1) {
      ux = vx / vLen;
      uy = vy / vLen;
    }
  }

  return {
    base: { x: baseX, y: baseY },
    right: { x: rx, y: ry },
    up: { x: ux, y: uy },
    earWidth: earDist.avgEarDistance,
    noseToShoulderDist,
  };
}

/* ── Arms ─────────────────────────────────────────────────────────────── */
export function setArmAnchors(
  part: string,
  scaledLandmarks: LandmarkFrame,
  map: { start: number; end: number },
  torsoDims: TorsoDimensions,
  shifts: ShiftFactors,
): SegmentAnchor | undefined {
  const from = kp(scaledLandmarks, map.start);
  const to = kp(scaledLandmarks, map.end);
  if (!valid(from) || !valid(to)) return undefined;

  const tw = torsoDims.avgTorsoWidth * SHIFT_FACTOR;
  const th = torsoDims.avgTorsoHeight * SHIFT_FACTOR;
  const isRight = part.startsWith('right');
  const sign = isRight ? 1 : -1;

  let fromA: PointAnchor;
  let toA: PointAnchor;

  if (part.includes('Upper')) {
    // Shoulder anchor: torso shift moves shoulder outward (x) and up (y)
    fromA = {
      x: from.x + sign * (shifts.shoulderShift.x + shifts.torsoShift.x) * tw,
      y: from.y + (shifts.shoulderShift.y - shifts.torsoShift.y) * th,
    };
    toA = {
      x: to.x + sign * shifts.elbowShift.x * tw,
      y: to.y + shifts.elbowShift.y * th,
    };
  } else {
    fromA = {
      x: from.x + sign * shifts.elbowShift.x * tw,
      y: from.y + shifts.elbowShift.y * th,
    };
    toA = {
      x: to.x + sign * shifts.wristShift.x * tw,
      y: to.y + shifts.wristShift.y * th,
    };
  }

  return { from: fromA, to: toA };
}

/* ── Hands ────────────────────────────────────────────────────────────── */
export function setHandAnchors(
  part: string,
  scaledLandmarks: LandmarkFrame,
  map: { start: number; end: number },
  torsoDims: TorsoDimensions,
  shifts: ShiftFactors,
): SegmentAnchor | undefined {
  const from = kp(scaledLandmarks, map.start);
  const to = kp(scaledLandmarks, map.end);
  if (!valid(from) || !valid(to)) return undefined;

  const tw = torsoDims.avgTorsoWidth * SHIFT_FACTOR;
  const th = torsoDims.avgTorsoHeight * SHIFT_FACTOR;
  const isRight = part.startsWith('right');
  const sign = isRight ? 1 : -1;

  return {
    from: {
      x: from.x + sign * shifts.wristShift.x * tw,
      y: from.y + shifts.wristShift.y * th,
    },
    to: {
      x: to.x + sign * shifts.wristShift.x * tw,
      y: to.y + shifts.wristShift.y * th,
    },
  };
}

/* ── Legs ─────────────────────────────────────────────────────────────── */
export function setLegAnchors(
  part: string,
  scaledLandmarks: LandmarkFrame,
  map: { start: number; end: number },
  torsoDims: TorsoDimensions,
  shifts: ShiftFactors,
): SegmentAnchor | undefined {
  const from = kp(scaledLandmarks, map.start);
  const to = kp(scaledLandmarks, map.end);
  if (!valid(from) || !valid(to)) return undefined;

  const tw = torsoDims.avgTorsoWidth * SHIFT_FACTOR;
  const th = torsoDims.avgTorsoHeight * SHIFT_FACTOR;
  const isRight = part.startsWith('right');
  const sign = isRight ? 1 : -1;

  let fromA: PointAnchor;
  let toA: PointAnchor;

  if (part.includes('Upper')) {
    // Hip anchor: torso shift moves hip outward (x) and down (y)
    fromA = {
      x: from.x + sign * (shifts.torsoShift.x + shifts.hipShift.x) * tw,
      y: from.y + (shifts.torsoShift.y + shifts.hipShift.y) * th,
    };
    toA = {
      x: to.x + sign * shifts.kneeShift.x * tw,
      y: to.y + shifts.kneeShift.y * th,
    };
  } else {
    fromA = {
      x: from.x + sign * shifts.kneeShift.x * tw,
      y: from.y + shifts.kneeShift.y * th,
    };
    toA = {
      x: to.x + sign * shifts.ankleShift.x * tw,
      y: to.y + shifts.ankleShift.y * th,
    };
  }

  return { from: fromA, to: toA };
}

/* ── Feet ─────────────────────────────────────────────────────────────── */
export function setFootAnchors(
  part: string,
  scaledLandmarks: LandmarkFrame,
  map: { ankle?: number; foot?: number; start?: number; end?: number },
  torsoDims: TorsoDimensions,
  shifts: ShiftFactors,
): SegmentAnchor | undefined {
  const ankleIdx = map.ankle ?? map.start ?? 0;
  const footIdx = map.foot ?? map.end ?? 0;
  const from = kp(scaledLandmarks, ankleIdx);
  const to = kp(scaledLandmarks, footIdx);
  if (!valid(from) || !valid(to)) return undefined;

  const tw = torsoDims.avgTorsoWidth * SHIFT_FACTOR;
  const th = torsoDims.avgTorsoHeight * SHIFT_FACTOR;
  const isRight = part.startsWith('right');
  const sign = isRight ? 1 : -1;

  return {
    from: {
      x: from.x + sign * shifts.ankleShift.x * tw,
      y: from.y + shifts.ankleShift.y * th,
    },
    to: {
      x: to.x + sign * shifts.footShift.x * tw,
      y: to.y + shifts.footShift.y * th,
    },
  };
}
