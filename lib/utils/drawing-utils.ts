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
    const { from: leftEye, to: rightEye } = anchors;
    const midX = (leftEye.x + rightEye.x) / 2;
    const midY = (leftEye.y + rightEye.y) / 2;

    // Uniform scaling: average of torso width+height ratios
    const avgTorso =
      (Math.abs(torsoDims.avgTorsoWidth) + Math.abs(torsoDims.avgTorsoHeight)) /
      2;
    const avgSvg =
      (Math.max(1, torsoDims.torsoSvgWidth) +
        Math.max(1, torsoDims.torsoSvgHeight)) /
      2;
    const uniformScale = (avgTorso * 0.5) / avgSvg;

    ctx.save();
    ctx.translate(midX, midY);
    ctx.scale(uniformScale * scale.x, uniformScale * scale.y);
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

/* ── Hands (affine transform wrist → finger) ─────────────────────────── */
export function drawHandSvg(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  anchors: SegmentAnchor,
  armsDown: boolean,
  _part: string,
  torsoDims: TorsoDimensions,
  scale: ScaleVector,
): boolean {
  try {
    const { w: svgW, h: svgH } = getSvgSize(img);
    const { from: wrist, to: finger } = anchors;

    const dx = finger.x - wrist.x;
    const dy = finger.y - wrist.y;
    const segLen = Math.hypot(dx, dy);
    if (segLen < 1) return false;

    // Perpendicular unit vector
    const px = -dy / segLen;
    const py = dx / segLen;

    // Cross-section scale from averaged torso proportions
    const crossScale =
      ((Math.abs(torsoDims.avgTorsoHeight) * 0.5) /
        Math.max(1, torsoDims.torsoSvgHeight) +
        (Math.abs(torsoDims.avgTorsoWidth) * 0.5) /
          Math.max(1, torsoDims.torsoSvgWidth)) /
      2;

    // Source corners in SVG-pixel space
    const src0: PointAnchor = { x: 0, y: 0 };
    const src1: PointAnchor = { x: svgW, y: 0 };
    const src2: PointAnchor = { x: 0, y: svgH };
    let dst0: PointAnchor, dst1: PointAnchor, dst2: PointAnchor;

    if (armsDown) {
      // SVG authored vertically (h > w): top→wrist, bottom→finger
      const hw = (svgW / 2) * crossScale * scale.x;
      dst0 = { x: wrist.x - px * hw, y: wrist.y - py * hw };
      dst1 = { x: wrist.x + px * hw, y: wrist.y + py * hw };
      dst2 = { x: finger.x - px * hw, y: finger.y - py * hw };
    } else {
      // SVG authored horizontally (w >= h): left→wrist, right→finger
      const hh = (svgH / 2) * crossScale * scale.y;
      dst0 = { x: wrist.x + px * hh, y: wrist.y + py * hh };
      dst1 = { x: finger.x + px * hh, y: finger.y + py * hh };
      dst2 = { x: wrist.x - px * hh, y: wrist.y - py * hh };
    }

    const M = affineFrom3Points(src0, src1, src2, dst0, dst1, dst2);
    if (!M) return false;

    ctx.save();
    ctx.setTransform(M.a, M.b, M.c, M.d, M.e, M.f);
    ctx.drawImage(img, 0, 0, svgW, svgH);
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
