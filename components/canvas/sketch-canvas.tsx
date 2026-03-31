'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { RefCallback } from 'react';
import { getStroke } from 'perfect-freehand';
import type { Side, BodyPartName } from '@/hooks/use-sketch-canvas-rig';

interface Props {
  side: Side;
  part: BodyPartName;
  brushSize: number;
  color: string;
  isEraser: boolean;
  onMount: (
    side: Side,
    part: BodyPartName,
    el: HTMLCanvasElement | null,
  ) => void;
  onStrokeStart: (side: Side, part: BodyPartName) => void;
}

const CANVAS_SIZE = 400;

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
  onMount,
  onStrokeStart,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  // All brush props in a ref so event handlers never go stale
  const brushRef = useRef({ brushSize, color, isEraser });
  useEffect(() => {
    brushRef.current = { brushSize, color, isEraser };
  }, [brushSize, color, isEraser]);

  // CSS-to-canvas scale factor — updated on every pointer event
  const scaleRef = useRef(1);

  // Points accumulated for the current in-progress stroke: [x, y, pressure][]
  const currentPoints = useRef<[number, number, number][]>([]);

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
   * brushSize is in CSS pixels; multiplying by scale gives canvas units.
   */
  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const sx = CANVAS_SIZE / rect.width;
    const sy = CANVAS_SIZE / rect.height;
    scaleRef.current = (sx + sy) / 2;
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy,
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
      renderCurrentStroke(ctx);
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
      renderCurrentStroke(ctx);
    },
    [],
  );

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false;
    currentPoints.current = [];
    committedImage.current = null;
  }, []);

  return (
    <canvas
      ref={refCallback}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="w-full h-full block touch-none"
      style={{
        cursor: isEraser ? 'cell' : 'crosshair',
        backgroundColor: 'transparent',
      }}
    />
  );
}
