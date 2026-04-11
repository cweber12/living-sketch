'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { CONNECTED_KEYPOINTS } from '@/lib/constants/landmark-descriptors';
import { getActiveTheme } from '@/lib/theme';
import { objectContainTransform } from '@/lib/utils/display-transform';
import type { LandmarkFrame, Keypoint } from '@/lib/types';

/**
 * PoseCanvas — draws a MediaPipe pose skeleton overlay.
 *
 * Landmarks are in source-frame coordinates (the same pixel space as the
 * original video frame: 0–sourceWidth by 0–sourceHeight). The canvas tracks
 * its own CSS display size via ResizeObserver and applies an internal
 * object-contain transform when drawing, so the overlay always aligns with a
 * `object-fit: contain` video regardless of the container's aspect ratio.
 *
 * Coordinate spaces:
 *   sourceWidth/sourceHeight — landmark coordinate space (e.g. video px)
 *   canvas width/height attr — CSS display size (updated by ResizeObserver)
 *   draw coords = lm * scale + offset (computed from both)
 */
interface PoseCanvasProps {
  /** Width of the landmark coordinate space (source frame width in px). */
  sourceWidth: number;
  /** Height of the landmark coordinate space (source frame height in px). */
  sourceHeight: number;
  landmarks: LandmarkFrame | null;
  className?: string;
}

export function PoseCanvas({
  sourceWidth,
  sourceHeight,
  landmarks,
  className = 'absolute inset-0 pointer-events-none',
}: PoseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRef = useRef(getActiveTheme());

  // Canvas raster size = CSS display size, tracked without a state-driven
  // resize cycle. We store it in a ref and update canvas attributes directly
  // inside the ResizeObserver callback, which avoids re-rendering the whole
  // component on every container resize.
  const [containerSize, setContainerSize] = useState({ w: 1, h: 1 });

  // Update theme when system preference changes
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      themeRef.current = getActiveTheme();
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // Track canvas CSS display size via ResizeObserver.
  // State update triggers a re-render only on actual size changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver((entries) => {
      const { width: w, height: h } = entries[0].contentRect;
      if (w > 0 && h > 0) {
        setContainerSize((prev) =>
          Math.round(w) === prev.w && Math.round(h) === prev.h
            ? prev
            : { w: Math.round(w), h: Math.round(h) },
        );
      }
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const { w: cW, h: cH } = containerSize;

  // Object-contain transform: maps source-space landmarks to display space.
  // Mirrors CSS `object-fit: contain` — uniform scale + centered offset.
  const { scale, offsetX, offsetY } = objectContainTransform(
    sourceWidth,
    sourceHeight,
    cW,
    cH,
  );

  const draw = useCallback(
    (frame: LandmarkFrame | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, cW, cH);
      if (!frame || frame.length === 0) return;

      const theme = themeRef.current;

      // Inline helpers: source coords → canvas display coords
      const tx = (x: number) => x * scale + offsetX;
      const ty = (y: number) => y * scale + offsetY;

      // Draw skeleton connections
      ctx.strokeStyle = theme.connectors;
      ctx.lineWidth = 2;
      for (const [i, j] of CONNECTED_KEYPOINTS) {
        const a = frame[i];
        const b = frame[j];
        if (a?.x != null && b?.x != null) {
          ctx.beginPath();
          ctx.moveTo(tx(a.x), ty(a.y));
          ctx.lineTo(tx(b.x), ty(b.y));
          ctx.stroke();
        }
      }

      // Draw keypoints — colour by body side
      for (let idx = 0; idx < frame.length; idx++) {
        const kp: Keypoint | undefined = frame[idx];
        if (!kp || kp.x == null || kp.y == null) continue;

        if (idx >= 11 && idx <= 12) {
          ctx.fillStyle = theme.landmarkCenter; // shoulders
        } else if (idx >= 23 && idx <= 24) {
          ctx.fillStyle = theme.landmarkCenter; // hips
        } else if (idx % 2 === 1) {
          ctx.fillStyle = theme.landmarkLeft;
        } else {
          ctx.fillStyle = theme.landmarkRight;
        }

        ctx.beginPath();
        ctx.arc(tx(kp.x), ty(kp.y), 4, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [cW, cH, scale, offsetX, offsetY],
  );

  useEffect(() => {
    draw(landmarks);
  }, [landmarks, draw]);

  return (
    <canvas ref={canvasRef} width={cW} height={cH} className={className} />
  );
}
