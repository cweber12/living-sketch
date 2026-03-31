import type { LandmarkFrame, ShiftFactors, ScaleFactors } from '@/lib/types';
import { ANCHOR_MAP } from '@/lib/constants';
import { validateAnchors } from './validation-utils';
import { getSvgSize } from './svg-utils';
import {
  setTorsoAnchors,
  setHeadAnchors,
  setArmAnchors,
  setHandAnchors,
  setLegAnchors,
  setFootAnchors,
} from './set-anchors';
import {
  drawTorsoSvg,
  drawHeadSvg,
  drawArmSvg,
  drawHandSvg,
  drawLegSvg,
  drawFootSvg,
} from './drawing-utils';
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

  /* Arms */
  if (isArm) {
    const a = setArmAnchors(
      part,
      scaledLandmarks,
      map as { start: number; end: number },
      rc.torsoDims,
      rc.shifts,
    );
    if (!a) return false;
    return drawArmSvg(rc.ctx, img, a, part, rc.torsoDims, rc.scales.armScale);
  }

  /* Hands */
  if (isHand) {
    const a = setHandAnchors(
      part,
      scaledLandmarks,
      map as { wrist?: number; elbow?: number; start?: number; end?: number },
      rc.torsoDims,
      rc.shifts,
    );
    if (!a) return false;
    const { w, h } = getSvgSize(img);
    const armsDown = h > w;
    return drawHandSvg(
      rc.ctx,
      img,
      a,
      armsDown,
      part,
      rc.torsoDims,
      rc.scales.handScale,
    );
  }

  /* Legs */
  if (isLeg) {
    const a = setLegAnchors(
      part,
      scaledLandmarks,
      map as { start: number; end: number },
      rc.torsoDims,
      rc.shifts,
    );
    if (!a) return false;
    return drawLegSvg(rc.ctx, img, a, rc.torsoDims, rc.scales.legScale);
  }

  /* Feet */
  if (isFoot) {
    const a = setFootAnchors(
      part,
      scaledLandmarks,
      map as { ankle?: number; foot?: number; start?: number; end?: number },
      rc.torsoDims,
      rc.shifts,
    );
    if (!a) return false;
    return drawFootSvg(rc.ctx, img, a, rc.torsoDims, rc.scales.footScale);
  }

  return false;
}

/**
 * Render ALL body parts for a single frame.
 * Renders torso first, then head/limbs — order matters for z-layering.
 */
export function renderFrame(
  scaledLandmarks: LandmarkFrame,
  svgImages: Record<string, HTMLImageElement>,
  rc: RenderContext,
) {
  rc.ctx.clearRect(0, 0, rc.width, rc.height);

  // Draw torso first (back layer)
  if (svgImages.torso) {
    renderPartSvg('torso', svgImages.torso, scaledLandmarks, rc);
  }

  // Then remaining parts
  const parts = Object.keys(svgImages).filter((p) => p !== 'torso');
  for (const part of parts) {
    renderPartSvg(part, svgImages[part], scaledLandmarks, rc);
  }
}
