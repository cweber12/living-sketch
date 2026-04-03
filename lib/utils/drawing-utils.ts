import type {
  PointAnchor,
  QuadAnchor,
  SegmentAnchor,
  HeadAnchor,
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

/** Head size as fraction of torso hypotenuse (right hip → left shoulder diagonal).
 *  The diagonal is orientation-stable — stays roughly constant whether the person
 *  is facing front, side, or back. */
const HEAD_HYPO_FRACTION = 0.6;
/** Fallback fraction when hypotenuse is not yet accumulated. */
const HEAD_TORSO_FRACTION = 0.7;
/**
 * Ears sit roughly this far from the top of the head SVG (0–1).
 * Used to vertically centre the SVG on the ear-midpoint + nose anchor.
 */
const EAR_TOP_FRACTION = 0.42;

export function drawHeadSvg(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  anchor: HeadAnchor,
  torsoDims: TorsoDimensions,
  scale: ScaleVector,
): boolean {
  try {
    const { w: svgW, h: svgH } = getSvgSize(img);
    const { baseAnchor } = anchor;

    // Keep head upright — do not derive rotation from ear-to-ear line, which
    // produces a near-90° spin artifact when the subject faces sideways due to
    // perspective foreshortening compressing the horizontal ear separation.
    const rotation = 0;

    // Uniform scale: prefer hypotenuse (orientation-stable) over shoulder width
    const torsoHyp = Math.abs(torsoDims.avgTorsoHypotenuse);
    const targetWidth =
      torsoHyp > 0
        ? torsoHyp * HEAD_HYPO_FRACTION
        : Math.abs(torsoDims.avgTorsoWidth) * HEAD_TORSO_FRACTION;
    const uniformScale = targetWidth / Math.max(1, svgW);
    const appliedScale = uniformScale * ((scale.x + scale.y) / 2);

    ctx.save();
    ctx.translate(baseAnchor.x, baseAnchor.y);
    ctx.rotate(rotation);
    ctx.scale(appliedScale, appliedScale);
    // Place SVG so the ear level (EAR_TOP_FRACTION from top) aligns with origin
    ctx.drawImage(img, -svgW / 2, -svgH * EAR_TOP_FRACTION, svgW, svgH);
    ctx.restore();
    return true;
  } catch {
    return false;
  }
}

/* ── Segment-based parts (arms, hands, legs, feet) ───────────────────── */

const MIN_CROSS_WIDTH = 5; // minimum cross-section width in screen pixels

/**
 * Unified drawing for segment-based body parts using affine transform.
 *
 * Automatically detects SVG orientation:
 * - Vertical (h >= w): top edge → from anchor, bottom edge → to anchor
 * - Horizontal (w > h): left edge → from anchor, right edge → to anchor
 *
 * Cross-section width is computed from averaged torso width+height ratios
 * for uniform scaling regardless of torso proportions.
 *
 * @param forceVertical - Override orientation detection. `true` = top/bottom
 *   anchored (arms-down), `false` = left/right anchored (arms-up),
 *   `undefined` = auto-detect from image dimensions.
 */
export function drawSegmentSvg(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  anchors: SegmentAnchor,
  torsoDims: TorsoDimensions,
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

    const crossWidth = Math.max(
      crossDim * torsoDims.crossSectionScale,
      MIN_CROSS_WIDTH,
    );
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

/* ── Hands (affine transform wrist → finger) ─────────────────────────── */

/** Hand size as fraction of torso hypotenuse — mirrors the head scaling approach. */
const HAND_HYPO_FRACTION = 0.3;
/** Fallback fraction (of torso width) when hypotenuse is not yet accumulated. */
const HAND_TORSO_FRACTION = 0.35;

/**
 * Render a hand SVG onto the canvas.
 *
 * Hand SVGs are **always saved in arms-up (horizontal) orientation**: left edge
 * anchors to the wrist, right edge to the finger end.  No arms-down branching
 * is needed here because the save pipeline normalises orientation at write time.
 *
 * Size is derived from the torso hypotenuse so the hand stays proportionate
 * to the body regardless of the drawn SVG's pixel dimensions — the same
 * method used for the head.
 */
export function drawHandSvg(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  anchors: SegmentAnchor,
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

    // Unit direction and perpendicular
    const ux = dx / segLen;
    const uy = dy / segLen;
    const px = -uy;
    const py = ux;

    // Uniform scale: torso-proportional (same pattern as drawHeadSvg)
    const torsoHyp = Math.abs(torsoDims.avgTorsoHypotenuse);
    const svgHyp = Math.hypot(svgW, svgH);
    const targetSize =
      torsoHyp > 0
        ? torsoHyp * HAND_HYPO_FRACTION
        : Math.abs(torsoDims.avgTorsoWidth) * HAND_TORSO_FRACTION;
    const uniformScale = targetSize / Math.max(1, svgHyp);
    const appliedScale = uniformScale * ((scale.x + scale.y) / 2);

    // Hand dimensions in screen pixels
    const handWidth = svgW * appliedScale;
    const hh = (svgH / 2) * appliedScale;

    // Place finger end at wrist + handWidth along the arm direction
    const extFinger: PointAnchor = {
      x: wrist.x + ux * handWidth,
      y: wrist.y + uy * handWidth,
    };

    // Source corners in SVG-pixel space
    const src0: PointAnchor = { x: 0, y: 0 };
    const src1: PointAnchor = { x: svgW, y: 0 };
    const src2: PointAnchor = { x: 0, y: svgH };

    // Horizontal orientation: SVG left → wrist, SVG right → finger
    const dst0: PointAnchor = { x: wrist.x + px * hh, y: wrist.y + py * hh };
    const dst1: PointAnchor = {
      x: extFinger.x + px * hh,
      y: extFinger.y + py * hh,
    };
    const dst2: PointAnchor = { x: wrist.x - px * hh, y: wrist.y - py * hh };

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
    const scaleX = torsoDims.crossSectionScale;

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

    const uniformScale = torsoDims.crossSectionScale;

    ctx.save();
    ctx.translate(from.x, from.y);
    ctx.rotate(angle - Math.PI / 2);
    ctx.scale(uniformScale * scale.x, uniformScale * scale.y);
    ctx.drawImage(img, -svgW / 2, 0, svgW, svgH);
    ctx.restore();
    return true;
  } catch {
    return false;
  }
}
