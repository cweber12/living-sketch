'use client';

import { useRef, useEffect } from 'react';
import type { LandmarkFrame, ShiftFactors, ScaleFactors } from '@/lib/types';
import { renderFrame } from '@/lib/utils/render-part-svg';
import { TorsoDimensions } from '@/lib/utils/torso-dimensions';
import { EarDistance } from '@/lib/utils/ear-distance';

const FPS = 30;
const FRAME_MS = 1000 / FPS;

interface AnimationCanvasProps {
  frames: LandmarkFrame[];
  svgImages: Record<string, HTMLImageElement>;
  shifts: ShiftFactors;
  scales: ScaleFactors;
  playing: boolean;
  width: number;
  height: number;
}

export default function AnimationCanvas({
  frames,
  svgImages,
  shifts,
  scales,
  playing,
  width,
  height,
}: AnimationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIdx = useRef(0);
  const rafId = useRef(0);
  const lastTime = useRef(0);
  const torsoDims = useRef(new TorsoDimensions());
  const earDist = useRef(new EarDistance());

  const drawRef = useRef<((now: number) => void) | null>(null);

  // Keep drawRef up-to-date with latest props (inside useEffect to satisfy React 19)
  useEffect(() => {
    drawRef.current = (now: number) => {
      if (!canvasRef.current || frames.length === 0) return;
      const elapsed = now - lastTime.current;
      if (elapsed >= FRAME_MS) {
        lastTime.current = now - (elapsed % FRAME_MS);
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        renderFrame(frames[frameIdx.current], svgImages, {
          ctx,
          width,
          height,
          torsoDims: torsoDims.current,
          earDist: earDist.current,
          shifts,
          scales,
        });

        frameIdx.current = (frameIdx.current + 1) % frames.length;
      }
      rafId.current = requestAnimationFrame((t) => drawRef.current?.(t));
    };
  }, [frames, svgImages, shifts, scales, width, height]);

  // Start / stop playback
  useEffect(() => {
    if (playing && frames.length > 0) {
      lastTime.current = performance.now();
      frameIdx.current = 0;
      torsoDims.current = new TorsoDimensions();
      earDist.current = new EarDistance();
      rafId.current = requestAnimationFrame((t) => drawRef.current?.(t));
    }
    return () => cancelAnimationFrame(rafId.current);
  }, [playing, frames]);

  // Re-render current frame when shifts/scales change while paused
  useEffect(() => {
    if (playing || frames.length === 0) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const idx = Math.min(frameIdx.current, frames.length - 1);
    renderFrame(frames[idx], svgImages, {
      ctx,
      width,
      height,
      torsoDims: torsoDims.current,
      earDist: earDist.current,
      shifts,
      scales,
    });
  }, [shifts, scales, playing, frames, svgImages, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-950"
    />
  );
}
