import type { LandmarkFrame, ShiftFactors, ScaleFactors } from '@/lib/types';
import { ANCHOR_MAP } from '@/lib/constants';
import { validateAnchors } from './validation-utils';
import {
  setTorsoAnchors,
  setHeadAnchors,
  setArmAnchors,
  setHandAnchors,
  setLegAnchors,
  setFootAnchors,
} from './set-anchors';
import { drawTorsoSvg, drawHeadSvg, drawSegmentSvg } from './drawing-utils';
import { TorsoDimensions } from './torso-dimensions';
import { EarDistance } from './ear-distance';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  torsoDims: TorsoDimensions;
  earDist: EarDistance;
  shifts: ShiftFactors;
  scales: ScaleFactors;
}

/**
 * Render a single body-part SVG onto the canvas.
 * Returns true when something was drawn.
 */
export function renderPartSvg(
  part: string,
  img: HTMLImageElement,
  scaledLandmarks: LandmarkFrame,
  rc: RenderContext,
): boolean {
  const map = ANCHOR_MAP[part as keyof typeof ANCHOR_MAP];
  if (!map || !img) return false;

  const indices = Object.values(map).filter(
    (v) => typeof v === 'number',
  ) as number[];
  const anchors = indices.map((i) => scaledLandmarks[i]);
  if (validateAnchors(anchors, rc.width, rc.height)) return false;

  const isTorso = part.includes('torso');
  const isHead = part.includes('head');
  const isArm = part.includes('Arm');
  const isHand = part.includes('Hand');
  const isLeg = part.includes('Leg');
  const isFoot = part.includes('Foot');

  /* Torso */
  if (isTorso) {
    const a = setTorsoAnchors(
      scaledLandmarks,
      map as typeof ANCHOR_MAP.torso,
      rc.torsoDims,
      rc.shifts,
    );
    if (!a) return false;
    return drawTorsoSvg(rc.ctx, img, a);
  }

  /* Head */
  if (isHead) {
    const a = setHeadAnchors(
      scaledLandmarks,
      map as typeof ANCHOR_MAP.head,
      rc.torsoDims,
      rc.earDist,
      rc.shifts,
    );
    if (!a) return false;
    return drawHeadSvg(rc.ctx, img, a, rc.torsoDims, rc.scales.headScale);
  }

  /* Arms — cross-width relative to shoulder width */
  if (isArm) {
    const a = setArmAnchors(
      part,
      scaledLandmarks,
      map as { start: number; end: number },
      rc.torsoDims,
      rc.shifts,
    );
    if (!a) return false;
    return drawSegmentSvg(
      rc.ctx,
      img,
      a,
      Math.abs(rc.torsoDims.avgTorsoWidth),
      rc.torsoDims.torsoSvgWidth,
      rc.scales.armScale,
    );
  }

  /* Hands — cross-width relative to shoulder width */
  if (isHand) {
    const a = setHandAnchors(
      part,
      scaledLandmarks,
      map as { start: number; end: number },
      rc.torsoDims,
      rc.shifts,
    );
    if (!a) return false;
    return drawSegmentSvg(
      rc.ctx,
      img,
      a,
      Math.abs(rc.torsoDims.avgTorsoWidth),
      rc.torsoDims.torsoSvgWidth,
      rc.scales.handScale,
    );
  }

  /* Legs — cross-width relative to hip width */
  if (isLeg) {
    const a = setLegAnchors(
      part,
      scaledLandmarks,
      map as { start: number; end: number },
      rc.torsoDims,
      rc.shifts,
    );
    if (!a) return false;
    return drawSegmentSvg(
      rc.ctx,
      img,
      a,
      Math.abs(rc.torsoDims.avgHipWidth),
      rc.torsoDims.torsoSvgWidth,
      rc.scales.legScale,
    );
  }

  /* Feet — cross-width relative to hip width */
  if (isFoot) {
    const a = setFootAnchors(
      part,
      scaledLandmarks,
      map as { ankle?: number; foot?: number; start?: number; end?: number },
      rc.torsoDims,
      rc.shifts,
    );
    if (!a) return false;
    return drawSegmentSvg(
      rc.ctx,
      img,
      a,
      Math.abs(rc.torsoDims.avgHipWidth),
      rc.torsoDims.torsoSvgWidth,
      rc.scales.footScale,
    );
  }

  return false;
}

/**
 * Render ALL body parts for a single frame.
 * Detects facing direction for front/back SVG selection and z-order.
 */
export function renderFrame(
  scaledLandmarks: LandmarkFrame,
  svgImages: Record<string, HTMLImageElement>,
  rc: RenderContext,
) {
  rc.ctx.clearRect(0, 0, rc.width, rc.height);

  // Detect facing direction via cross product of torso vectors
  const ls = scaledLandmarks[11]; // left shoulder
  const rs = scaledLandmarks[12]; // right shoulder
  const lh = scaledLandmarks[23]; // left hip
  if (ls && rs && lh) {
    const v1x = rs.x - ls.x;
    const v1y = rs.y - ls.y;
    const v2x = lh.x - ls.x;
    const v2y = lh.y - ls.y;
    const cross = v1x * v2y - v1y * v2x;
    rc.torsoDims.updateFacing(cross);
  }

  const facingFront = rc.torsoDims.isFront;

  // Pick front or back SVG for a given part
  const getImg = (part: string): HTMLImageElement | undefined => {
    if (!facingFront) {
      const backKey = `${part}-back`;
      if (svgImages[backKey]) return svgImages[backKey];
    }
    return svgImages[part];
  };

  // Canonical part list from ANCHOR_MAP (excludes '-back' alternate keys)
  const partKeys = Object.keys(ANCHOR_MAP) as (keyof typeof ANCHOR_MAP)[];

  if (facingFront) {
    // Front-facing: torso first (background), then limbs on top
    const torsoImg = getImg('torso');
    if (torsoImg) {
      renderPartSvg('torso', torsoImg, scaledLandmarks, rc);
    }
    for (const part of partKeys) {
      if (part === 'torso') continue;
      const img = getImg(part);
      if (img) renderPartSvg(part, img, scaledLandmarks, rc);
    }
  } else {
    // Back-facing: limbs first, then torso on top (foreground)
    for (const part of partKeys) {
      if (part === 'torso') continue;
      const img = getImg(part);
      if (img) renderPartSvg(part, img, scaledLandmarks, rc);
    }
    const torsoImg = getImg('torso');
    if (torsoImg) {
      renderPartSvg('torso', torsoImg, scaledLandmarks, rc);
    }
  }
}
