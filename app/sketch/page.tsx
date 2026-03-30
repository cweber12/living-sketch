'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { SketchCanvas } from '@/components/canvas/sketch-canvas';
import { useSketchCanvasRig } from '@/hooks/use-sketch-canvas-rig';
import { BODY_PARTS } from '@/lib/constants/anchor-descriptors';
import type { BodyPartName, Side } from '@/hooks/use-sketch-canvas-rig';

/* ─── Grid templates ──────────────────────────────────────────────── */

// Arms Up: 8 columns – arms form a single horizontal row through the torso
const GRID_ARMS_UP = `
  ".     .     .     head  head  .     .     ."
  "lhand llarm luarm torso torso ruarm rlarm rhand"
  ".     .     .     torso torso .     .     ."
  ".     .     .     lulg  rulg  .     .     ."
  ".     .     .     lllg  rllg  .     .     ."
  ".     .     .     lfoot rfoot .     .     ."
`;

// Arms Down: 4 columns – arms as side columns, hands at upper-leg level
const GRID_ARMS_DOWN = `
  ".     head  head  ."
  "luarm torso torso ruarm"
  "llarm torso torso rlarm"
  "lhand lulg  rulg  rhand"
  ".     lllg  rllg  ."
  ".     lfoot rfoot ."
`;

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

/* Relative proportions (w × h) per part – matches arms-down grid cell sizes */
const PART_PROPORTIONS: Record<BodyPartName, { w: number; h: number }> = {
  head: { w: 2.3, h: 1 },
  torso: { w: 2.3, h: 2.6 },
  leftUpperArm: { w: 1, h: 1.3 },
  leftLowerArm: { w: 1, h: 1.3 },
  leftHand: { w: 1, h: 1.75 },
  rightUpperArm: { w: 1, h: 1.3 },
  rightLowerArm: { w: 1, h: 1.3 },
  rightHand: { w: 1, h: 1.75 },
  leftUpperLeg: { w: 1.15, h: 1.75 },
  leftLowerLeg: { w: 1.15, h: 1.6 },
  leftFoot: { w: 1.15, h: 0.5 },
  rightUpperLeg: { w: 1.15, h: 1.75 },
  rightLowerLeg: { w: 1.15, h: 1.6 },
  rightFoot: { w: 1.15, h: 0.5 },
};

/* Ordered list for single-part navigation (top-to-bottom body order) */
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

const DEFAULT_COLOR = '#39ff14';
const DEFAULT_BRUSH = 6;
const DEFAULT_CANVAS_SIZE = 110;
const MIN_CANVAS_SIZE = 60;
const MAX_CANVAS_SIZE = 220;
const MOBILE_BP = 640;

type ArmPose = 'up' | 'down';
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

/* ─── Body Thumbnail (single-part mode) ──────────────────────────── */

function BodyThumbnail({
  focusPart,
  onSelect,
}: {
  focusPart: BodyPartName;
  onSelect: (part: BodyPartName) => void;
}) {
  const t = 10; // tiny base unit
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
          gridTemplateRows: [t, t * 1.3, t * 1.3, t * 1.75, t * 1.6, t * 0.5]
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

export default function SketchPage() {
  const [side, setSide] = useState<Side>('front');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH);
  const [isEraser, setIsEraser] = useState(false);
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);
  const [armPose, setArmPose] = useState<ArmPose>('down');
  const [viewMode, setViewMode] = useState<ViewMode>('body');
  const [focusIdx, setFocusIdx] = useState(0);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  const [isMobile, setIsMobile] = useState(false);
  const bodyScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BP - 1}px)`);
    const handle = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handle(mq);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

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

  /* ── Single-part navigation ── */
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

  /* ── Body-mode scroll buttons ── */
  const scrollBody = useCallback((dir: 'up' | 'down') => {
    const el = bodyScrollRef.current;
    if (!el) return;
    el.scrollBy({
      top: dir === 'up' ? -el.clientHeight * 0.65 : el.clientHeight * 0.65,
      behavior: 'smooth',
    });
  }, []);

  /* ── Grid sizing ── */
  const u = canvasSize;
  const armsUp = effectiveArms === 'up';
  const gridTemplate = armsUp ? GRID_ARMS_UP : GRID_ARMS_DOWN;

  // On mobile body mode, size grid to fill screen width
  const mobileU =
    typeof window !== 'undefined'
      ? Math.floor((window.innerWidth - 20) / 4.3) // 4 cols: u + 1.15u + 1.15u + u = 4.3u
      : 80;
  const effectiveU = isMobile && viewMode === 'body' ? mobileU : u;

  const armCol = effectiveU;
  const legCol = Math.round(effectiveU * 1.15);
  const armSmCol = Math.round(effectiveU * 0.7); // narrow cols for arms-up

  const gridCols = armsUp
    ? `${armSmCol}px ${armSmCol}px ${armSmCol}px ${legCol}px ${legCol}px ${armSmCol}px ${armSmCol}px ${armSmCol}px`
    : `${armCol}px ${legCol}px ${legCol}px ${armCol}px`;

  const gridRows = armsUp
    ? [
        effectiveU,
        effectiveU * 0.9,
        effectiveU * 1.5,
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
          onMount={setCanvasRef}
          onStrokeStart={handleStrokeStart}
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

  /* ── Single-part canvas dimensions ── */
  const focusProps = PART_PROPORTIONS[focusPart];

  return (
    <main className="flex flex-col flex-1 w-full max-w-screen-2xl mx-auto overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 pt-3 sm:pt-5 pb-2 sm:pb-3">
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
        className="w-full px-3 sm:px-4 py-2 border-y flex flex-col gap-1.5"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--surface)',
        }}
      >
        {/* Row 1: Side + drawing tools */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
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

          <input
            type="range"
            min={1}
            max={40}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-14 sm:w-20 accent-accent shrink-0"
            title="Brush size"
          />
          <span
            className="text-[10px] w-4 shrink-0"
            style={{ color: 'var(--fg-muted)' }}
          >
            {brushSize}
          </span>

          <div className="flex items-center gap-0.5 shrink-0">
            <PillButton active={!isEraser} onClick={() => setIsEraser(false)}>
              Brush
            </PillButton>
            <PillButton active={isEraser} onClick={() => setIsEraser(true)}>
              Eraser
            </PillButton>
          </div>

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

        {/* Row 2: View + layout controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Arms pose — desktop */}
          <div className="hidden sm:flex items-center gap-0.5">
            <PillButton
              active={effectiveArms === 'up'}
              onClick={() => setArmPose('up')}
            >
              Arms Up
            </PillButton>
            <PillButton
              active={effectiveArms === 'down'}
              onClick={() => setArmPose('down')}
            >
              Arms Down
            </PillButton>
          </div>

          {/* Scale — desktop */}
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

          {/* View mode — mobile */}
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

          {/* Part dropdown — mobile single mode */}
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
                  {PART_LABEL[p]}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Canvas area ── */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        {/* ── BODY MODE ── */}
        <div
          className={
            isMobile && viewMode === 'single'
              ? 'hidden'
              : 'flex-1 flex flex-col min-h-0'
          }
        >
          {/* Scroll up */}
          {isMobile && viewMode === 'body' && (
            <button
              onClick={() => scrollBody('up')}
              className="w-full py-1 text-center shrink-0"
              style={{
                color: 'var(--fg-muted)',
                backgroundColor: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
              }}
              aria-label="Scroll up"
            >
              <span className="text-base leading-none">▲</span>
            </button>
          )}

          <div
            ref={bodyScrollRef}
            className="flex-1 overflow-auto flex justify-center px-2 sm:px-4 py-3"
          >
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

          {/* Scroll down */}
          {isMobile && viewMode === 'body' && (
            <button
              onClick={() => scrollBody('down')}
              className="w-full py-1 text-center shrink-0"
              style={{
                color: 'var(--fg-muted)',
                backgroundColor: 'var(--surface)',
                borderTop: '1px solid var(--border)',
              }}
              aria-label="Scroll down"
            >
              <span className="text-base leading-none">▼</span>
            </button>
          )}
        </div>

        {/* ── SINGLE-PART MODE (mobile) ── */}
        {isMobile && viewMode === 'single' && (
          <>
            <div className="flex-1 flex items-center justify-center gap-2 px-2 py-3 min-h-0">
              {/* Prev */}
              <button
                onClick={goPrev}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-sm"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg)',
                }}
                aria-label="Previous part"
              >
                ◀
              </button>

              {/* Canvas at proportional size */}
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
                    aspectRatio: `${focusProps.w} / ${focusProps.h}`,
                    width: '100%',
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
                </div>
                <p
                  className="text-[10px] shrink-0"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  {focusIdx + 1} / {PARTS_ORDER.length}
                </p>
              </div>

              {/* Next */}
              <button
                onClick={goNext}
                className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-sm"
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

            {/* Body thumbnail – fixed bottom right */}
            <BodyThumbnail focusPart={focusPart} onSelect={selectPart} />
          </>
        )}
      </div>
    </main>
  );
}
