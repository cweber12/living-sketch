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

const GRID_AREA: Record<BodyPartKey, string> = {
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

/* Ordered list for single-part navigation (top-to-bottom body order) */
const PARTS_ORDER: BodyPartName[] = [
  'head',
  'torso',
  'midsection' as BodyPartName,
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

const DEFAULT_COLOR = '#39ff14';
const DEFAULT_BRUSH = 6;
const DEFAULT_CANVAS_SIZE = 110;
const MIN_CANVAS_SIZE = 60;
const MAX_CANVAS_SIZE = 220;
const MOBILE_BREAKPOINT = 640; // sm

type ArmPose = 'out' | 'down';
type ViewMode = 'body' | 'single';

/* ─── Helpers ─────────────────────────────────────────────────────── */

function PillButton({
  active,
  onClick,
  children,
  className = '',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-widest transition-colors btn-ghost ${className}`}
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
  const [focusIdx, setFocusIdx] = useState(0);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  const [isMobile, setIsMobile] = useState(false);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handle = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handle(mq);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  // Force arms down on mobile
  const effectiveArms: ArmPose = isMobile ? 'down' : armPose;
  const focusPart = PARTS_ORDER[focusIdx];

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
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  }, [exportAll]);

  /* ── Prev / Next for single mode ── */
  const goPrev = useCallback(
    () => setFocusIdx((i) => (i > 0 ? i - 1 : PARTS_ORDER.length - 1)),
    [],
  );
  const goNext = useCallback(
    () => setFocusIdx((i) => (i < PARTS_ORDER.length - 1 ? i + 1 : 0)),
    [],
  );

  /* ── Body-mode scroll buttons ── */
  const scrollBody = useCallback((dir: 'up' | 'down') => {
    const el = bodyScrollRef.current;
    if (!el) return;
    const step = el.clientHeight * 0.7;
    el.scrollBy({ top: dir === 'up' ? -step : step, behavior: 'smooth' });
  }, []);

  /* ── Grid sizing ── */
  const u = canvasSize;
  const armsOut = effectiveArms === 'out';
  const gridTemplate = armsOut ? GRID_ARMS_OUT : GRID_ARMS_DOWN;

  // On mobile body mode: compute u from screen width
  const mobileU =
    typeof window !== 'undefined'
      ? Math.floor((window.innerWidth - 24) / 2)
      : 160;
  const effectiveU = isMobile && viewMode === 'body' ? mobileU : u;

  const armCol = effectiveU;
  const legCol = Math.round(effectiveU * 1.15);
  const gridCols = armsOut
    ? `${armCol}px ${legCol}px ${legCol}px ${armCol}px`
    : `${legCol}px ${legCol}px`;

  const gridRows = armsOut
    ? [
        effectiveU,
        effectiveU * 1.3,
        effectiveU * 1.3,
        effectiveU * 0.8,
        effectiveU * 1.75,
        effectiveU * 1.6,
        effectiveU * 0.5,
      ]
        .map((v) => `${Math.round(v)}px`)
        .join(' ')
    : [
        effectiveU,
        effectiveU * 1.3,
        effectiveU * 1.3,
        effectiveU * 0.8,
        effectiveU * 0.9,
        effectiveU * 0.9,
        effectiveU * 0.7,
        effectiveU * 1.75,
        effectiveU * 1.6,
        effectiveU * 0.5,
      ]
        .map((v) => `${Math.round(v)}px`)
        .join(' ');

  /* ── Render helpers ── */
  function renderCanvas(s: Side, part: BodyPartName) {
    return (
      <div
        key={`${s}-${part}`}
        style={{
          gridArea: GRID_AREA[part as BodyPartKey],
          display: s === side ? 'block' : 'none',
          position: 'relative',
          borderRadius: '6px',
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
          className="absolute bottom-0.5 left-0 right-0 text-center text-[8px] font-bold uppercase tracking-widest pointer-events-none select-none"
          style={{ color: 'var(--fg-muted)', opacity: 0.5 }}
        >
          {PART_LABEL[part as BodyPartKey]}
        </span>
      </div>
    );
  }

  return (
    <main className="flex flex-col flex-1 w-full max-w-screen-2xl mx-auto overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 pt-3 sm:pt-5 pb-2 sm:pb-4">
        <div className="min-w-0">
          <p
            className="text-[10px] sm:text-xs font-bold tracking-[0.35em] uppercase mb-0.5"
            style={{ color: 'var(--accent)' }}
          >
            I — Sketch
          </p>
          <h1
            className="font-display font-black uppercase tracking-wider text-lg sm:text-2xl truncate"
            style={{ color: 'var(--fg)' }}
          >
            The Laboratory
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="btn-primary rounded px-3 sm:px-5 py-1.5 sm:py-2 text-[10px] sm:text-xs uppercase tracking-widest font-bold disabled:opacity-50 shrink-0"
        >
          {saveStatus === 'saving' && 'Saving…'}
          {saveStatus === 'saved' && 'Saved ✓'}
          {saveStatus === 'error' && 'Error — retry'}
          {saveStatus === 'idle' && 'Save'}
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div
        className="w-full px-3 sm:px-4 py-2 border-y flex flex-col gap-2"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--surface)',
        }}
      >
        {/* Row 1: Side toggle + drawing tools */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Front / Back */}
          <div className="flex items-center gap-0.5 shrink-0">
            {(['front', 'back'] as Side[]).map((s) => (
              <PillButton
                key={s}
                active={side === s}
                onClick={() => setSide(s)}
              >
                {s}
              </PillButton>
            ))}
          </div>

          <div
            className="w-px h-5 hidden sm:block"
            style={{ backgroundColor: 'var(--border)' }}
          />

          {/* Color */}
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setIsEraser(false);
            }}
            className="w-7 h-7 rounded cursor-pointer border-0 p-0 shrink-0"
            style={{ backgroundColor: 'transparent' }}
            title="Color"
          />

          {/* Brush size */}
          <input
            type="range"
            min={1}
            max={40}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-16 sm:w-20 accent-accent shrink-0"
            title="Brush size"
          />
          <span
            className="text-[10px] w-4 shrink-0"
            style={{ color: 'var(--fg-muted)' }}
          >
            {brushSize}
          </span>

          {/* Brush / Eraser */}
          <div className="flex items-center gap-0.5 shrink-0">
            <PillButton active={!isEraser} onClick={() => setIsEraser(false)}>
              Brush
            </PillButton>
            <PillButton active={isEraser} onClick={() => setIsEraser(true)}>
              Eraser
            </PillButton>
          </div>

          {/* Undo + Clear */}
          <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
            <button
              onClick={handleUndo}
              className="btn-ghost rounded px-2 py-1 text-[10px] sm:text-xs uppercase tracking-widest"
            >
              Undo
            </button>
            <button
              onClick={clearAll}
              className="btn-ghost rounded px-2 py-1 text-[10px] sm:text-xs uppercase tracking-widest"
              style={{ color: 'var(--danger)' }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Row 2: View controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Arms pose — desktop only */}
          <div className="hidden sm:flex items-center gap-0.5">
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

          {/* Canvas scale — desktop only */}
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

          {/* View mode — mobile only */}
          <div className="flex sm:hidden items-center gap-0.5">
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

          {/* Single-part dropdown — mobile single mode */}
          {isMobile && viewMode === 'single' && (
            <select
              value={focusIdx}
              onChange={(e) => setFocusIdx(Number(e.target.value))}
              className="ml-auto rounded px-2 py-1 text-[11px] uppercase tracking-wider font-semibold"
              style={{
                backgroundColor: 'var(--bg)',
                color: 'var(--fg)',
                border: '1px solid var(--border)',
              }}
            >
              {PARTS_ORDER.map((p, i) => (
                <option key={p} value={i}>
                  {PART_LABEL[p as BodyPartKey]}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Canvas area ── */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* ── BODY MODE ── */}
        <div
          className={
            isMobile && viewMode === 'single'
              ? 'hidden'
              : 'flex-1 flex flex-col min-h-0'
          }
        >
          {/* Scroll-up button (mobile body) */}
          {isMobile && viewMode === 'body' && (
            <button
              onClick={() => scrollBody('up')}
              className="w-full py-1.5 text-center shrink-0"
              style={{
                color: 'var(--fg-muted)',
                backgroundColor: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
              }}
              aria-label="Scroll up"
            >
              <span className="text-lg leading-none">▲</span>
            </button>
          )}

          {/* Scrollable grid */}
          <div
            ref={bodyScrollRef}
            className="flex-1 overflow-auto flex justify-center px-2 sm:px-4 py-3 sm:py-4"
          >
            <div
              style={{
                display: 'grid',
                gridTemplateAreas: gridTemplate,
                gridTemplateColumns: gridCols,
                gridTemplateRows: gridRows,
                gap: isMobile ? '3px' : '5px',
              }}
            >
              {(['front', 'back'] as Side[]).flatMap((s) =>
                BODY_PARTS.map((part) => renderCanvas(s, part)),
              )}
            </div>
          </div>

          {/* Scroll-down button (mobile body) */}
          {isMobile && viewMode === 'body' && (
            <button
              onClick={() => scrollBody('down')}
              className="w-full py-1.5 text-center shrink-0"
              style={{
                color: 'var(--fg-muted)',
                backgroundColor: 'var(--surface)',
                borderTop: '1px solid var(--border)',
              }}
              aria-label="Scroll down"
            >
              <span className="text-lg leading-none">▼</span>
            </button>
          )}
        </div>

        {/* ── SINGLE-PART MODE (mobile only) ── */}
        {isMobile && viewMode === 'single' && (
          <div className="flex-1 flex items-center justify-center gap-2 px-2 py-3">
            {/* Prev arrow */}
            <button
              onClick={goPrev}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--fg)',
              }}
              aria-label="Previous part"
            >
              ◀
            </button>

            {/* Canvas */}
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--accent)' }}
              >
                {PART_LABEL[focusPart as BodyPartKey]}
              </p>
              <div
                style={{
                  width: 'min(75vw, 340px)',
                  aspectRatio: '1',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  position: 'relative',
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
                      onMount={setCanvasRef}
                      onStrokeStart={handleStrokeStart}
                    />
                  </div>
                ))}
                <span
                  className="absolute bottom-1.5 left-0 right-0 text-center text-[10px] font-bold uppercase tracking-widest pointer-events-none select-none"
                  style={{ color: 'var(--fg-muted)', opacity: 0.5 }}
                >
                  {side}
                </span>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>
                {focusIdx + 1} / {PARTS_ORDER.length}
              </p>
            </div>

            {/* Next arrow */}
            <button
              onClick={goNext}
              className="shrink-0 w-10 h-10 flex items-center justify-center rounded-full"
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
        )}
      </div>
    </main>
  );
}
