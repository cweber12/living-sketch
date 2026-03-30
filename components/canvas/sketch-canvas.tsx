'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { RefCallback } from 'react';
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
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Keep current brush props in a ref so event handlers never go stale
  const brushRef = useRef({ brushSize, color, isEraser });
  useEffect(() => {
    brushRef.current = { brushSize, color, isEraser };
  }, [brushSize, color, isEraser]);

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

  function getCanvasPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function applyBrushStyle(ctx: CanvasRenderingContext2D) {
    const { brushSize: bs, color: c, isEraser: erase } = brushRef.current;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = bs;
    if (erase) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = c;
      ctx.fillStyle = c;
    }
  }

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      onStrokeStart(side, part);
      isDrawing.current = true;
      const pos = getCanvasPos(e);
      lastPos.current = pos;

      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      applyBrushStyle(ctx);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, brushRef.current.brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    },
    [side, part, onStrokeStart],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing.current || !lastPos.current) return;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      const pos = getCanvasPos(e);
      applyBrushStyle(ctx);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPos.current = pos;
    },
    [],
  );

  const handlePointerUp = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  return (
    <canvas
      ref={refCallback}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className="w-full h-full block touch-none rounded"
      style={{
        cursor: isEraser ? 'cell' : 'crosshair',
        backgroundColor: 'transparent',
      }}
    />
  );
}
