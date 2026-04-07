'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { RefCallback } from 'react';
import { getStroke } from 'perfect-freehand';
import type { Side, BodyPartName } from '@/hooks/use-sketch-canvas-rig';

export type ShapeTool = 'pen' | 'line' | 'circle' | 'rect' | 'ellipse';

interface Props {
  side: Side;
  part: BodyPartName;
  brushSize: number;
  color: string;
  isEraser: boolean;
  tool?: ShapeTool;
  onMount: (
    side: Side,
    part: BodyPartName,
    el: HTMLCanvasElement | null,
  ) => void;
  onStrokeStart: (side: Side, part: BodyPartName) => void;
  onStrokeEnd?: (side: Side, part: BodyPartName) => void;
}

const CANVAS_SIZE = 400;

/**
 * Generate a CSS cursor string showing a circle matching the current brush size.
 * Uses an inline SVG data URI; the hotspot is centred on the circle.
 */
function makeBrushCursor(
  size: number,
  color: string,
  isEraser: boolean,
): string {
  const diameter = Math.max(size, 2);
  const pad = 4;
  const total = diameter + pad * 2;
  const c = total / 2;
  const r = diameter / 2;

  const circleContent = isEraser
    ? `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#ff4444" stroke-width="1.5" stroke-dasharray="3,2"/>`
    : `<circle cx="${c}" cy="${c}" r="${r}" fill="${color}" fill-opacity="0.22" stroke="#aaa" stroke-width="1"/><line x1="${c - 2}" y1="${c}" x2="${c + 2}" y2="${c}" stroke="white" stroke-width="0.75"/><line x1="${c}" y1="${c - 2}" x2="${c}" y2="${c + 2}" stroke="white" stroke-width="0.75"/>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${total}">${circleContent}</svg>`;
  const hotspot = Math.round(c);
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotspot} ${hotspot}, ${isEraser ? 'cell' : 'crosshair'}`;
}

/**
 * Convert perfect-freehand outline points into an SVG path string.
 * Uses quadratic bezier curves through midpoints for smooth closed shapes.
 */
function toSvgPath(stroke: number[][]): string {
  if (!stroke.length) return '';
  const d = stroke.reduce(
    (
      acc: (string | number)[],
      [x0, y0]: number[],
      i: number,
      arr: number[][],
    ) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ['M', ...stroke[0], 'Q'],
  );
  return [...d, 'Z'].join(' ');
}

export function SketchCanvas({
  side,
  part,
  brushSize,
  color,
  isEraser,
  tool = 'pen',
  onMount,
  onStrokeStart,
  onStrokeEnd,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  // All brush props in a ref so event handlers never go stale
  const brushRef = useRef({ brushSize, color, isEraser, tool });
  useEffect(() => {
    brushRef.current = { brushSize, color, isEraser, tool };
  }, [brushSize, color, isEraser, tool]);

  // CSS-to-canvas scale factor — updated on every pointer event
  const scaleRef = useRef(1);

  // Points accumulated for the current in-progress stroke: [x, y, pressure][]
  const currentPoints = useRef<[number, number, number][]>([]);

  // Start position for shape tools
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);

  // Canvas state captured just before the stroke began (for live redraw)
  const committedImage = useRef<ImageData | null>(null);

  // Register ref with the rig
  const refCallback: RefCallback<HTMLCanvasElement> = useCallback(
    (el) => {
      canvasRef.current = el;
      if (el) {
        el.width = CANVAS_SIZE;
        el.height = CANVAS_SIZE;
      }
      onMount(side, part, el);
    },
    [side, part, onMount],
  );

  /**
   * Map a pointer event to canvas-buffer coordinates and update the scale ref.
   * Uses offsetX/offsetY (relative to the element's own CSS box) so that
   * ancestor CSS zoom or transform: scale do not cause coordinate misalignment.
   */
  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    // offsetWidth/Height give the CSS layout size before any ancestor transforms
    const cssW = canvas.offsetWidth || CANVAS_SIZE;
    const cssH = canvas.offsetHeight || CANVAS_SIZE;
    const sx = CANVAS_SIZE / cssW;
    const sy = CANVAS_SIZE / cssH;
    scaleRef.current = (sx + sy) / 2;
    const nativeE = e.nativeEvent as PointerEvent;
    return {
      x: nativeE.offsetX * sx,
      y: nativeE.offsetY * sy,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  }

  /** Render the current in-progress stroke on top of committedImage. */
  function renderCurrentStroke(ctx: CanvasRenderingContext2D) {
    const pts = currentPoints.current;
    if (!pts.length) return;

    const { brushSize: bs, color: c, isEraser: erase } = brushRef.current;

    // Brush size is defined in CSS pixels; scale to canvas-buffer pixels
    const canvasSize = bs * scaleRef.current;

    const outline = getStroke(pts, {
      size: canvasSize,
      thinning: 0.4,
      smoothing: 0.5,
      streamline: 0.4,
      simulatePressure: true,
      last: false,
    });

    if (!outline.length) return;

    const path = new Path2D(toSvgPath(outline));

    if (erase) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = c;
    }
    ctx.fill(path);
    ctx.globalCompositeOperation = 'source-over';
  }

  /** Render a shape preview from startPos to current pos */
  function renderShape(
    ctx: CanvasRenderingContext2D,
    start: { x: number; y: number },
    end: { x: number; y: number },
  ) {
    const {
      brushSize: bs,
      color: c,
      isEraser: erase,
      tool: t,
    } = brushRef.current;
    const lw = bs * scaleRef.current;

    if (erase) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = c;
      ctx.fillStyle = 'transparent';
    }
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (t === 'line') {
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    } else if (t === 'rect') {
      ctx.strokeRect(
        Math.min(start.x, end.x),
        Math.min(start.y, end.y),
        Math.abs(end.x - start.x),
        Math.abs(end.y - start.y),
      );
    } else if (t === 'circle') {
      const r = Math.hypot(end.x - start.x, end.y - start.y);
      ctx.arc(start.x, start.y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (t === 'ellipse') {
      const rx = Math.abs(end.x - start.x);
      const ry = Math.abs(end.y - start.y);
      const cx = (start.x + end.x) / 2;
      const cy = (start.y + end.y) / 2;
      ctx.ellipse(cx, cy, rx / 2, ry / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      onStrokeStart(side, part);
      isDrawing.current = true;

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      // Snapshot canvas state before this stroke (used for live redraw)
      committedImage.current = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const pos = getPos(e);
      currentPoints.current = [[pos.x, pos.y, pos.pressure]];
      shapeStartRef.current = { x: pos.x, y: pos.y };

      if (brushRef.current.tool === 'pen') {
        renderCurrentStroke(ctx);
      }
    },
    [side, part, onStrokeStart],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current) return;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      const pos = getPos(e);
      currentPoints.current.push([pos.x, pos.y, pos.pressure]);

      // Restore baseline, then redraw full stroke outline from scratch
      if (committedImage.current) {
        ctx.putImageData(committedImage.current, 0, 0);
      }

      if (brushRef.current.tool === 'pen') {
        renderCurrentStroke(ctx);
      } else if (shapeStartRef.current) {
        renderShape(ctx, shapeStartRef.current, { x: pos.x, y: pos.y });
      }
    },
    [],
  );

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false;
    currentPoints.current = [];
    shapeStartRef.current = null;
    committedImage.current = null;
    onStrokeEnd?.(side, part);
  }, [side, part, onStrokeEnd]);

  return (
    <canvas
      ref={refCallback}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="w-full h-full block touch-none"
      style={{
        cursor: makeBrushCursor(brushSize, color, isEraser),
        backgroundColor: 'transparent',
      }}
    />
  );
}
