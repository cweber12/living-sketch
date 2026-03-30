'use client';

import { useRef, useCallback } from 'react';
import { BODY_PARTS } from '@/lib/constants/anchor-descriptors';

export type BodyPartName = (typeof BODY_PARTS)[number];
export type Side = 'front' | 'back';

const CANVAS_SIZE = 400;

type CanvasKey = `${Side}-${BodyPartName}`;

function makeKey(side: Side, part: BodyPartName): CanvasKey {
  return `${side}-${part}` as CanvasKey;
}

export function useSketchCanvasRig() {
  // One ref per canvas (28 total: 14 parts × 2 sides)
  const refs = useRef<Map<CanvasKey, HTMLCanvasElement | null>>(new Map());
  const undoStacks = useRef<Map<CanvasKey, ImageData[]>>(new Map());

  /** Called from the canvas component after each canvas mounts */
  const setCanvasRef = useCallback(
    (side: Side, part: BodyPartName, el: HTMLCanvasElement | null) => {
      refs.current.set(makeKey(side, part), el);
    },
    [],
  );

  function getContext(side: Side, part: BodyPartName) {
    const canvas = refs.current.get(makeKey(side, part));
    return canvas ? canvas.getContext('2d') : null;
  }

  /** Save current canvas pixels to the undo stack (call at stroke-start) */
  const pushUndoSnapshot = useCallback((side: Side, part: BodyPartName) => {
    const ctx = getContext(side, part);
    if (!ctx) return;
    const key = makeKey(side, part);
    const stack = undoStacks.current.get(key) ?? [];
    stack.push(ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE));
    // Keep at most 40 steps per canvas to cap memory
    if (stack.length > 40) stack.shift();
    undoStacks.current.set(key, stack);
  }, []);

  /** Restore the last snapshot for a single part/side */
  const undo = useCallback((side: Side, part: BodyPartName) => {
    const ctx = getContext(side, part);
    if (!ctx) return;
    const key = makeKey(side, part);
    const stack = undoStacks.current.get(key);
    if (!stack || stack.length === 0) return;
    const snapshot = stack.pop()!;
    ctx.putImageData(snapshot, 0, 0);
    undoStacks.current.set(key, stack);
  }, []);

  /** Clear a single part canvas */
  const clearPart = useCallback((side: Side, part: BodyPartName) => {
    const ctx = getContext(side, part);
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }, []);

  /** Clear ALL 28 canvases */
  const clearAll = useCallback(() => {
    refs.current.forEach((canvas) => {
      canvas?.getContext('2d')?.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    });
    undoStacks.current.clear();
  }, []);

  /**
   * Export all canvases as WebP data URLs.
   * Returns `{ front: { [partName]: dataURL }, back: { [partName]: dataURL } }`
   * Empty canvases return null.
   */
  const exportAll = useCallback((): {
    front: Partial<Record<BodyPartName, string>>;
    back: Partial<Record<BodyPartName, string>>;
  } => {
    const result: {
      front: Partial<Record<BodyPartName, string>>;
      back: Partial<Record<BodyPartName, string>>;
    } = { front: {}, back: {} };

    for (const side of ['front', 'back'] as Side[]) {
      for (const part of BODY_PARTS) {
        const canvas = refs.current.get(makeKey(side, part));
        if (!canvas) continue;
        // Skip truly blank canvases to avoid storing empty images
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const data = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
          const isBlank = data.every((v) => v === 0);
          if (isBlank) continue;
        }
        result[side][part] = canvas.toDataURL('image/webp', 0.9);
      }
    }
    return result;
  }, []);

  return {
    setCanvasRef,
    pushUndoSnapshot,
    undo,
    clearPart,
    clearAll,
    exportAll,
  };
}
