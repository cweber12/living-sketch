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

    // Scale head to match its size relative to the torso on the sketch page.
    // Both canvases are 400×400; the sketch grid gives the head roughly the
    // same display width as the torso, so we use the shoulder-width ratio.
    const uniformScale =
      Math.abs(torsoDims.avgTorsoWidth) / Math.max(1, torsoDims.torsoSvgWidth);

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

/* ── Segment-based parts (arms, hands, legs, feet) ───────────────────── */

const MIN_CROSS_WIDTH = 5; // minimum cross-section width in screen pixels

/**
 * Unified drawing for all segment-based body parts using affine transform.
 *
 * Automatically detects SVG orientation:
 * - Vertical (h >= w): top edge → from anchor, bottom edge → to anchor
 * - Horizontal (w > h): left edge → from anchor, right edge → to anchor
 *
 * @param referenceWidth - Body reference width in screen pixels
 *   (abs(avgTorsoWidth) for arms/hands, abs(avgHipWidth) for legs/feet)
 * @param torsoSvgWidth - Torso SVG pixel width (for proportional scaling)
 * @param forceVertical - Override orientation detection. `true` = top/bottom
 *   anchored (arms-down), `false` = left/right anchored (arms-up),
 *   `undefined` = auto-detect from image dimensions.
 */
export function drawSegmentSvg(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  anchors: SegmentAnchor,
  referenceWidth: number,
  torsoSvgWidth: number,
  scale: ScaleVector,
  forceVertical?: boolean,
): boolean {
  try {
    const { w: svgW, h: svgH } = getSvgSize(img);
    const { from, to } = anchors;

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const segLen = Math.hypot(dx, dy);
    if (segLen < 1) return false;

    // Perpendicular unit vector (90° CCW rotation of direction)
    const px = -dy / segLen;
    const py = dx / segLen;

    // Detect SVG orientation and compute cross-section width
    const isVertical = forceVertical ?? svgH > svgW;
    const crossDim = isVertical ? svgW : svgH;
    const ratio = Math.abs(referenceWidth) / Math.max(1, torsoSvgWidth);
    const crossWidth = Math.max(crossDim * ratio, MIN_CROSS_WIDTH);
    const hw = (crossWidth / 2) * scale.x;

    // Apply length scale factor
    const scaledTo: PointAnchor = {
      x: from.x + dx * scale.y,
      y: from.y + dy * scale.y,
    };

    // Source corners (always SVG rectangle corners)
    const src0: PointAnchor = { x: 0, y: 0 };
    const src1: PointAnchor = { x: svgW, y: 0 };
    const src2: PointAnchor = { x: 0, y: svgH };

    let dst0: PointAnchor, dst1: PointAnchor, dst2: PointAnchor;

    if (isVertical) {
      // SVG top → from, SVG bottom → to (y-axis along segment)
      dst0 = { x: from.x + px * hw, y: from.y + py * hw };
      dst1 = { x: from.x - px * hw, y: from.y - py * hw };
      dst2 = { x: scaledTo.x + px * hw, y: scaledTo.y + py * hw };
    } else {
      // SVG left → from, SVG right → to (x-axis along segment)
      dst0 = { x: from.x + px * hw, y: from.y + py * hw };
      dst1 = { x: scaledTo.x + px * hw, y: scaledTo.y + py * hw };
      dst2 = { x: from.x - px * hw, y: from.y - py * hw };
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
