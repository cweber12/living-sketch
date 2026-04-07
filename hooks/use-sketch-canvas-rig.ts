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

const SESSION_KEY = 'sketch-canvases';

export function useSketchCanvasRig() {
  // Active canvas refs — the rig draws to and reads from these
  const refs = useRef<Map<CanvasKey, HTMLCanvasElement | null>>(new Map());
  // Primary (body-grid) canvas refs — always mounted
  const primaryRefs = useRef<Map<CanvasKey, HTMLCanvasElement | null>>(
    new Map(),
  );
  const undoStacks = useRef<Map<CanvasKey, ImageData[]>>(new Map());
  // Global ordered history — every stroke from every canvas in draw order
  const globalHistory = useRef<Array<{ side: Side; part: BodyPartName }>>([]);

  /** Called from the body-grid canvas component after each canvas mounts.
   *  These are the "primary" canvases — always kept in the DOM. */
  const setCanvasRef = useCallback(
    (side: Side, part: BodyPartName, el: HTMLCanvasElement | null) => {
      const key = makeKey(side, part);
      refs.current.set(key, el);
      primaryRefs.current.set(key, el);
      if (el) {
        el.width = CANVAS_SIZE;
        el.height = CANVAS_SIZE;
        // Restore from session storage if available
        try {
          const stored = sessionStorage.getItem(SESSION_KEY);
          if (stored) {
            const data = JSON.parse(stored) as Record<string, string>;
            const url = data[key];
            if (url) {
              const img = new Image();
              img.onload = () => el.getContext('2d')?.drawImage(img, 0, 0);
              img.src = url;
            }
          }
        } catch {
          // ignore — sessionStorage may be unavailable
        }
      }
    },
    [],
  );

  /**
   * Called from a "zoom" (single-part mode) canvas.
   * On mount: copies content from the primary canvas so strokes are continuous.
   * On unmount: copies content back to the primary canvas before de-registering.
   */
  const setZoomCanvasRef = useCallback(
    (side: Side, part: BodyPartName, el: HTMLCanvasElement | null) => {
      const key = makeKey(side, part);
      if (el) {
        el.width = CANVAS_SIZE;
        el.height = CANVAS_SIZE;
        // Sync content from primary → zoom
        const primary = primaryRefs.current.get(key);
        if (primary) {
          const srcCtx = primary.getContext('2d');
          if (srcCtx) {
            const data = srcCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            el.getContext('2d')?.putImageData(data, 0, 0);
          }
        }
        refs.current.set(key, el);
      } else {
        // Sync content from zoom → primary before removing
        const active = refs.current.get(key);
        const primary = primaryRefs.current.get(key);
        if (active && primary && active !== primary) {
          const srcCtx = active.getContext('2d');
          if (srcCtx) {
            const data = srcCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            primary.getContext('2d')?.putImageData(data, 0, 0);
          }
        }
        // Restore primary as active
        refs.current.set(key, primary ?? null);
      }
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
    // Record in global history
    globalHistory.current.push({ side, part });
    if (globalHistory.current.length > 40 * 28) globalHistory.current.shift();
  }, []);

  /** Restore the last snapshot in global draw order (cross-canvas undo) */
  const undo = useCallback(() => {
    const entry = globalHistory.current.pop();
    if (!entry) return;
    const { side, part } = entry;
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
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  /** Persist all non-blank canvases to sessionStorage */
  const saveToSession = useCallback(() => {
    try {
      const data: Record<string, string> = {};
      for (const side of ['front', 'back'] as Side[]) {
        for (const part of BODY_PARTS) {
          // Always save from the primary canvas so data is consistent
          const canvas =
            primaryRefs.current.get(makeKey(side, part)) ??
            refs.current.get(makeKey(side, part));
          if (!canvas) continue;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          const pixels = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;
          if (pixels.some((v) => v !== 0)) {
            data[makeKey(side, part)] = canvas.toDataURL('image/webp', 0.7);
          }
        }
      }
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    } catch {
      // ignore — storage full or unavailable
    }
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
        // Export from primary canvas (body-grid) — always the source of truth
        const canvas =
          primaryRefs.current.get(makeKey(side, part)) ??
          refs.current.get(makeKey(side, part));
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

  /** Copy pixels from one canvas to another */
  const copyCanvas = useCallback(
    (
      fromSide: Side,
      fromPart: BodyPartName,
      toSide: Side,
      toPart: BodyPartName,
    ) => {
      const src = refs.current.get(makeKey(fromSide, fromPart));
      const dst = refs.current.get(makeKey(toSide, toPart));
      if (!src || !dst) return;
      const srcCtx = src.getContext('2d');
      const dstCtx = dst.getContext('2d');
      if (!srcCtx || !dstCtx) return;
      const data = srcCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      dstCtx.putImageData(data, 0, 0);
    },
    [],
  );

  /**
   * Copy pixels from one canvas to another with a horizontal mirror (flip X).
   */
  const mirrorCopyCanvas = useCallback(
    (
      fromSide: Side,
      fromPart: BodyPartName,
      toSide: Side,
      toPart: BodyPartName,
    ) => {
      const src = refs.current.get(makeKey(fromSide, fromPart));
      const dst = refs.current.get(makeKey(toSide, toPart));
      if (!src || !dst) return;
      const dstCtx = dst.getContext('2d');
      if (!dstCtx) return;
      dstCtx.save();
      dstCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      dstCtx.translate(CANVAS_SIZE, 0);
      dstCtx.scale(-1, 1);
      dstCtx.drawImage(src, 0, 0);
      dstCtx.restore();
    },
    [],
  );

  /**
   * Rotate a canvas 90° CW or CCW in-place.
   * Used when switching arm pose between up/down.
   */
  const rotatePartCanvas = useCallback(
    (side: Side, part: BodyPartName, degrees: 90 | -90) => {
      const canvas = refs.current.get(makeKey(side, part));
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const temp = document.createElement('canvas');
      temp.width = CANVAS_SIZE;
      temp.height = CANVAS_SIZE;
      const tCtx = temp.getContext('2d')!;
      const half = CANVAS_SIZE / 2;
      tCtx.translate(half, half);
      tCtx.rotate((degrees * Math.PI) / 180);
      tCtx.drawImage(canvas, -half, -half);
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.drawImage(temp, 0, 0);
    },
    [],
  );

  return {
    setCanvasRef,
    setZoomCanvasRef,
    pushUndoSnapshot,
    undo,
    clearPart,
    clearAll,
    exportAll,
    copyCanvas,
    mirrorCopyCanvas,
    rotatePartCanvas,
    saveToSession,
  };
}
