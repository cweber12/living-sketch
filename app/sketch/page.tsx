'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  SketchCanvas,
  type ShapeTool,
} from '@/components/sketch/canvas/sketch-canvas';
import { useSketchCanvasRig } from '@/hooks/use-sketch-canvas-rig';
import { BODY_PARTS } from '@/lib/constants/anchor-descriptors';
import type { BodyPartName, Side } from '@/hooks/use-sketch-canvas-rig';
import {
  ToolbarLayout,
  PageToolbar,
} from '@/components/shared/toolbar/toolbar-main';
import { useDropdown } from '@/components/shared/toolbar/use-dropdown';
import { BodyThumbnail } from '@/components/sketch/body-thumbnail';
import { HistorySection } from '@/components/sketch/toolbar/history';
import {
  LayoutSection,
  type ArmPose,
  type ViewMode,
} from '@/components/sketch/toolbar/layout';
import { ToolsSection } from '@/components/sketch/toolbar/tools';
import {
  OptionsSection,
  DEFAULT_BRUSH,
} from '@/components/sketch/toolbar/options';
import {
  ColorSection,
  DEFAULT_COLOR_LIGHT,
  DEFAULT_COLOR_DARK,
} from '@/components/sketch/toolbar/color';
import {
  GRID_ARMS_UP,
  GRID_ARMS_DOWN,
  GRID_AREA,
  PART_LABEL,
  PART_PROPORTIONS,
  PARTS_ORDER,
} from '@/components/sketch/sketch-constants';

const SESSION_STATE_KEY = 'sketch-page-state';

const DEFAULT_CANVAS_SIZE = 110;
const MOBILE_BP = 1024;

/* â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

/** Rotate a square data-URL image 90 degrees CW (+90) or CCW (-90) */
function rotateSquareDataURL(
  dataUrl: string,
  degrees: 90 | -90,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = img.naturalWidth;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.translate(size / 2, size / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -size / 2, -size / 2);
      resolve(canvas.toDataURL('image/webp', 0.9));
    };
    img.src = dataUrl;
  });
}

/** Parts that need rotation when arms are drawn in down-pose orientation */
const RIGHT_ARM_PARTS: BodyPartName[] = [
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
];
const LEFT_ARM_PARTS: BodyPartName[] = [
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
];

/**
 * Maps each front part to its mirrored back counterpart.
 * Left/right limbs swap (a rotated figure shows opposite limbs);
 * symmetric parts (head, torso) map to themselves.
 */
const MIRROR_PART_MAP: Record<BodyPartName, BodyPartName> = {
  head: 'head',
  torso: 'torso',
  rightUpperArm: 'leftUpperArm',
  rightLowerArm: 'leftLowerArm',
  rightHand: 'leftHand',
  leftUpperArm: 'rightUpperArm',
  leftLowerArm: 'rightLowerArm',
  leftHand: 'rightHand',
  rightUpperLeg: 'leftUpperLeg',
  rightLowerLeg: 'leftLowerLeg',
  rightFoot: 'leftFoot',
  leftUpperLeg: 'rightUpperLeg',
  leftLowerLeg: 'rightLowerLeg',
  leftFoot: 'rightFoot',
};

export default function SketchPage() {
  const [side, setSide] = useState<Side>('front');
  const [color, setColor] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? DEFAULT_COLOR_DARK
      : DEFAULT_COLOR_LIGHT,
  );
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH);
  const [isEraser, setIsEraser] = useState(false);

  const [armPose, setArmPose] = useState<ArmPose>('up'); // 'up' matches SSR; corrected post-hydration
  const [viewMode, setViewMode] = useState<ViewMode>('body');
  const [focusIdx, setFocusIdx] = useState(0);
  const [tool, setTool] = useState<ShapeTool>('pen');
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const { isOpen, toggle, close } = useDropdown();
  const [zoom, setZoom] = useState(() =>
    // On mobile, start zoomed in so head+torso fill the initial viewport
    typeof window !== 'undefined' && window.innerWidth < MOBILE_BP ? 1.5 : 1,
  );
  const [usedColors, setUsedColors] = useState<string[]>([]);
  const backInitialised = useRef(false);
  const [showCopyFront, setShowCopyFront] = useState(false);

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BP,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BP - 1}px)`);
    const handle = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handle(mq);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  // Update stroke color when OS color scheme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) =>
      setColor(e.matches ? DEFAULT_COLOR_DARK : DEFAULT_COLOR_LIGHT);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // On mount: detect browser reload and clear session, otherwise restore persisted state
  useEffect(() => {
    const navType = (
      performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined
    )?.type;
    if (navType === 'reload') {
      try {
        sessionStorage.removeItem('sketch-canvases');
        sessionStorage.removeItem(SESSION_STATE_KEY);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      const raw = sessionStorage.getItem(SESSION_STATE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as Partial<{
        side: Side;
        viewMode: ViewMode;
        focusIdx: number;
        zoom: number;
        brushSize: number;
        color: string;
        isEraser: boolean;
        usedColors: string[];
      }>;
      if (s.side === 'front' || s.side === 'back') setSide(s.side);
      if (s.viewMode === 'body' || s.viewMode === 'single')
        setViewMode(s.viewMode);
      if (typeof s.focusIdx === 'number') setFocusIdx(s.focusIdx);
      if (typeof s.zoom === 'number' && s.zoom > 0) setZoom(s.zoom);
      if (typeof s.brushSize === 'number' && s.brushSize > 0)
        setBrushSize(s.brushSize);
      if (typeof s.color === 'string' && s.color) setColor(s.color);
      if (typeof s.isEraser === 'boolean') setIsEraser(s.isEraser);
      if (Array.isArray(s.usedColors)) setUsedColors(s.usedColors);
    } catch {
      /* ignore */
    }
  }, []);

  // Persist page state to sessionStorage whenever relevant values change.
  // armPose is intentionally excluded â€” it must always reflect the actual device
  // orientation on load, not a stale persisted value.
  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_STATE_KEY,
        JSON.stringify({
          side,
          viewMode,
          focusIdx,
          zoom,
          brushSize,
          color,
          isEraser,
          usedColors,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [side, viewMode, focusIdx, zoom, brushSize, color, isEraser, usedColors]);

  // After hydration: correct arm pose to match the actual device orientation.
  // armPose initialises as 'up' (SSR-safe); this effect fixes it on the client.
  // We intentionally don't canvas-rotate here â€” canvases are still loading from
  // session at this point. The existing orientation-change listener handles
  // subsequent rotations.

  useEffect(() => {
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    const targetPose: ArmPose =
      window.innerWidth >= MOBILE_BP || isLandscape ? 'up' : 'down';
    setArmPose(targetPose);
  }, []); // run once after mount

  const effectiveArms: ArmPose = armPose; // orientation-managed via state
  const focusPart = PARTS_ORDER[focusIdx];

  const {
    setCanvasRef,
    setZoomCanvasRef,
    pushUndoSnapshot,
    undo,
    clearAll,
    exportAll,
    mirrorCopyCanvas,
    rotatePartCanvas,
    saveToSession,
  } = useSketchCanvasRig();

  // Stable ref to current armPose so the orientation effect below can read it
  // without re-subscribing every time armPose changes.
  const armPoseRef = useRef<ArmPose>(armPose);
  armPoseRef.current = armPose;

  // Auto-rotate arm canvases when mobile orientation changes
  useEffect(() => {
    if (!isMobile) return;
    const mq = window.matchMedia('(orientation: landscape)');
    const update = () => {
      const targetPose: ArmPose = mq.matches ? 'up' : 'down';
      if (targetPose === armPoseRef.current) return;
      const sides: Side[] = ['front', 'back'];
      const leftDeg: 90 | -90 = targetPose === 'down' ? -90 : 90;
      const rightDeg: 90 | -90 = targetPose === 'down' ? 90 : -90;
      for (const s of sides) {
        for (const part of LEFT_ARM_PARTS) rotatePartCanvas(s, part, leftDeg);
        for (const part of RIGHT_ARM_PARTS) rotatePartCanvas(s, part, rightDeg);
      }
      setArmPose(targetPose);
      saveToSession();
    };
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [isMobile, rotatePartCanvas, saveToSession]);

  /**
   * Change arm pose: rotate arm/hand canvases to match new orientation.
   * Front: L-arms CCW (-90Â°), R-arms CW (+90Â°) going to arms-down.
   * Reverse for going back to arms-up.
   */
  const handleArmPoseChange = useCallback(
    (newPose: ArmPose) => {
      if (newPose === armPose) return;
      const sides: Side[] = ['front', 'back'];
      const leftDeg: 90 | -90 = newPose === 'down' ? -90 : 90;
      const rightDeg: 90 | -90 = newPose === 'down' ? 90 : -90;
      for (const s of sides) {
        for (const part of LEFT_ARM_PARTS) rotatePartCanvas(s, part, leftDeg);
        for (const part of RIGHT_ARM_PARTS) rotatePartCanvas(s, part, rightDeg);
      }
      setArmPose(newPose);
      saveToSession();
    },
    [armPose, rotatePartCanvas, saveToSession],
  );

  /**
   * First time switching to back: auto-mirror all front canvases.
   * Subsequent times: show a dismissible "Copy Front" button.
   */
  const handleSideChange = useCallback(
    (newSide: Side) => {
      if (newSide === 'back') {
        if (!backInitialised.current) {
          backInitialised.current = true;
          for (const part of BODY_PARTS) {
            const backPart = MIRROR_PART_MAP[part];
            mirrorCopyCanvas('front', part, 'back', backPart);
          }
        } else {
          setShowCopyFront(true);
        }
      }
      setSide(newSide);
      // brief animation flag reserved for future transitions
      setTimeout(() => {}, 350);
    },
    [mirrorCopyCanvas],
  );

  const handleStrokeStart = useCallback(
    (strokeSide: Side, part: BodyPartName) => {
      pushUndoSnapshot(strokeSide, part);
      if (!isEraser) {
        setUsedColors((prev) =>
          prev.includes(color) ? prev : [...prev, color].slice(-12),
        );
      }
    },
    [pushUndoSnapshot, color, isEraser],
  );

  const handleStrokeEnd = useCallback(() => {
    saveToSession();
  }, [saveToSession]);

  const handleUndo = useCallback(() => {
    undo();
    saveToSession();
  }, [undo, saveToSession]);

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const images = exportAll();

      // When arms are drawn in down-pose orientation, rotate arm/hand canvases
      // back to T-pose (arms-up) orientation before saving, so the animation
      // pipeline receives consistently-oriented images.
      if (effectiveArms === 'down') {
        const sides: Side[] = ['front', 'back'];
        await Promise.all([
          ...sides.flatMap((s) =>
            RIGHT_ARM_PARTS.map(async (part) => {
              const url = images[s][part];
              if (url) images[s][part] = await rotateSquareDataURL(url, 90);
            }),
          ),
          ...sides.flatMap((s) =>
            LEFT_ARM_PARTS.map(async (part) => {
              const url = images[s][part];
              if (url) images[s][part] = await rotateSquareDataURL(url, -90);
            }),
          ),
        ]);
      }

      const setName = new Date().toISOString().replace(/[:.]/g, '-');
      const res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, setName }),
      });
      const json = (await res.json()) as {
        error?: string;
        details?: string[];
        paths?: string[];
      };
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      // Guard against mobile browsers that don't support WebP encoding:
      // the API would return HTTP 200 with an empty paths array.
      if (!json.paths?.length)
        throw new Error(
          'No images saved â€” canvas export may not be supported on this browser.',
        );
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  }, [exportAll, effectiveArms]);

  const goPrev = useCallback(
    () => setFocusIdx((i) => (i > 0 ? i - 1 : PARTS_ORDER.length - 1)),
    [],
  );
  const goNext = useCallback(
    () => setFocusIdx((i) => (i < PARTS_ORDER.length - 1 ? i + 1 : 0)),
    [],
  );
  const selectPart = useCallback((part: BodyPartName) => {
    const idx = PARTS_ORDER.indexOf(part);
    if (idx >= 0) setFocusIdx(idx);
  }, []);

  /* â”€â”€ Grid sizing â”€â”€ */
  const u = DEFAULT_CANVAS_SIZE;
  const armsUp = effectiveArms === 'up';
  const gridTemplate = armsUp ? GRID_ARMS_UP : GRID_ARMS_DOWN;

  // mobileU: unit size (px) that fits the body grid in the viewport at zoom=1.
  // The zoom factor is then baked directly into the effectiveU so that we avoid
  // using CSS `zoom:` on the grid (which causes browser layout quirks with grid
  // track sizing and coordinate-mapping issues on webkit).
  const mobileU =
    typeof window !== 'undefined'
      ? Math.max(
          20,
          Math.min(
            Math.floor((window.innerWidth - 20) / 4.3),
            Math.floor((window.innerHeight - 140) / 9.85),
          ),
        )
      : 80;
  // effectiveU incorporates the user's zoom so grid tracks are real px values.
  const effectiveU = (isMobile && viewMode === 'body' ? mobileU : u) * zoom;

  const armCol = effectiveU;
  const legCol = Math.round(effectiveU * 1.15);
  const handColUp = Math.round(effectiveU * 1.8); // slightly wider hand (was 1.75)
  const armColUp = Math.round(effectiveU * 1.4); // slightly wider arm (was 1.3)

  const gridCols = armsUp
    ? `${handColUp}px ${armColUp}px ${armColUp}px ${legCol}px ${legCol}px ${armColUp}px ${armColUp}px ${handColUp}px`
    : `${armCol}px ${legCol}px ${legCol}px ${armCol}px`;

  const gridRows = armsUp
    ? [
        effectiveU * 2.3, // head
        effectiveU * 1.1, // arm row (T-pose)
        effectiveU * 1.5, // torso lower
        effectiveU * 1.6, // upper legs (was 1.75)
        effectiveU * 1.4, // lower legs (was 1.6)
        effectiveU * 1.4, // feet (was 1.6)
      ]
        .map((v) => `${Math.round(v)}px`)
        .join(' ')
    : [
        effectiveU * 2.3, // head
        effectiveU * 1.5, // upper arm / torso top (was 1.3)
        effectiveU * 1.5, // lower arm / torso bottom (was 1.3)
        effectiveU * 1.6, // hand / upper legs (was 1.75)
        effectiveU * 1.4, // lower legs (was 1.6)
        effectiveU * 1.4, // feet (was 1.6)
      ]
        .map((v) => `${Math.round(v)}px`)
        .join(' ');

  /* â”€â”€ Render helpers â”€â”€ */
  const activeTool = isEraser ? 'pen' : tool;

  function renderCanvas(s: Side, part: BodyPartName) {
    return (
      <div
        key={`${s}-${part}`}
        style={{
          gridArea: GRID_AREA[part],
          // Use visibility instead of display:none so the grid cell holds its
          // size even when the canvas is hidden. Both front+back cells occupy
          // the same grid area; the active one is visible, the other invisible.
          visibility: s === side ? 'visible' : 'hidden',
          // Explicit 100% so the canvas fills the grid track area correctly.
          width: '100%',
          height: '100%',
          position: 'relative',
          borderRadius: '6px',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--surface)',
        }}
      >
        <SketchCanvas
          side={s}
          part={part}
          brushSize={brushSize}
          color={color}
          isEraser={isEraser}
          tool={activeTool}
          onMount={setCanvasRef}
          onStrokeStart={handleStrokeStart}
          onStrokeEnd={handleStrokeEnd}
        />
        {/* L / R shoulder â†’ torso-edge indicators */}
        {part === 'torso' && (
          <>
            <span
              className="absolute top-1/3 left-1 text-[11px] font-bold tracking-widest pointer-events-none select-none"
              style={{ color: 'var(--fg-muted)', opacity: 0.45 }}
            >
              {s === 'front' ? 'R' : 'L'}
            </span>
            <span
              className="absolute top-1/3 right-1 text-[11px] font-bold tracking-widest pointer-events-none select-none"
              style={{ color: 'var(--fg-muted)', opacity: 0.45 }}
            >
              {s === 'front' ? 'L' : 'R'}
            </span>
          </>
        )}
      </div>
    );
  }

  const focusProps = PART_PROPORTIONS[focusPart];

  // In armsDown mode, arm/hand parts are rotated 90Â° â€” swap aspect ratio
  const ARM_PART_SET = new Set<BodyPartName>([
    'leftUpperArm',
    'leftLowerArm',
    'leftHand',
    'rightUpperArm',
    'rightLowerArm',
    'rightHand',
  ]);
  // When arms are in T-pose (up), arm canvases are landscape; flip the aspect ratio.
  // When arms are down (mobile), canvases are portrait â€” use PART_PROPORTIONS directly.
  const effectiveFocusProps =
    ARM_PART_SET.has(focusPart) && effectiveArms === 'up'
      ? { w: focusProps.h, h: focusProps.w }
      : focusProps;

  /* â”€â”€ Toolbar content â”€â”€ */

  return (
    <main className="flex flex-1 w-full overflow-hidden">
      <ToolbarLayout>
        {/* â”€â”€ Unified toolbar â”€â”€ */}
        <PageToolbar
          onSave={handleSave}
          saveStatus={saveStatus}
          saveDisabled={saveStatus === 'saving'}
        >
          <HistorySection
            onUndo={handleUndo}
            onClearAll={clearAll}
            isClearOpen={isOpen('clear')}
            onClearToggle={() => toggle('clear')}
            onClearClose={() => close('clear')}
          />
          <LayoutSection
            side={side}
            onSideChange={handleSideChange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            focusIdx={focusIdx}
            onFocusIdxChange={setFocusIdx}
            armPose={armPose}
            onArmPoseChange={handleArmPoseChange}
            isOpen={isOpen('layout')}
            onToggle={() => toggle('layout')}
            onClose={() => close('layout')}
          />
          <ToolsSection
            tool={tool}
            onToolChange={setTool}
            isEraser={isEraser}
            onIsEraserChange={setIsEraser}
            isOpen={isOpen('tools')}
            onToggle={() => toggle('tools')}
            onClose={() => close('tools')}
          />
          <OptionsSection
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            isEraser={isEraser}
            zoom={zoom}
            onZoomChange={setZoom}
            onZoomReset={() => setZoom(1)}
            isOpen={isOpen('options')}
            onToggle={() => toggle('options')}
            onClose={() => close('options')}
          />
          <ColorSection
            color={color}
            onColorChange={setColor}
            onEraserOff={() => setIsEraser(false)}
            usedColors={usedColors}
            isOpen={isOpen('color')}
            onToggle={() => toggle('color')}
            onClose={() => close('color')}
          />
        </PageToolbar>

        {/* â”€â”€ Canvas area â”€â”€ */}
        <div className="flex flex-col flex-1 overflow-hidden relative">
          {/* â”€â”€ BODY MODE â”€â”€ */}
          <div
            className={
              viewMode === 'single' ? 'hidden' : 'flex-1 flex flex-col min-h-0'
            }
          >
            <div className="flex-1 overflow-auto">
              {/* min-w-max + flex justify-center: centers grid when it fits; allows scroll in both axes when zoomed */}
              <div className="min-w-max flex justify-center px-2 sm:px-4 py-3">
                <div
                  style={{
                    display: 'grid',
                    gridTemplateAreas: gridTemplate,
                    gridTemplateColumns: gridCols,
                    gridTemplateRows: gridRows,
                    gap: isMobile ? '2px' : '4px',
                  }}
                >
                  {(['front', 'back'] as Side[]).flatMap((s) =>
                    BODY_PARTS.map((part) => renderCanvas(s, part)),
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* â”€â”€ SINGLE-PART MODE â”€â”€ */}
          {viewMode === 'single' && (
            <>
              {/* Responsive single-part layout:
                  mobile (< md) â€“ full-width canvas, nav buttons below
                  desktop (md+) â€“ â—€ canvas â–¶ side-by-side               */}
              <div className="flex-1 flex flex-col items-stretch min-h-0 py-3">
                {/* Canvas row */}
                <div className="flex-1 flex items-center justify-center gap-2 px-0 md:px-2 min-h-0">
                  {/* Prev â€“ large screens only */}
                  <button
                    onClick={goPrev}
                    className="hidden md:flex shrink-0 w-9 h-9 items-center justify-center rounded-full text-sm transition-all hover:brightness-125 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--fg)',
                    }}
                    aria-label="Previous part"
                  >
                    â—€
                  </button>

                  <div className="flex flex-col items-center gap-1 flex-1 min-w-0 min-h-0 w-full">
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest shrink-0"
                      style={{ color: 'var(--accent)' }}
                    >
                      {PART_LABEL[focusPart]} Â· {side}
                    </p>
                    <div
                      style={{
                        maxWidth: 'min(96vw, 380px)',
                        maxHeight: '55vh',
                        aspectRatio: `${effectiveFocusProps.w} / ${effectiveFocusProps.h}`,
                        width: '100%',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--surface)',
                        position: 'relative',
                        transform: `scale(${zoom})`,
                        transformOrigin: 'top center',
                      }}
                    >
                      {(['front', 'back'] as Side[]).map((s) => (
                        <div
                          key={`single-${s}-${focusPart}`}
                          style={{
                            display: s === side ? 'block' : 'none',
                            width: '100%',
                            height: '100%',
                          }}
                        >
                          <SketchCanvas
                            side={s}
                            part={focusPart}
                            brushSize={brushSize}
                            color={color}
                            isEraser={isEraser}
                            tool={activeTool}
                            onMount={setZoomCanvasRef}
                            onStrokeStart={handleStrokeStart}
                            onStrokeEnd={handleStrokeEnd}
                          />
                        </div>
                      ))}
                    </div>
                    <p
                      className="text-[10px] shrink-0"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      {focusIdx + 1} / {PARTS_ORDER.length}
                    </p>
                  </div>

                  {/* Next â€“ large screens only */}
                  <button
                    onClick={goNext}
                    className="hidden md:flex shrink-0 w-9 h-9 items-center justify-center rounded-full text-sm transition-all hover:brightness-125 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--fg)',
                    }}
                    aria-label="Next part"
                  >
                    â–¶
                  </button>
                </div>

                {/* Mobile nav buttons â€“ below canvas */}
                <div className="flex md:hidden justify-between items-center px-6 pb-1 shrink-0 gap-4">
                  <button
                    onClick={goPrev}
                    className="flex-1 h-11 flex items-center justify-center rounded-lg text-sm gap-1.5 transition-all hover:brightness-125 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--fg)',
                    }}
                    aria-label="Previous part"
                  >
                    â—€{' '}
                    <span className="text-[11px] font-semibold uppercase tracking-widest">
                      Prev
                    </span>
                  </button>
                  <button
                    onClick={goNext}
                    className="flex-1 h-11 flex items-center justify-center rounded-lg text-sm gap-1.5 transition-all hover:brightness-125 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    style={{
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--fg)',
                    }}
                    aria-label="Next part"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-widest">
                      Next
                    </span>{' '}
                    â–¶
                  </button>
                </div>
              </div>

              <BodyThumbnail focusPart={focusPart} onSelect={selectPart} />
            </>
          )}

          {/* â”€â”€ Copy-front overlay (subsequent back visits) â”€â”€ */}
          {side === 'back' && showCopyFront && (
            <div className="absolute top-2 left-1.5 right-0 flex justify-start z-10 pointer-events-none">
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1 pointer-events-auto"
                style={{
                  backgroundColor: 'var(--surface-raised)',
                  border: '1px solid var(--border-strong)',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
                }}
              >
                <button
                  onClick={() => setShowCopyFront(false)}
                  className="text-[10px] transition-colors"
                  style={{
                    color: 'var(--fg-muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  aria-label="Dismiss copy front"
                >
                  âœ•
                </button>
                <button
                  onClick={() => {
                    for (const part of BODY_PARTS) {
                      const backPart = MIRROR_PART_MAP[part];
                      mirrorCopyCanvas('front', part, 'back', backPart);
                    }
                    setShowCopyFront(false);
                  }}
                  className="text-[10px] font-bold uppercase tracking-widest transition-colors"
                  style={{
                    color: 'var(--accent)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Copy Front
                </button>
              </div>
            </div>
          )}
        </div>
      </ToolbarLayout>
    </main>
  );
}
