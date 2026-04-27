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
import { useSectionExpand } from '@/components/shared/toolbar/use-section-expand';
import { BodyThumbnail } from '@/components/sketch/body-thumbnail';
import {
  LayoutSection,
  type ArmPose,
  type ViewMode,
} from '@/components/sketch/toolbar/layout';
import {
  ToolsSection,
  ShapesSection,
  DEFAULT_BRUSH,
} from '@/components/sketch/toolbar/tools';
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
import { PrevIcon, NextIcon } from '@/components/shared/icons/navigate';
import { CloseIcon } from '@/components/shared/icons/close';
const SESSION_STATE_KEY = 'sketch-page-state';

const DEFAULT_CANVAS_SIZE = 110;
const MOBILE_BP = 768;

/* ─── Page ────────────────────────────────────────────────────────── */

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
  const { isExpanded, toggle: toggleSection } = useSectionExpand([
    'tools',
    'shapes',
    'color',
    'layout',
  ]);
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
  // armPose is intentionally excluded — it must always reflect the actual device
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
  // We intentionally don't canvas-rotate here — canvases are still loading from
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
   * Front: L-arms CCW (-90°), R-arms CW (+90°) going to arms-down.
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
          'No images saved — canvas export may not be supported on this browser.',
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

  /* ── Grid sizing ── */
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

  /* ── Render helpers ── */
  const activeTool = isEraser ? 'pen' : tool;

  function renderCanvas(s: Side, part: BodyPartName) {
    return (
      <div
        key={`${s}-${part}`}
        className="border-edge bg-surface relative h-full w-full overflow-hidden rounded-md border"
        style={{
          gridArea: GRID_AREA[part],
          visibility: s === side ? 'visible' : 'hidden',
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
        {/* L / R shoulder → torso-edge indicators */}
        {part === 'torso' && (
          <>
            <span className="text-2xs text-muted pointer-events-none absolute top-1/3 left-1 font-bold tracking-widest opacity-45 select-none">
              {s === 'front' ? 'R' : 'L'}
            </span>
            <span className="text-2xs text-muted pointer-events-none absolute top-1/3 right-1 font-bold tracking-widest opacity-45 select-none">
              {s === 'front' ? 'L' : 'R'}
            </span>
          </>
        )}
      </div>
    );
  }

  const focusProps = PART_PROPORTIONS[focusPart];

  // In armsDown mode, arm/hand parts are rotated 90° — swap aspect ratio
  const ARM_PART_SET = new Set<BodyPartName>([
    'leftUpperArm',
    'leftLowerArm',
    'leftHand',
    'rightUpperArm',
    'rightLowerArm',
    'rightHand',
  ]);
  // When arms are in T-pose (up), arm canvases are landscape; flip the aspect ratio.
  // When arms are down (mobile), canvases are portrait — use PART_PROPORTIONS directly.
  const effectiveFocusProps =
    ARM_PART_SET.has(focusPart) && effectiveArms === 'up'
      ? { w: focusProps.h, h: focusProps.w }
      : focusProps;

  /* ── Toolbar content ── */

  return (
    <main className="flex w-full flex-1 overflow-hidden">
      <ToolbarLayout>
        {/* Unified toolbar */}
        <PageToolbar
          onSave={handleSave}
          onUndo={handleUndo}
          onClearAll={clearAll}
          saveStatus={saveStatus}
          saveDisabled={saveStatus === 'saving'}
        >
          <ToolsSection
            zoom={zoom}
            onZoomChange={setZoom}
            onZoomReset={() => setZoom(1)}
            tool={tool}
            onToolChange={setTool}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            isEraser={isEraser}
            onIsEraserChange={setIsEraser}
            expanded={isExpanded('tools')}
            onToggle={() => toggleSection('tools')}
            brushDropdownOpen={isOpen('brush')}
            onBrushDropdownToggle={() => toggle('brush')}
            onBrushDropdownClose={() => close('brush')}
            zoomDropdownOpen={isOpen('zoom')}
            onZoomDropdownToggle={() => toggle('zoom')}
            onZoomDropdownClose={() => close('zoom')}
          />
          <ShapesSection
            tool={tool}
            onToolChange={setTool}
            isEraser={isEraser}
            onIsEraserChange={setIsEraser}
            expanded={isExpanded('shapes')}
            onToggle={() => toggleSection('shapes')}
          />
          <ColorSection
            color={color}
            onColorChange={setColor}
            usedColors={usedColors}
            onEraserOff={() => setIsEraser(false)}
            expanded={isExpanded('color')}
            onToggle={() => toggleSection('color')}
            pickerDropdownOpen={isOpen('colorPicker')}
            onPickerDropdownToggle={() => toggle('colorPicker')}
            onPickerDropdownClose={() => close('colorPicker')}
            overflowDropdownOpen={isOpen('colorOverflow')}
            onOverflowDropdownToggle={() => toggle('colorOverflow')}
            onOverflowDropdownClose={() => close('colorOverflow')}
          />
          <LayoutSection
            zoom={zoom}
            onZoomChange={setZoom}
            onZoomReset={() => setZoom(1)}
            side={side}
            onSideChange={handleSideChange}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            focusIdx={focusIdx}
            onFocusIdxChange={setFocusIdx}
            armPose={armPose}
            onArmPoseChange={handleArmPoseChange}
            expanded={isExpanded('layout')}
            onToggle={() => toggleSection('layout')}
            partsDropdownOpen={isOpen('parts')}
            onPartsDropdownToggle={() => toggle('parts')}
            onPartsDropdownClose={() => close('parts')}
          />
        </PageToolbar>

        {/* CANVAS AREA */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* BODY MODE */}
          <div
            className={
              viewMode === 'single' ? 'hidden' : 'flex min-h-0 flex-1 flex-col'
            }
          >
            <div className="flex-1 overflow-auto">
              {/* min-w-max + flex justify-center: centers grid when it fits; allows scroll in both axes when zoomed */}
              <div className="flex min-w-max justify-center px-2 py-3 sm:px-4">
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

          {/* SINGLE-PART MODE */}
          {viewMode === 'single' && (
            <>
              {/* Responsive single-part layout:
                  mobile (< md) – full-width canvas, nav buttons below
                  desktop (md+) – ◀ canvas ▶ side-by-side               */}
              <div className="flex min-h-0 flex-1 flex-col items-stretch py-3">
                {/* Canvas row */}
                <div className="flex min-h-0 flex-1 items-center justify-center gap-2 overflow-auto px-0 md:px-2">
                  {/* Prev : large screens only */}
                  <button
                    onClick={goPrev}
                    className="focus-visible:ring-accent bg-surface border-edge hover:bg-surface-hover hover:border-edge-strong text-foreground ml-2 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] md:flex"
                    aria-label="Previous part"
                  >
                    <PrevIcon />
                  </button>

                  <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center gap-1">
                    <p className="text-3xs text-accent shrink-0 font-bold tracking-widest uppercase">
                      {PART_LABEL[focusPart]} | {side}
                    </p>
                    <div
                      className="border-edge bg-surface relative overflow-hidden rounded-[10px] border"
                      style={{
                        aspectRatio: `${effectiveFocusProps.w} / ${effectiveFocusProps.h}`,
                        width: `min(${Math.round(zoom * 96)}vw, ${Math.round(zoom * 380)}px)`,
                      }}
                    >
                      {(['front', 'back'] as Side[]).map((s) => (
                        <div
                          key={`single-${s}-${focusPart}`}
                          className="h-full w-full"
                          style={{ display: s === side ? 'block' : 'none' }}
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
                    <p className="text-3xs text-muted shrink-0">
                      {focusIdx + 1} / {PARTS_ORDER.length}
                    </p>
                  </div>

                  {/* Next : large screens only */}
                  <button
                    onClick={goNext}
                    className="focus-visible:ring-accent bg-surface border-edge hover:bg-surface-hover hover:border-edge-strong text-foreground mr-2 hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] md:flex"
                  >
                    <NextIcon />
                  </button>
                </div>

                {/* Mobile nav buttons below canvas */}
                <div className="flex shrink-0 items-center justify-between gap-4 px-6 pb-1 md:hidden">
                  <button
                    onClick={goPrev}
                    className="focus-visible:ring-accent bg-surface border-edge hover:bg-surface-hover hover:border-edge-strong text-foreground flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97]"
                    aria-label="Previous part"
                  >
                    <PrevIcon />
                  </button>
                  <button
                    onClick={goNext}
                    className="focus-visible:ring-accent bg-surface border-edge hover:bg-surface-hover hover:border-edge-strong text-foreground flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97]"
                    aria-label="Next part"
                  >
                    <NextIcon />
                  </button>
                </div>
              </div>

              <BodyThumbnail focusPart={focusPart} onSelect={selectPart} />
            </>
          )}

          {/* Copy-front overlay (subsequent back visits) */}
          {side === 'back' && showCopyFront && (
            <div className="pointer-events-none absolute top-3 right-0 left-2 z-10 flex justify-start">
              <div className="bg-surface-raised border-edge-strong pointer-events-auto flex items-center gap-2 rounded-full border px-2 py-1.5 shadow-[0_2px_12px_rgba(0,0,0,0.25)]">
                <button
                  onClick={() => setShowCopyFront(false)}
                  className="text-muted hover:text-foreground flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-transparent transition-colors"
                  aria-label="Dismiss"
                >
                  <CloseIcon size="10px" />
                </button>
                <div className="border-edge h-4 w-px" />
                <button
                  onClick={() => {
                    for (const part of BODY_PARTS) {
                      const backPart = MIRROR_PART_MAP[part];
                      mirrorCopyCanvas('front', part, 'back', backPart);
                    }
                    setShowCopyFront(false);
                  }}
                  className="bg-accent text-overlay hover:bg-accent-hover cursor-pointer rounded-full border-none px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-colors"
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
