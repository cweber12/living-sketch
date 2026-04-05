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
  Toolbar,
  ToolbarDropdown,
  SegmentedControl,
  type ToolbarMode,
} from '@/components/shared/ui/toolbar';
import { BodyThumbnail } from '@/components/sketch/body-thumbnail';
import { TableIcon } from '@/components/sketch/icons/table';
import { DrawScalpelIcon } from '@/components/sketch/icons/draw-scalpel';
import { TestTubeAndFlaskIcon } from '@/components/sketch/icons/test-tube-and-flask';
import { TestTubeIcon } from '@/components/sketch/icons/test-tube';
import { BodyStandingIcon } from '@/components/shared/icons/body';
import { FridgeClosedIcon } from '@/components/shared/icons/fridge';
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

  const [armPose, setArmPose] = useState<ArmPose>('up');
  const [viewMode, setViewMode] = useState<ViewMode>('body');
  const [focusIdx, setFocusIdx] = useState(0);
  const [tool, setTool] = useState<ShapeTool>('pen');
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>('side');
  const [zoom, setZoom] = useState(1);
  const [sideAnimating, setSideAnimating] = useState(false);
  const [usedColors, setUsedColors] = useState<string[]>([]);
  const backInitialised = useRef(false);

  const [isMobile, setIsMobile] = useState(false);

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

  const effectiveArms: ArmPose = isMobile ? 'down' : armPose;
  const focusPart = PARTS_ORDER[focusIdx];

  const {
    setCanvasRef,
    pushUndoSnapshot,
    undo,
    clearAll,
    exportAll,
    mirrorCopyCanvas,
    saveToSession,
  } = useSketchCanvasRig();

  /** First time user selects "back", mirror all front canvases to back with L/R swap */
  const handleSideChange = useCallback(
    (newSide: Side) => {
      if (newSide === 'back' && !backInitialised.current) {
        backInitialised.current = true;
        for (const part of BODY_PARTS) {
          const backPart = MIRROR_PART_MAP[part];
          mirrorCopyCanvas('front', part, 'back', backPart);
        }
      }
      setSide(newSide);
      setSideAnimating(true);
      setTimeout(() => setSideAnimating(false), 350);
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

  const mobileU =
    typeof window !== 'undefined'
      ? Math.min(
          Math.floor((window.innerWidth - 20) / 4.3),
          Math.floor((window.innerHeight - 140) / 9.85),
        )
      : 80;
  const effectiveU = isMobile && viewMode === 'body' ? mobileU : u;

  const armCol = effectiveU;
  const legCol = Math.round(effectiveU * 1.15);
  const handColUp = Math.round(effectiveU * 1.75);
  const armColUp = Math.round(effectiveU * 1.3);

  const gridCols = armsUp
    ? `${handColUp}px ${armColUp}px ${armColUp}px ${legCol}px ${legCol}px ${armColUp}px ${armColUp}px ${handColUp}px`
    : `${armCol}px ${legCol}px ${legCol}px ${armCol}px`;

  const gridRows = armsUp
    ? [
        effectiveU * 2.3,
        effectiveU,
        effectiveU * 1.5,
        effectiveU * 1.75,
        effectiveU * 1.6,
        effectiveU * 1.6,
      ]
        .map((v) => `${Math.round(v)}px`)
        .join(' ')
    : [
        effectiveU * 2.3,
        effectiveU * 1.3,
        effectiveU * 1.3,
        effectiveU * 1.75,
        effectiveU * 1.6,
        effectiveU * 1.6,
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
          display: s === side ? 'block' : 'none',
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
        <span
          className="absolute bottom-0.5 left-0 right-0 text-center text-[8px] font-bold uppercase tracking-widest pointer-events-none select-none"
          style={{ color: 'var(--fg-muted)', opacity: 0.5 }}
        >
          {PART_LABEL[part]}
        </span>
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
  const effectiveFocusProps =
    ARM_PART_SET.has(focusPart) && effectiveArms === 'down'
      ? { w: focusProps.h, h: focusProps.w }
      : focusProps;

  /* ── Toolbar content ── */

  return (
    <main className="flex flex-col flex-1 w-full overflow-hidden">
      {/* ── Action bar ── */}
      <div
        className="flex items-center px-3 py-1.5 shrink-0"
        style={{
          borderBottom: '1px solid var(--border-strong)',
          backgroundColor: 'var(--surface)',
        }}
      >
        {/* Left: Undo + Clear */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            className="btn-ghost rounded py-1.5 text-xs uppercase tracking-widest px-2.5"
            title="Undo last stroke"
          >
            ↩ Undo
          </button>
          <button
            onClick={clearAll}
            className="btn-ghost rounded py-1.5 text-xs uppercase tracking-widest px-2.5"
            style={{ color: 'var(--danger)' }}
            title="Clear all canvases"
          >
            ✕ Clear
          </button>
        </div>

        {/* Center: Front / Back side toggle */}
        <div className="flex-1 flex justify-center items-center gap-2">
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
            className={`transition-all duration-300 ${sideAnimating ? 'side-flip' : ''}`}
            style={{
              color: side === 'front' ? 'var(--accent)' : 'var(--surface)',
              filter:
                side === 'back' ? 'drop-shadow(0 0 6px var(--accent))' : 'none',
              display: 'inline-flex',
            }}
          >
            <BodyStandingIcon size="24px" />
          </span>
        </div>

        {/* Right: Save */}
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="btn-primary rounded py-1.5 px-4 text-xs uppercase tracking-widest font-bold disabled:opacity-50"
          title="Save sketches to library"
        >
          <FridgeClosedIcon />
          {saveStatus === 'saving' && '…'}
          {saveStatus === 'saved' && 'Saved'}
          {saveStatus === 'error' && 'Error'}
          {saveStatus === 'idle' && 'Save'}
        </button>
      </div>

      {/* ── Toolbar + canvas ── */}
      <div
        className={`flex flex-1 overflow-hidden ${toolbarMode === 'side' ? 'flex-row' : 'flex-col'}`}
      >
        <Toolbar onModeChange={setToolbarMode}>
          {/* Layout — two-column in side mode */}
          <ToolbarDropdown id="layout" label="Layout" icon={<TableIcon />}>
            <div
              style={{
                display: 'flex',
                flexDirection: toolbarMode === 'side' ? 'row' : 'column',
                gap: toolbarMode === 'side' ? '0 16px' : 0,
                width: '100%',
              }}
            >
              <div className="flex flex-col gap-1.5">
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
                {!isMobile && (
                  <>
                    <span
                      className="text-[9px] uppercase tracking-widest mt-1"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      Arm Orientation
                    </span>
                    <SegmentedControl
                      options={['up', 'down'] as ArmPose[]}
                      value={armPose}
                      onChange={setArmPose}
                      labels={{ up: 'Up', down: 'Down' }}
                    />
                  </>
                )}
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
                    className="text-[10px] tabular-nums w-8 shrink-0"
                    style={{ color: 'var(--fg-muted)' }}
                  >
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
                <button
                  onClick={() => setZoom(1)}
                  className="btn-ghost w-full rounded py-1 text-[10px] uppercase tracking-widest"
                >
                  Reset
                </button>
              </div>
            </div>
          </ToolbarDropdown>

          {/* Draw */}
          <ToolbarDropdown id="tools" label="Tools" icon={<DrawScalpelIcon />}>
            <div className="flex flex-col gap-2 w-full">
              {/* Row 1: shape selector */}
              <span
                className="text-[9px] uppercase tracking-widest"
                style={{ color: 'var(--fg-muted)' }}
              >
                Current Tool
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
              {/* Row 2: Brush size slider + circle preview */}
              <div className="flex items-center gap-2">
                <span
                  className="text-[9px] uppercase tracking-widest"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  Size
                </span>
                <input
                  type="range"
                  min={1}
                  max={40}
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="flex-1 accent-accent"
                  title="Brush size"
                />
                {/* Fixed-size circle preview — wrapper always 48px so layout never shifts */}
                <div
                  className="shrink-0 flex items-center justify-center"
                  style={{ width: 48, height: 48 }}
                >
                  <div
                    style={{
                      width: brushSize,
                      height: brushSize,
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
              <SegmentedControl
                options={['draw', 'erase'] as ('draw' | 'erase')[]}
                value={isEraser ? 'erase' : 'draw'}
                onChange={(v) => setIsEraser(v === 'erase')}
                labels={{ draw: 'Draw', erase: 'Erase' }}
                dangerValue="erase"
              />
            </div>
          </ToolbarDropdown>

          {/* Colors */}
          <ToolbarDropdown
            id="color"
            label="Color"
            icon={<TestTubeAndFlaskIcon size={20} color={color} />}
          >
            <div className="flex flex-col gap-2 w-full">
              <span
                className="text-[9px] uppercase tracking-widest"
                style={{ color: 'var(--fg-muted)' }}
              >
                Current
              </span>
              <label
                style={{
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <TestTubeIcon size={20} color={color} />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    setIsEraser(false);
                  }}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: 0,
                    height: 0,
                    pointerEvents: 'none',
                  }}
                  tabIndex={-1}
                  aria-label="Stroke color"
                />
              </label>
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
                    className="rounded transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    style={{
                      width: 20,
                      height: 20,
                      padding: 0,
                      background: 'none',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <TestTubeIcon size={16} color={c} />
                  </button>
                ))}
              </div>
            </div>
          </ToolbarDropdown>
        </Toolbar>

        {/* ── Canvas area ── */}
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          {/* ── BODY MODE ── */}
          <div
            className={
              viewMode === 'single' ? 'hidden' : 'flex-1 flex flex-col min-h-0'
            }
          >
            <div className="flex-1 overflow-auto flex justify-center px-2 sm:px-4 py-3">
              <div
                style={{
                  display: 'grid',
                  gridTemplateAreas: gridTemplate,
                  gridTemplateColumns: gridCols,
                  gridTemplateRows: gridRows,
                  gap: isMobile ? '2px' : '4px',
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                }}
              >
                {(['front', 'back'] as Side[]).flatMap((s) =>
                  BODY_PARTS.map((part) => renderCanvas(s, part)),
                )}
              </div>
            </div>
          </div>

          {/* ── SINGLE-PART MODE ── */}
          {viewMode === 'single' && (
            <>
              <div className="flex-1 flex items-center justify-center gap-2 px-2 py-3 min-h-0">
                <button
                  onClick={goPrev}
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-sm transition-all hover:brightness-125 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--fg)',
                  }}
                  aria-label="Previous part"
                >
                  ◀
                </button>

                <div className="flex flex-col items-center gap-1 flex-1 min-w-0 min-h-0">
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest shrink-0"
                    style={{ color: 'var(--accent)' }}
                  >
                    {PART_LABEL[focusPart]} · {side}
                  </p>
                  <div
                    style={{
                      maxWidth: 'min(75vw, 380px)',
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
                          onMount={setCanvasRef}
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

                <button
                  onClick={goNext}
                  className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-sm transition-all hover:brightness-125 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
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

              <BodyThumbnail focusPart={focusPart} onSelect={selectPart} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
