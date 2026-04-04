'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  SketchCanvas,
  type ShapeTool,
} from '@/components/canvas/sketch-canvas';
import { useSketchCanvasRig } from '@/hooks/use-sketch-canvas-rig';
import { BODY_PARTS } from '@/lib/constants/anchor-descriptors';
import type { BodyPartName, Side } from '@/hooks/use-sketch-canvas-rig';
import {
  Toolbar,
  ToolbarDropdown,
  SegmentedControl,
  type ToolbarMode,
} from '@/components/ui/toolbar';

/* ─── Grid templates ──────────────────────────────────────────────── */

const GRID_ARMS_UP = `
  ".     .     .     head  head  .     .     ."
  "rhand rlarm ruarm torso torso luarm llarm lhand"
  ".     .     .     torso torso .     .     ."
  ".     .     .     rulg  lulg  .     .     ."
  ".     .     .     rllg  lllg  .     .     ."
  ".     .     .     rfoot lfoot .     .     ."
`;

const GRID_ARMS_DOWN = `
  ".     head  head  ."
  "ruarm torso torso luarm"
  "rlarm torso torso llarm"
  "rhand rulg  lulg  lhand"
  ".     rllg  lllg  ."
  ".     rfoot lfoot ."
`;

// Grid areas: left body parts on screen-right, right on screen-left
// (matches anatomical anterior view / camera mirror)
const GRID_AREA: Record<BodyPartName, string> = {
  head: 'head',
  torso: 'torso',
  leftUpperArm: 'luarm',
  leftLowerArm: 'llarm',
  leftHand: 'lhand',
  rightUpperArm: 'ruarm',
  rightLowerArm: 'rlarm',
  rightHand: 'rhand',
  leftUpperLeg: 'lulg',
  leftLowerLeg: 'lllg',
  leftFoot: 'lfoot',
  rightUpperLeg: 'rulg',
  rightLowerLeg: 'rllg',
  rightFoot: 'rfoot',
};

const PART_LABEL: Record<BodyPartName, string> = {
  head: 'Head',
  torso: 'Torso',
  leftUpperArm: 'L Upper Arm',
  leftLowerArm: 'L Lower Arm',
  leftHand: 'L Hand',
  rightUpperArm: 'R Upper Arm',
  rightLowerArm: 'R Lower Arm',
  rightHand: 'R Hand',
  leftUpperLeg: 'L Upper Leg',
  leftLowerLeg: 'L Lower Leg',
  leftFoot: 'L Foot',
  rightUpperLeg: 'R Upper Leg',
  rightLowerLeg: 'R Lower Leg',
  rightFoot: 'R Foot',
};

const PART_PROPORTIONS: Record<BodyPartName, { w: number; h: number }> = {
  head: { w: 1, h: 1 },
  torso: { w: 2.3, h: 2.6 },
  leftUpperArm: { w: 1.15, h: 1.3 },
  leftLowerArm: { w: 1.15, h: 1.3 },
  leftHand: { w: 1, h: 1.75 },
  rightUpperArm: { w: 1.15, h: 1.3 },
  rightLowerArm: { w: 1.15, h: 1.3 },
  rightHand: { w: 1, h: 1.75 },
  leftUpperLeg: { w: 1.15, h: 1.75 },
  leftLowerLeg: { w: 1.15, h: 1.6 },
  leftFoot: { w: 1.15, h: 1.6 },
  rightUpperLeg: { w: 1.15, h: 1.75 },
  rightLowerLeg: { w: 1.15, h: 1.6 },
  rightFoot: { w: 1.15, h: 1.6 },
};

const PARTS_ORDER: BodyPartName[] = [
  'head',
  'torso',
  'leftUpperArm',
  'rightUpperArm',
  'leftLowerArm',
  'rightLowerArm',
  'leftHand',
  'rightHand',
  'leftUpperLeg',
  'rightUpperLeg',
  'leftLowerLeg',
  'rightLowerLeg',
  'leftFoot',
  'rightFoot',
];

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

/* ─── Body Thumbnail (single-part mode) ──────────────────────────── */

function BodyThumbnail({
  focusPart,
  onSelect,
}: {
  focusPart: BodyPartName;
  onSelect: (part: BodyPartName) => void;
}) {
  const t = 10;
  const ac = t;
  const lc = Math.round(t * 1.15);
  return (
    <div
      className="fixed bottom-4 right-4 z-40 rounded-lg p-1.5"
      style={{
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        border: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateAreas: GRID_ARMS_DOWN,
          gridTemplateColumns: `${ac}px ${lc}px ${lc}px ${ac}px`,
          gridTemplateRows: [
            t * 2.3,
            t * 1.3,
            t * 1.3,
            t * 1.75,
            t * 1.6,
            t * 1.6,
          ]
            .map((v) => `${Math.round(v)}px`)
            .join(' '),
          gap: '1px',
        }}
      >
        {BODY_PARTS.map((part) => (
          <button
            key={`thumb-${part}`}
            onClick={() => onSelect(part)}
            title={PART_LABEL[part]}
            style={{
              gridArea: GRID_AREA[part],
              backgroundColor:
                part === focusPart ? 'var(--accent)' : 'var(--fg-muted)',
              opacity: part === focusPart ? 1 : 0.3,
              borderRadius: '1px',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'opacity 0.15s',
            }}
          />
        ))}
      </div>
    </div>
  );
}

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
  // Layout icon: stylised cadaver / body figure
  const iconLayout = (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      {/* Head */}
      <circle cx="7" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      {/* Torso */}
      <path
        d="M4.5 5.5 L9.5 5.5 L9 9 L7.5 9 L7.5 13 L6.5 13 L6.5 9 L5 9 Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Arms */}
      <path
        d="M4.5 5.5 L2 8 M9.5 5.5 L12 8"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );

  // Tools icon: surgical scalpel
  const iconDraw = (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      {/* Blade */}
      <path
        d="M2.5 11.5 L9 4 L10.5 5 L4.5 12.5 C3.8 13.1 2.5 13.2 2.2 12.5 C1.9 11.8 2.1 11.8 2.5 11.5Z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Handle / spine */}
      <path
        d="M8.5 3.5 L11.5 2 L12 2.5 L10.5 5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Guard notch */}
      <path
        d="M9 4 L10 3"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
    </svg>
  );

  // Person front icon (face visible)
  const iconPersonFront = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="7" cy="2.8" r="1.8" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6.2" cy="2.5" r="0.42" fill="currentColor" />
      <circle cx="7.8" cy="2.5" r="0.42" fill="currentColor" />
      <path
        d="M4.5 5.5 L9.5 5.5 L9 9 L7.5 9 L7.5 13 L6.5 13 L6.5 9 L5 9 Z"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 6 L2.5 8 M9.5 6 L11.5 8"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );

  // Person back icon (spine visible, no face)
  const iconPersonBack = (
    <svg
      width="16"
      height="16"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="7" cy="2.8" r="1.8" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M5.5 1.8 Q7 1.2 8.5 1.8"
        stroke="currentColor"
        strokeWidth="0.9"
        fill="none"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M4.5 5.5 L9.5 5.5 L9 9 L7.5 9 L7.5 13 L6.5 13 L6.5 9 L5 9 Z"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
        strokeLinejoin="round"
      />
      <line
        x1="7"
        y1="5.5"
        x2="7"
        y2="9"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.5"
      />
      <path
        d="M4.5 6 L2.5 8 M9.5 6 L11.5 8"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );

  // Colors history icon: four color dots
  const iconColors = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="3.5" cy="3.5" r="2" fill="currentColor" opacity="0.9" />
      <circle cx="8.5" cy="3.5" r="2" fill="currentColor" opacity="0.6" />
      <circle cx="3.5" cy="8.5" r="2" fill="currentColor" opacity="0.4" />
      <circle cx="8.5" cy="8.5" r="2" fill="currentColor" opacity="0.75" />
    </svg>
  );

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
        <div className="flex-1 flex justify-center items-center gap-1">
          <button
            onClick={() => handleSideChange('front')}
            title="Front view"
            className="rounded p-1.5 transition-colors"
            style={{
              color: side === 'front' ? 'var(--accent)' : 'var(--fg-muted)',
              backgroundColor:
                side === 'front' ? 'var(--accent-faint)' : 'transparent',
            }}
          >
            <span
              className={sideAnimating ? 'side-flip' : ''}
              style={{ display: 'inline-flex' }}
            >
              {iconPersonFront}
            </span>
          </button>
          <span
            className="text-[9px] uppercase tracking-widest font-semibold select-none"
            style={{ color: 'var(--fg-muted)' }}
          >
            {side}
          </span>
          <button
            onClick={() => handleSideChange('back')}
            title="Back view"
            className="rounded p-1.5 transition-colors"
            style={{
              color: side === 'back' ? 'var(--accent)' : 'var(--fg-muted)',
              backgroundColor:
                side === 'back' ? 'var(--accent-faint)' : 'transparent',
            }}
          >
            <span
              className={sideAnimating ? 'side-flip' : ''}
              style={{ display: 'inline-flex' }}
            >
              {iconPersonBack}
            </span>
          </button>
        </div>

        {/* Right: Save */}
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="btn-primary rounded py-1.5 px-4 text-xs uppercase tracking-widest font-bold disabled:opacity-50"
          title="Save sketches to library"
        >
          {saveStatus === 'saving' && '…'}
          {saveStatus === 'saved' && '✓ Saved'}
          {saveStatus === 'error' && 'Error'}
          {saveStatus === 'idle' && '↑ Save'}
        </button>
      </div>

      {/* ── Toolbar + canvas ── */}
      <div
        className={`flex flex-1 overflow-hidden ${toolbarMode === 'side' ? 'flex-row' : 'flex-col'}`}
      >
        <Toolbar onModeChange={setToolbarMode}>
          {/* Layout — two-column in side mode */}
          <ToolbarDropdown id="layout" label="Layout" icon={iconLayout}>
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
          <ToolbarDropdown id="tools" label="Tools" icon={iconDraw}>
            <div className="flex flex-col gap-2 w-full">
              {/* Row 1: Color swatch + shape selector */}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    setIsEraser(false);
                  }}
                  className="color-swatch shrink-0"
                  title="Stroke color"
                />
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

          {/* Colors history — only shown after first stroke */}
          {usedColors.length > 0 && (
            <ToolbarDropdown id="colors" label="Colors" icon={iconColors}>
              <div className="flex flex-col gap-2 w-full">
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
                        backgroundColor: c,
                        border:
                          c === color && !isEraser
                            ? '2px solid var(--accent)'
                            : '1px solid var(--border-strong)',
                        flexShrink: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            </ToolbarDropdown>
          )}
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
