'use client';

import { useRef, useEffect, useCallback } from 'react';
import { CONNECTED_KEYPOINTS } from '@/lib/constants/landmark-descriptors';
import { getActiveTheme } from '@/lib/theme';
import type { LandmarkFrame, Keypoint } from '@/lib/types';

interface PoseCanvasProps {
  width: number;
  height: number;
  landmarks: LandmarkFrame | null;
}

export function PoseCanvas({ width, height, landmarks }: PoseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const themeRef = useRef(getActiveTheme());

  // Update theme when system preference changes
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      themeRef.current = getActiveTheme();
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const draw = useCallback(
    (frame: LandmarkFrame | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);
      if (!frame || frame.length === 0) return;

      const theme = themeRef.current;

      // Draw connections
      ctx.strokeStyle = theme.connectors;
      ctx.lineWidth = 2;
      for (const [i, j] of CONNECTED_KEYPOINTS) {
        const a = frame[i];
        const b = frame[j];
        if (a?.x != null && b?.x != null) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Draw keypoints
      for (let idx = 0; idx < frame.length; idx++) {
        const kp: Keypoint | undefined = frame[idx];
        if (!kp || kp.x == null || kp.y == null) continue;

        // Color by side: left (odd) vs right (even) vs center
        if (idx >= 11 && idx <= 12) {
          ctx.fillStyle = theme.landmarkCenter; // shoulders — center
        } else if (idx >= 23 && idx <= 24) {
          ctx.fillStyle = theme.landmarkCenter; // hips — center
        } else if (idx % 2 === 1) {
          ctx.fillStyle = theme.landmarkLeft;
        } else {
          ctx.fillStyle = theme.landmarkRight;
        }

        ctx.beginPath();
        ctx.arc(kp.x, kp.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [width, height],
  );

  useEffect(() => {
    draw(landmarks);
  }, [landmarks, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
    />
  );
}
