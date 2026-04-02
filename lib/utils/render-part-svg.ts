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
import {
  drawTorsoSvg,
  drawHeadSvg,
  drawSegmentSvg,
  drawHandSvg,
  drawLegSvg,
  drawFootSvg,
} from './drawing-utils';
import { TorsoDimensions } from './torso-dimensions';
import { EarDistance } from './ear-distance';
import type { PointAnchor, SegmentAnchor, QuadAnchor } from '@/lib/types';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  torsoDims: TorsoDimensions;
  earDist: EarDistance;
  shifts: ShiftFactors;
  scales: ScaleFactors;
  /** true when SVGs were drawn in arms-down pose (top/bottom anchored) */
  armsDown: boolean;
  /** When true, draw anchor points and vectors over SVG parts */
  showAnchors?: boolean;
  /** Optional background fill colour (CSS colour string). */
  bgColor?: string;
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
      rc.torsoDims,
      rc.scales.armScale,
      rc.armsDown,
    );
  }

  /* Hands — dedicated affine transform with armsDown toggle */
  if (isHand) {
    const a = setHandAnchors(
      part,
      scaledLandmarks,
      map as { start: number; end: number },
      rc.torsoDims,
      rc.shifts,
    );
    if (!a) return false;
    return drawHandSvg(
      rc.ctx,
      img,
      a,
      rc.armsDown,
      part,
      rc.torsoDims,
      rc.scales.handScale,
    );
  }

  /* Legs — dedicated rotate+scale drawing */
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

  /* Feet — dedicated rotate+scale drawing */
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
 * Uses per-section facing direction (upper body vs lower body) for accurate
 * front/back SVG selection. Lower arm follows upper arm canvas; lower leg
 * follows lower body.
 */
export function renderFrame(
  scaledLandmarks: LandmarkFrame,
  svgImages: Record<string, HTMLImageElement>,
  rc: RenderContext,
) {
  rc.ctx.clearRect(0, 0, rc.width, rc.height);

  // Fill background colour when specified
  if (rc.bgColor) {
    rc.ctx.fillStyle = rc.bgColor;
    rc.ctx.fillRect(0, 0, rc.width, rc.height);
  }

  const ls = scaledLandmarks[11]; // left shoulder
  const rs = scaledLandmarks[12]; // right shoulder
  const lh = scaledLandmarks[23]; // left hip
  const rh = scaledLandmarks[24]; // right hip

  // Update per-section facing (mirrored view: left x > right x = front)
  if (ls && rs) {
    rc.torsoDims.updateUpperBodyFacing(ls.x, rs.x);
    // Keep cross-product for backward-compat isFront getter
    if (lh) {
      const v1x = rs.x - ls.x;
      const v1y = rs.y - ls.y;
      const v2x = lh.x - ls.x;
      const v2y = lh.y - ls.y;
      rc.torsoDims.updateFacing(v1x * v2y - v1y * v2x);
    }
  }
  if (lh && rh) {
    rc.torsoDims.updateLowerBodyFacing(lh.x, rh.x);
  }

  // Update arm same-direction tracking for lower-arm canvas flip
  const leftUpperArmDx =
    (scaledLandmarks[13]?.x ?? 0) - (scaledLandmarks[11]?.x ?? 0);
  const leftLowerArmDx =
    (scaledLandmarks[15]?.x ?? 0) - (scaledLandmarks[13]?.x ?? 0);
  rc.torsoDims.updateLeftArmSameDir(leftUpperArmDx, leftLowerArmDx);

  const rightUpperArmDx =
    (scaledLandmarks[14]?.x ?? 0) - (scaledLandmarks[12]?.x ?? 0);
  const rightLowerArmDx =
    (scaledLandmarks[16]?.x ?? 0) - (scaledLandmarks[14]?.x ?? 0);
  rc.torsoDims.updateRightArmSameDir(rightUpperArmDx, rightLowerArmDx);

  const upperFront = rc.torsoDims.isUpperBodyFront;
  const lowerFront = rc.torsoDims.isLowerBodyFront;

  /**
   * Per-part facing:
   * - Head, torso, upper arms, hands → upper body facing
   * - Lower arm → upper arm facing; if arm segments point same direction,
   *   use opposite canvas (anatomically correct for straight arm view)
   * - Legs, feet → lower body facing
   */
  function getFacingForPart(part: string): boolean {
    switch (part) {
      case 'leftLowerArm':
        return rc.torsoDims.isLeftArmSameDir ? !upperFront : upperFront;
      case 'rightLowerArm':
        return rc.torsoDims.isRightArmSameDir ? !upperFront : upperFront;
      case 'head':
      case 'torso':
      case 'leftUpperArm':
      case 'rightUpperArm':
      case 'leftHand':
      case 'rightHand':
        return upperFront;
      default:
        // All legs and feet use lower body facing
        return lowerFront;
    }
  }

  // Pick front or back SVG for a given part
  const getImg = (part: string): HTMLImageElement | undefined => {
    const isFront = getFacingForPart(part);
    if (!isFront) {
      const backKey = `${part}-back`;
      if (svgImages[backKey]) return svgImages[backKey];
    }
    return svgImages[part];
  };

  // Canonical part list from ANCHOR_MAP (excludes '-back' alternate keys)
  const partKeys = Object.keys(ANCHOR_MAP) as (keyof typeof ANCHOR_MAP)[];

  if (upperFront) {
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

  // Draw anchor overlay when enabled
  if (rc.showAnchors) {
    drawAnchorOverlay(scaledLandmarks, rc);
  }
}

/* ── Anchor debug overlay ─────────────────────────────────────────────── */

const ANCHOR_COLOR = 'rgba(0, 200, 255, 0.8)';
const ANCHOR_RADIUS = 4;

function drawDot(ctx: CanvasRenderingContext2D, p: PointAnchor) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, ANCHOR_RADIUS, 0, 2 * Math.PI);
  ctx.fill();
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  a: PointAnchor,
  b: PointAnchor,
) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function drawAnchorOverlay(scaledLandmarks: LandmarkFrame, rc: RenderContext) {
  const { ctx } = rc;
  ctx.save();
  ctx.fillStyle = ANCHOR_COLOR;
  ctx.strokeStyle = ANCHOR_COLOR;
  ctx.lineWidth = 1.5;

  for (const part of Object.keys(ANCHOR_MAP) as (keyof typeof ANCHOR_MAP)[]) {
    const map = ANCHOR_MAP[part];
    const isTorso = part === 'torso';
    const isHead = part === 'head';
    const isFoot = part.includes('Foot');

    if (isTorso) {
      const a = setTorsoAnchors(
        scaledLandmarks,
        map as typeof ANCHOR_MAP.torso,
        rc.torsoDims,
        rc.shifts,
      );
      if (a) {
        const q = a as QuadAnchor;
        drawDot(ctx, q.tl);
        drawDot(ctx, q.tr);
        drawDot(ctx, q.bl);
        drawDot(ctx, q.br);
        drawLine(ctx, q.tl, q.tr);
        drawLine(ctx, q.tr, q.br);
        drawLine(ctx, q.br, q.bl);
        drawLine(ctx, q.bl, q.tl);
      }
    } else if (isHead) {
      const a = setHeadAnchors(
        scaledLandmarks,
        map as typeof ANCHOR_MAP.head,
        rc.torsoDims,
        rc.earDist,
        rc.shifts,
      );
      if (a) {
        drawDot(ctx, a.baseAnchor);
        drawDot(ctx, a.leftAnchor);
        drawDot(ctx, a.rightAnchor);
        drawLine(ctx, a.leftAnchor, a.rightAnchor);
        drawLine(ctx, a.baseAnchor, {
          x: (a.leftAnchor.x + a.rightAnchor.x) / 2,
          y: (a.leftAnchor.y + a.rightAnchor.y) / 2,
        });
      }
    } else if (isFoot) {
      const a = setFootAnchors(
        part,
        scaledLandmarks,
        map as { ankle?: number; foot?: number; start?: number; end?: number },
        rc.torsoDims,
        rc.shifts,
      );
      if (a) {
        const s = a as SegmentAnchor;
        drawDot(ctx, s.from);
        drawDot(ctx, s.to);
        drawLine(ctx, s.from, s.to);
      }
    } else if (part.includes('Arm')) {
      const a = setArmAnchors(
        part,
        scaledLandmarks,
        map as { start: number; end: number },
        rc.torsoDims,
        rc.shifts,
      );
      if (a) {
        const s = a as SegmentAnchor;
        drawDot(ctx, s.from);
        drawDot(ctx, s.to);
        drawLine(ctx, s.from, s.to);
      }
    } else if (part.includes('Hand')) {
      const a = setHandAnchors(
        part,
        scaledLandmarks,
        map as { start: number; end: number },
        rc.torsoDims,
        rc.shifts,
      );
      if (a) {
        const s = a as SegmentAnchor;
        drawDot(ctx, s.from);
        drawDot(ctx, s.to);
        drawLine(ctx, s.from, s.to);
      }
    } else if (part.includes('Leg')) {
      const a = setLegAnchors(
        part,
        scaledLandmarks,
        map as { start: number; end: number },
        rc.torsoDims,
        rc.shifts,
      );
      if (a) {
        const s = a as SegmentAnchor;
        drawDot(ctx, s.from);
        drawDot(ctx, s.to);
        drawLine(ctx, s.from, s.to);
      }
    }
  }

  ctx.restore();
}
