'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { SketchCanvas } from '@/components/canvas/sketch-canvas';
import { useSketchCanvasRig } from '@/hooks/use-sketch-canvas-rig';
import { BODY_PARTS } from '@/lib/constants/anchor-descriptors';
import type { BodyPartName, Side } from '@/hooks/use-sketch-canvas-rig';

/* ─── Grid templates ──────────────────────────────────────────────── */

const GRID_ARMS_OUT = `
  ".     head head     ."
  "luarm torso torso   ruarm"
  "llarm torso torso   rlarm"
  "lhand mid  mid      rhand"
  ".     lulg  rulg    ."
  ".     lllg  rllg    ."
  ".     lfoot rfoot   ."
`;

const GRID_ARMS_DOWN = `
  "head  head"
  "torso torso"
  "torso torso"
  "mid   mid"
  "luarm ruarm"
  "llarm rlarm"
  "lhand rhand"
  "lulg  rulg"
  "lllg  rllg"
  "lfoot rfoot"
`;

type BodyPartKey = BodyPartName | 'midsection';

const GRID_AREA_OUT: Record<BodyPartKey, string> = {
  head: 'head',
  torso: 'torso',
  midsection: 'mid',
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

const GRID_AREA_DOWN: Record<BodyPartKey, string> = {
  ...GRID_AREA_OUT,
};

const PART_LABEL: Record<BodyPartKey, string> = {
  head: 'Head',
  torso: 'Torso',
  midsection: 'Midsection',
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

const DEFAULT_COLOR = '#39ff14';
const DEFAULT_BRUSH = 6;
const DEFAULT_CANVAS_SIZE = 110;
const MIN_CANVAS_SIZE = 60;
const MAX_CANVAS_SIZE = 220;
const ARMS_OUT_MIN_WIDTH = 640; // below this → force arms down

type ArmPose = 'out' | 'down';
type ViewMode = 'body' | 'single';

/* ─── Helpers ─────────────────────────────────────────────────────── */

function ToolDivider() {
  return (
    <div
      className="w-px h-6 shrink-0 hidden sm:block"
      style={{ backgroundColor: 'var(--border)' }}
    />
  );
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-widest transition-colors btn-ghost"
      style={
        active ? { backgroundColor: 'var(--accent)', color: 'var(--bg)' } : {}
      }
    >
      {children}
    </button>
  );
}

/* ─── Page ────────────────────────────────────────────────────────── */

export default function SketchPage() {
  const [side, setSide] = useState<Side>('front');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH);
  const [isEraser, setIsEraser] = useState(false);
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);
  const [armPose, setArmPose] = useState<ArmPose>('out');
  const [viewMode, setViewMode] = useState<ViewMode>('body');
  const [focusPart, setFocusPart] = useState<BodyPartName>(BODY_PARTS[0]);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  // Track whether viewport is too narrow for arms-out
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${ARMS_OUT_MIN_WIDTH - 1}px)`);
    const handle = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsNarrow(e.matches);
    handle(mq);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  // Effective arm pose: force 'down' on narrow viewports
  const effectiveArms: ArmPose = isNarrow ? 'down' : armPose;

  const lastDrawnRef = useRef<{ side: Side; part: BodyPartName } | null>(null);
  const { setCanvasRef, pushUndoSnapshot, undo, clearAll, exportAll } =
    useSketchCanvasRig();

  const handleStrokeStart = useCallback(
    (strokeSide: Side, part: BodyPartName) => {
      lastDrawnRef.current = { side: strokeSide, part };
      pushUndoSnapshot(strokeSide, part);
    },
    [pushUndoSnapshot],
  );

  const handleUndo = useCallback(() => {
    if (!lastDrawnRef.current) return;
    undo(lastDrawnRef.current.side, lastDrawnRef.current.part);
  }, [undo]);

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const images = exportAll();
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

      if (!res.ok) {
        throw new Error(json.error ?? 'Upload failed');
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  }, [exportAll]);

  /* ---- grid sizing ---- */
  const u = canvasSize;
  const armsOut = effectiveArms === 'out';

  const gridTemplate = armsOut ? GRID_ARMS_OUT : GRID_ARMS_DOWN;
  const gridAreas = armsOut ? GRID_AREA_OUT : GRID_AREA_DOWN;

  const armCol = u;
  const legCol = Math.round(u * 1.15);
  const gridCols = armsOut
    ? `${armCol}px ${legCol}px ${legCol}px ${armCol}px`
    : `${legCol}px ${legCol}px`;

  const gridRows = armsOut
    ? [u, u * 1.3, u * 1.3, u * 0.8, u * 1.75, u * 1.6, u * 0.5]
        .map((v) => `${Math.round(v)}px`)
        .join(' ')
    : [
        u,
        u * 1.3,
        u * 1.3,
        u * 0.8,
        u * 0.9,
        u * 0.9,
        u * 0.7,
        u * 1.75,
        u * 1.6,
        u * 0.5,
      ]
        .map((v) => `${Math.round(v)}px`)
        .join(' ');

  /* ---- render helpers ---- */
  function renderCanvas(s: Side, part: BodyPartName) {
    return (
      <div
        key={`${s}-${part}`}
        style={{
          gridArea: gridAreas[part as BodyPartKey],
          display: s === side ? 'block' : 'none',
          position: 'relative',
          borderRadius: '8px',
          overflow: 'hidden',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--border)',
          backgroundColor: 'var(--surface)',
        }}
      >
        <SketchCanvas
          side={s}
          part={part}
          brushSize={brushSize}
          color={color}
          isEraser={isEraser}
          onMount={setCanvasRef}
          onStrokeStart={handleStrokeStart}
        />
        <span
          className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-bold uppercase tracking-widest pointer-events-none select-none"
          style={{ color: 'var(--fg-muted)', opacity: 0.6 }}
        >
          {PART_LABEL[part as BodyPartKey]}
        </span>
      </div>
    );
  }

  return (
    <main className="flex flex-col flex-1 px-3 sm:px-4 py-4 sm:py-6 max-w-screen-2xl mx-auto w-full gap-4 sm:gap-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p
            className="text-xs font-bold tracking-[0.35em] uppercase mb-1"
            style={{ color: 'var(--accent)' }}
          >
            I — Sketch
          </p>
          <h1
            className="font-display font-black uppercase tracking-wider text-xl sm:text-2xl"
            style={{ color: 'var(--fg)' }}
          >
            The Laboratory
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="btn-primary rounded px-5 py-2 text-xs uppercase tracking-widest font-bold disabled:opacity-50"
        >
          {saveStatus === 'saving' && 'Saving…'}
          {saveStatus === 'saved' && 'Saved ✓'}
          {saveStatus === 'error' && 'Error — retry'}
          {saveStatus === 'idle' && 'Save to Cloud'}
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div
        className="flex flex-wrap items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 rounded-lg border"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--surface)',
        }}
      >
        {/* Front / Back */}
        <div className="flex items-center gap-1">
          {(['front', 'back'] as Side[]).map((s) => (
            <PillButton key={s} active={side === s} onClick={() => setSide(s)}>
              {s}
            </PillButton>
          ))}
        </div>

        <ToolDivider />

        {/* Color */}
        <label className="flex items-center gap-2 cursor-pointer" title="Color">
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setIsEraser(false);
            }}
            className="w-7 h-7 rounded cursor-pointer border-0 p-0"
            style={{ backgroundColor: 'transparent' }}
          />
        </label>

        {/* Brush size */}
        <label className="flex items-center gap-1.5" title="Brush size">
          <input
            type="range"
            min={1}
            max={40}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-16 sm:w-24 accent-accent"
          />
          <span
            className="text-xs w-5 text-right"
            style={{ color: 'var(--fg-muted)' }}
          >
            {brushSize}
          </span>
        </label>

        <ToolDivider />

        {/* Brush / Eraser */}
        <div className="flex items-center gap-1">
          <PillButton active={!isEraser} onClick={() => setIsEraser(false)}>
            Brush
          </PillButton>
          <PillButton active={isEraser} onClick={() => setIsEraser(true)}>
            Eraser
          </PillButton>
        </div>

        <ToolDivider />

        <button
          onClick={handleUndo}
          className="btn-ghost rounded px-3 py-1.5 text-xs uppercase tracking-widest"
        >
          Undo
        </button>
        <button
          onClick={clearAll}
          className="btn-ghost rounded px-3 py-1.5 text-xs uppercase tracking-widest"
          style={{ color: 'var(--danger)' }}
        >
          Clear
        </button>

        <ToolDivider />

        {/* Arms pose — hidden on narrow */}
        <div className="hidden sm:flex items-center gap-1">
          <PillButton
            active={effectiveArms === 'out'}
            onClick={() => setArmPose('out')}
          >
            Arms Out
          </PillButton>
          <PillButton
            active={effectiveArms === 'down'}
            onClick={() => setArmPose('down')}
          >
            Arms Down
          </PillButton>
        </div>

        {/* Scale */}
        <label className="hidden sm:flex items-center gap-1.5" title="Scale">
          <span
            className="text-[10px] tracking-widest uppercase"
            style={{ color: 'var(--fg-muted)' }}
          >
            Scale
          </span>
          <input
            type="range"
            min={MIN_CANVAS_SIZE}
            max={MAX_CANVAS_SIZE}
            value={canvasSize}
            onChange={(e) => setCanvasSize(Number(e.target.value))}
            className="w-20 accent-accent"
          />
        </label>

        {/* Mobile: Body / Single toggle */}
        <div className="flex sm:hidden items-center gap-1 ml-auto">
          <PillButton
            active={viewMode === 'body'}
            onClick={() => setViewMode('body')}
          >
            Body
          </PillButton>
          <PillButton
            active={viewMode === 'single'}
            onClick={() => setViewMode('single')}
          >
            Single
          </PillButton>
        </div>
      </div>

      {/* ── Mobile single-part selector ── */}
      {viewMode === 'single' && (
        <div className="flex sm:hidden overflow-x-auto gap-1.5 pb-1 -mx-1 px-1">
          {BODY_PARTS.map((p) => (
            <button
              key={p}
              onClick={() => setFocusPart(p)}
              className="shrink-0 px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors"
              style={
                focusPart === p
                  ? { backgroundColor: 'var(--accent)', color: 'var(--bg)' }
                  : {
                      color: 'var(--fg-muted)',
                      border: '1px solid var(--border)',
                    }
              }
            >
              {PART_LABEL[p as BodyPartKey]}
            </button>
          ))}
        </div>
      )}

      {/* ── Body layout ── */}
      {/*
        All canvases (front+back) are always mounted to preserve ImageData.
        On mobile "single" mode, only the focused part is visible.
        On desktop / mobile "body" mode, the full grid is shown.
      */}

      {/* Desktop + mobile-body: full grid */}
      <div
        className={
          viewMode === 'single'
            ? 'hidden sm:flex justify-center overflow-auto pb-4'
            : 'flex justify-center overflow-auto pb-4'
        }
      >
        <div
          style={{
            display: 'grid',
            gridTemplateAreas: gridTemplate,
            gridTemplateColumns: gridCols,
            gridTemplateRows: gridRows,
            gap: '5px',
          }}
        >
          {(['front', 'back'] as Side[]).flatMap((s) =>
            BODY_PARTS.map((part) => renderCanvas(s, part)),
          )}
        </div>
      </div>

      {/* Mobile single: enlarged single canvas */}
      <div
        className={
          viewMode === 'single'
            ? 'flex sm:hidden flex-col items-center gap-2 pb-4'
            : 'hidden'
        }
      >
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: 'var(--accent)' }}
        >
          {PART_LABEL[focusPart as BodyPartKey]}
        </p>
        <div
          style={{
            width: 'min(90vw, 360px)',
            aspectRatio: '1',
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            position: 'relative',
          }}
        >
          {/* Render both sides but only show active */}
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
                onMount={setCanvasRef}
                onStrokeStart={handleStrokeStart}
              />
            </div>
          ))}
          <span
            className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-bold uppercase tracking-widest pointer-events-none select-none"
            style={{ color: 'var(--fg-muted)', opacity: 0.5 }}
          >
            {side}
          </span>
        </div>
      </div>
    </main>
  );
}
