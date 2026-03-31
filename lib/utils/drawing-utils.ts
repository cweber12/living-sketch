import type {
  PointAnchor,
  QuadAnchor,
  SegmentAnchor,
  ScaleVector,
} from '@/lib/types';
import { affineFrom3Points, getSvgSize } from './svg-utils';
import { TorsoDimensions } from './torso-dimensions';

/* ── Torso ────────────────────────────────────────────────────────────── */
export function drawTorsoSvg(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  anchors: QuadAnchor,
): boolean {
  try {
    const { w: svgW, h: svgH } = getSvgSize(img);
    const { tl, tr, bl, br } = anchors;
    const shoulderWidth = tr.x - tl.x;
    const offset = shoulderWidth / 2;
    const hipCenter: PointAnchor = {
      x: (bl.x + br.x) / 2,
      y: (bl.y + br.y) / 2,
    };
    const thirdPt: PointAnchor = { x: hipCenter.x - offset, y: hipCenter.y };

    const M = affineFrom3Points(
      { x: 0, y: 0 },
      { x: svgW, y: 0 },
      { x: 0, y: svgH },
      tl,
      tr,
      thirdPt,
    );
    if (!M) return false;

    ctx.save();
    ctx.setTransform(M.a, M.b, M.c, M.d, M.e, M.f);
    ctx.scale(1, 1.2);
    ctx.drawImage(img, 0, -svgH * 0.2, svgW, svgH);
    ctx.restore();
    return true;
  } catch {
    return false;
  }
}

/* ── Head ─────────────────────────────────────────────────────────────── */
export function drawHeadSvg(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  anchors: SegmentAnchor,
  torsoDims: TorsoDimensions,
  scale: ScaleVector,
): boolean {
  try {
    const { w: svgW, h: svgH } = getSvgSize(img);
    const { from: leftEar, to: rightEar } = anchors;
    const midX = (leftEar.x + rightEar.x) / 2;
    const midY = (leftEar.y + rightEar.y) / 2;
    const scaleX =
      (Math.abs(torsoDims.avgTorsoWidth) * 0.5) /
      Math.max(1, torsoDims.torsoSvgWidth);
    const scaleY =
      (Math.abs(torsoDims.avgTorsoHeight) * 0.5) /
      Math.max(1, torsoDims.torsoSvgHeight);

    ctx.save();
    ctx.translate(midX, midY);
    ctx.scale(scaleX * scale.x, scaleY * scale.y);
    ctx.drawImage(img, -svgW / 2, -svgH / 1.2, svgW, svgH);
    ctx.restore();
    return true;
  } catch {
    return false;
  }
}

/* ── Arms (horizontal orientation) ───────────────────────────────────── */
export function drawArmSvg(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  anchors: SegmentAnchor,
  part: string,
  torsoDims: TorsoDimensions,
  scale: ScaleVector,
): boolean {
  try {
    const { w: svgW, h: svgH } = getSvgSize(img);
    const { from, to } = anchors;
    const isLeft = part.startsWith('left');
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const length = Math.hypot(dx, dy);

    const scaleX = length / Math.max(1, svgW);
    const scaleY =
      ((Math.abs(torsoDims.avgTorsoHeight) * 0.5) /
        Math.max(1, torsoDims.torsoSvgHeight) +
        (Math.abs(torsoDims.avgTorsoWidth) * 0.5) /
          Math.max(1, torsoDims.torsoSvgWidth)) /
      2;

    ctx.save();
    ctx.translate(from.x, from.y);
    ctx.rotate(angle);
    if (!isLeft) {
      ctx.scale(-scaleX * scale.x, -scaleY * scale.y);
      ctx.drawImage(img, -svgW, -svgH / 2, svgW, svgH);
    } else {
      ctx.scale(scaleX * scale.x, scaleY * scale.y);
      ctx.drawImage(img, 0, -svgH / 2, svgW, svgH);
    }
    ctx.restore();
    return true;
  } catch {
    return false;
  }
}

/* ── Hands ────────────────────────────────────────────────────────────── */
export function drawHandSvg(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  anchors: SegmentAnchor,
  armsDown: boolean,
  part: string,
  torsoDims: TorsoDimensions,
  scale: ScaleVector,
): boolean {
  try {
    const { w: svgW, h: svgH } = getSvgSize(img);
    const { from: wrist, to: elbow } = anchors;
    const isRight = part.startsWith('right');
    const dx = elbow.x - wrist.x;
    const dy = elbow.y - wrist.y;
    const angle = Math.atan2(dy, dx);

    const s =
      ((Math.abs(torsoDims.avgTorsoHeight) * 0.5) /
        Math.max(1, torsoDims.torsoSvgHeight) +
        (Math.abs(torsoDims.avgTorsoWidth) * 0.5) /
          Math.max(1, torsoDims.torsoSvgWidth)) /
      2;

    ctx.save();
    ctx.translate(wrist.x, wrist.y);

    if (!armsDown) {
      ctx.rotate(angle);
      if (isRight) {
        ctx.scale(s * scale.x, s * scale.y);
        ctx.drawImage(img, -svgW, -svgH / 2, svgW, svgH);
      } else {
        ctx.scale(-s * scale.x, -s * scale.y);
        ctx.drawImage(img, 0, -svgH / 2, svgW, svgH);
      }
    } else {
      ctx.rotate(angle - Math.PI / 2);
      if (isRight) {
        ctx.scale(-s * scale.x, s * scale.y);
        ctx.drawImage(img, 0, 0, svgW, svgH);
      } else {
        ctx.scale(s * scale.x, s * scale.y);
        ctx.drawImage(img, -svgW, 0, svgW, svgH);
      }
    }
    ctx.restore();
    return true;
  } catch {
    return false;
  }
}

/* ── Legs ─────────────────────────────────────────────────────────────── */
export function drawLegSvg(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  anchors: SegmentAnchor,
  torsoDims: TorsoDimensions,
  scale: ScaleVector,
): boolean {
  try {
    const { w: svgW, h: svgH } = getSvgSize(img);
    const { from, to } = anchors;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const length = Math.hypot(dx, dy);

    const scaleY = length / Math.max(1, svgH);
    const scaleX =
      ((Math.abs(torsoDims.avgTorsoHeight) * 0.5) /
        Math.max(1, torsoDims.torsoSvgHeight) +
        (Math.abs(torsoDims.avgTorsoWidth) * 0.5) /
          Math.max(1, torsoDims.torsoSvgWidth)) /
      2;

    ctx.save();
    ctx.translate(from.x, from.y);
    ctx.rotate(angle - Math.PI / 2);
    ctx.scale(scaleX * scale.x, scaleY * scale.y);
    ctx.drawImage(img, -svgW / 2, 0, svgW, svgH);
    ctx.restore();
    return true;
  } catch {
    return false;
  }
}

/* ── Feet ─────────────────────────────────────────────────────────────── */
export function drawFootSvg(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  anchors: SegmentAnchor,
  torsoDims: TorsoDimensions,
  scale: ScaleVector,
): boolean {
  try {
    const { w: svgW, h: svgH } = getSvgSize(img);
    const { from, to } = anchors;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);

    const scaleY =
      (Math.abs(torsoDims.avgTorsoHeight) * 0.5) /
      Math.max(1, torsoDims.torsoSvgHeight);
    const scaleX =
      (Math.abs(torsoDims.avgTorsoWidth) * 0.5) /
      Math.max(1, torsoDims.torsoSvgWidth);

    ctx.save();
    ctx.translate(from.x, from.y);
    ctx.rotate(angle - Math.PI / 2);
    ctx.scale(scaleX * scale.x, scaleY * scale.y);
    ctx.drawImage(img, -svgW / 2, 0, svgW, svgH);
    ctx.restore();
    return true;
  } catch {
    return false;
  }
}
