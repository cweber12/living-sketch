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
} from '@/components/shared/ui/toolbar/toolbar-main';
import { ToolbarSection } from '@/components/shared/ui/toolbar/toolbar-section';
import { useDropdown } from '@/components/shared/ui/toolbar/use-dropdown';
import { SegmentedControl } from '@/components/shared/ui/toolbar/segmented-control';
import { BodyThumbnail } from '@/components/sketch/body-thumbnail';
import { Flask2Icon } from '@/components/sketch/icons/flask-2';
import { TrashIcon } from '@/components/shared/icons/trash';
import { UndoIcon } from '@/components/shared/icons/undo';
import { TableIcon } from '@/components/sketch/icons/table';
import { DrillIcon } from '@/components/shared/icons/drill';
import { OptionsIcon } from '@/components/shared/icons/options';
import {
  GRID_ARMS_UP,
  GRID_ARMS_DOWN,
  GRID_AREA,
  PART_LABEL,
  PART_PROPORTIONS,
  PARTS_ORDER,
} from '@/components/sketch/sketch-constants';

const SHAPE_OPTIONS: { value: ShapeTool; label: string }[] = [
  { value: 'pen', label: '✏ Pen' },
  { value: 'line', label: '╱ Line' },
  { value: 'rect', label: '▭ Rectangle' },
  { value: 'circle', label: '○ Circle' },
  { value: 'ellipse', label: '⬭ Ellipse' },
];

const SESSION_STATE_KEY = 'sketch-page-state';

const DEFAULT_COLOR_LIGHT = '#000000';
const DEFAULT_COLOR_DARK = '#ffffff';
const DEFAULT_BRUSH = 6;
const DEFAULT_CANVAS_SIZE = 110;
const MOBILE_BP = 1024;

type ArmPose = 'up' | 'down';
type ViewMode = 'body' | 'single';

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
        {/* L / R shoulder → torso-edge indicators */}
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
    <main className="flex flex-1 w-full overflow-hidden">
      <ToolbarLayout>
        {/* ── Unified toolbar ── */}
        <PageToolbar
          onSave={handleSave}
          saveStatus={saveStatus}
          saveDisabled={saveStatus === 'saving'}
        >
          <div className="flex items-center gap-1">
            {/* Undo */}
            <ToolbarSection
              icon={<UndoIcon />}
              label="Undo"
              onClick={handleUndo}
              title="Undo last stroke"
            />
            {/* Clear All */}
            <ToolbarSection
              icon={<TrashIcon />}
              label="Clear"
              danger
              onClick={() => toggle('clear')}
              dropdownOpen={isOpen('clear')}
              onDropdownClose={() => close('clear')}
              dropdownContent={
                <div className="flex flex-col gap-2">
                  <span
                    className="text-[10px] uppercase tracking-widest"
                    style={{ color: 'var(--fg-muted)' }}
                  >
                    Clear all canvases?
                  </span>
                  <button
                    onClick={() => {
                      clearAll();
                      close('clear');
                    }}
                    className="btn-danger w-full rounded py-1.5 text-xs uppercase tracking-widest font-bold"
                    style={{
                      backgroundColor: 'var(--danger)',
                      color: '#fff',
                    }}
                  >
                    ✕ Clear All
                  </button>
                </div>
              }
            />
          </div>
          {/* Layout */}
          <ToolbarSection
            icon={<TableIcon />}
            label="Layout"
            onClick={() => toggle('layout')}
            dropdownOpen={isOpen('layout')}
            onDropdownClose={() => close('layout')}
            dropdownContent={
              <div className="flex flex-col gap-1.5">
                <span
                  className="text-[9px] uppercase tracking-widest"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  Side
                </span>
                <SegmentedControl
                  options={['front', 'back'] as Side[]}
                  value={side}
                  onChange={handleSideChange}
                  labels={{ front: 'Front', back: 'Back' }}
                />
                <span
                  className="text-[9px] uppercase tracking-widest mt-1"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  Body
                </span>
                <SegmentedControl
                  options={['body', 'single'] as ViewMode[]}
                  value={viewMode}
                  onChange={setViewMode}
                  labels={{ body: 'Full', single: 'Parts' }}
                />
                {viewMode === 'single' && (
                  <select
                    value={focusIdx}
                    onChange={(e) => setFocusIdx(Number(e.target.value))}
                    className="w-full rounded px-2 py-1 text-[11px] uppercase tracking-wider font-semibold"
                    style={{
                      backgroundColor: 'var(--bg)',
                      color: 'var(--fg)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {PARTS_ORDER.map((p, i) => (
                      <option key={p} value={i}>
                        {PART_LABEL[p]}
                      </option>
                    ))}
                  </select>
                )}
                <span
                  className="text-[9px] uppercase tracking-widest mt-1"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  Arm Orientation
                </span>
                <SegmentedControl
                  options={['up', 'down'] as ArmPose[]}
                  value={armPose}
                  onChange={handleArmPoseChange}
                  labels={{ up: 'Up', down: 'Down' }}
                />
              </div>
            }
          />

          {/* Tools — shape picker */}
          <ToolbarSection
            icon={<DrillIcon />}
            label="Tools"
            onClick={() => toggle('tools')}
            dropdownOpen={isOpen('tools')}
            onDropdownClose={() => close('tools')}
            dropdownContent={
              <div className="flex flex-col gap-2 w-full">
                <span
                  className="text-[9px] uppercase tracking-widest"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  Tool
                </span>
                <SegmentedControl
                  options={['sketch', 'erase'] as ('sketch' | 'erase')[]}
                  value={isEraser ? 'erase' : 'sketch'}
                  onChange={(v) => setIsEraser(v === 'erase')}
                  labels={{ sketch: 'Sketch', erase: 'Erase' }}
                  dangerValue="erase"
                />
                <span
                  className="text-[9px] uppercase tracking-widest"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  Shape Tool
                </span>
                <div className="flex items-center gap-2">
                  {!isEraser && (
                    <select
                      value={tool}
                      onChange={(e) => {
                        const v = e.target.value as ShapeTool;
                        setTool(v);
                        if (v !== 'pen') setIsEraser(false);
                      }}
                      className="flex-1 min-w-0 rounded px-2 py-1 text-[11px] uppercase tracking-wider font-semibold"
                      style={{
                        backgroundColor: 'var(--bg)',
                        color: 'var(--fg)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {SHAPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {isEraser && (
                    <span
                      className="flex-1 text-[10px] uppercase tracking-widest"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      Eraser active
                    </span>
                  )}
                </div>
              </div>
            }
          />

          {/* Options — sketch/erase, stroke width, zoom */}
          <ToolbarSection
            icon={<OptionsIcon />}
            label="Options"
            onClick={() => toggle('options')}
            dropdownOpen={isOpen('options')}
            onDropdownClose={() => close('options')}
            dropdownContent={
              <div className="flex flex-col gap-2 w-full">
                <span
                  className="text-[9px] uppercase tracking-widest mt-1"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  Stroke Width
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={40}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="flex-1 accent-accent"
                    title="Brush size"
                  />
                  <div
                    className="shrink-0 flex items-center justify-center"
                    style={{ width: 32, height: 32 }}
                  >
                    <div
                      style={{
                        width: Math.min(brushSize, 28),
                        height: Math.min(brushSize, 28),
                        borderRadius: '50%',
                        backgroundColor: isEraser
                          ? 'var(--danger)'
                          : 'var(--accent)',
                        opacity: isEraser ? 0.5 : 0.85,
                        border: '1px solid var(--border-strong)',
                        flexShrink: 0,
                      }}
                    />
                  </div>
                </div>
                <span
                  className="text-[9px] uppercase tracking-widest mt-1"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  Zoom
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0.5}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 accent-accent"
                    title="Canvas zoom"
                  />
                  <span
                    className="text-[10px] tabular-nums shrink-0 w-8"
                    style={{ color: 'var(--fg-muted)' }}
                  >
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
                <button
                  onClick={() => setZoom(1)}
                  className="btn-ghost w-full rounded py-1 text-[10px] uppercase tracking-widest"
                >
                  Reset Zoom
                </button>
              </div>
            }
          />

          {/* Color */}
          <ToolbarSection
            icon={<Flask2Icon />}
            label="Color"
            onClick={() => toggle('color')}
            dropdownOpen={isOpen('color')}
            onDropdownClose={() => close('color')}
            dropdownContent={
              <div className="flex flex-col gap-2 w-full">
                <span
                  className="text-[9px] uppercase tracking-widest"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  Color
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      setColor(e.target.value);
                      setIsEraser(false);
                    }}
                    style={{
                      width: 48,
                      height: 28,
                      cursor: 'pointer',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      backgroundColor: 'transparent',
                      padding: 0,
                    }}
                    aria-label="Stroke color"
                  />
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: 'var(--fg-muted)' }}
                  >
                    {color}
                  </span>
                </div>
                {usedColors.length > 0 && (
                  <>
                    <span
                      className="text-[9px] uppercase tracking-widest"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      Recent
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {usedColors.map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setColor(c);
                            setIsEraser(false);
                          }}
                          title={c}
                          className="rounded transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          style={{
                            width: 20,
                            height: 20,
                            padding: 0,
                            background: 'none',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--fg-muted)',
                          }}
                        >
                          <Flask2Icon size={18} secondaryColor={c} />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            }
          />
        </PageToolbar>

        {/* ── Canvas area ── */}
        <div className="flex flex-col flex-1 overflow-hidden relative">
          {/* ── BODY MODE ── */}
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

          {/* ── SINGLE-PART MODE ── */}
          {viewMode === 'single' && (
            <>
              {/* Responsive single-part layout:
                  mobile (< md) – full-width canvas, nav buttons below
                  desktop (md+) – ◀ canvas ▶ side-by-side               */}
              <div className="flex-1 flex flex-col items-stretch min-h-0 py-3">
                {/* Canvas row */}
                <div className="flex-1 flex items-center justify-center gap-2 px-0 md:px-2 min-h-0">
                  {/* Prev – large screens only */}
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
                    ◀
                  </button>

                  <div className="flex flex-col items-center gap-1 flex-1 min-w-0 min-h-0 w-full">
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest shrink-0"
                      style={{ color: 'var(--accent)' }}
                    >
                      {PART_LABEL[focusPart]} · {side}
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

                  {/* Next – large screens only */}
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
                    ▶
                  </button>
                </div>

                {/* Mobile nav buttons – below canvas */}
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
                    ◀{' '}
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
                    ▶
                  </button>
                </div>
              </div>

              <BodyThumbnail focusPart={focusPart} onSelect={selectPart} />
            </>
          )}

          {/* ── Copy-front overlay (subsequent back visits) ── */}
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
                  ✕
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
