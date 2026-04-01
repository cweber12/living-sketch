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
  ToolbarSection,
  SegmentedControl,
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

const DEFAULT_COLOR_LIGHT = '#180e04';
const DEFAULT_COLOR_DARK = '#39ff14';
const DEFAULT_BRUSH = 6;
const DEFAULT_CANVAS_SIZE = 110;
const MIN_CANVAS_SIZE = 60;
const MAX_CANVAS_SIZE = 220;
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
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);
  const [armPose, setArmPose] = useState<ArmPose>('up');
  const [viewMode, setViewMode] = useState<ViewMode>('body');
  const [focusIdx, setFocusIdx] = useState(0);
  const [tool, setTool] = useState<ShapeTool>('pen');
  const [shapesOpen, setShapesOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const backInitialised = useRef(false);

  const [isMobile, setIsMobile] = useState(false);
  const shapesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BP - 1}px)`);
    const handle = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handle(mq);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  // Close shapes dropdown on outside click
  useEffect(() => {
    if (!shapesOpen) return;
    const handler = (e: MouseEvent) => {
      if (shapesRef.current && !shapesRef.current.contains(e.target as Node)) {
        setShapesOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shapesOpen]);

  const effectiveArms: ArmPose = isMobile ? 'down' : armPose;
  const focusPart = PARTS_ORDER[focusIdx];

  const lastDrawnRef = useRef<{ side: Side; part: BodyPartName } | null>(null);
  const {
    setCanvasRef,
    pushUndoSnapshot,
    undo,
    clearAll,
    exportAll,
    copyCanvas,
  } = useSketchCanvasRig();

  /** First time user selects "back", copy all front canvases to back */
  const handleSideChange = useCallback(
    (newSide: Side) => {
      if (newSide === 'back' && !backInitialised.current) {
        backInitialised.current = true;
        for (const part of BODY_PARTS) {
          copyCanvas('front', part, 'back', part);
        }
      }
      setSide(newSide);
    },
    [copyCanvas],
  );

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
  const u = canvasSize;
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

  /* ── Toolbar content ── */
  const toolbarContent = (
    <>
      <ToolbarSection label="View">
        <SegmentedControl
          options={['front', 'back'] as Side[]}
          value={side}
          onChange={handleSideChange}
        />
      </ToolbarSection>

      <ToolbarSection label="Body">
        <SegmentedControl
          options={['body', 'single'] as ViewMode[]}
          value={viewMode}
          onChange={setViewMode}
          labels={{ body: 'Full', single: 'Parts' }}
        />
      </ToolbarSection>

      {!isMobile && (
        <ToolbarSection label="Arm Layout">
          <SegmentedControl
            options={['up', 'down'] as ArmPose[]}
            value={armPose}
            onChange={setArmPose}
            labels={{ up: 'Up', down: 'Down' }}
          />
          <label className="flex flex-col gap-1">
            <span
              className="text-[9px] uppercase tracking-widest"
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
              className="w-full accent-accent"
            />
          </label>
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
        </ToolbarSection>
      )}

      <ToolbarSection label="Draw">
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
          <input
            type="range"
            min={1}
            max={40}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="flex-1 accent-accent"
            title="Brush size"
          />
          <span
            className="text-[10px] tabular-nums w-5 shrink-0"
            style={{ color: 'var(--fg-muted)' }}
          >
            {brushSize}
          </span>
        </div>
        <SegmentedControl
          options={['pen', 'eraser'] as ('pen' | 'eraser')[]}
          value={isEraser ? 'eraser' : 'pen'}
          onChange={(v) => setIsEraser(v === 'eraser')}
          labels={{ pen: 'Pen', eraser: 'Erase' }}
          dangerValue="eraser"
        />
      </ToolbarSection>

      <ToolbarSection label="Shapes">
        <div className="relative" ref={shapesRef}>
          <button
            onClick={() => setShapesOpen((o) => !o)}
            className="btn-ghost w-full rounded py-1.5 text-xs uppercase tracking-widest text-left px-2 flex items-center justify-between"
          >
            <span>
              {SHAPE_OPTIONS.find((s) => s.value === tool)?.label ?? 'Pen'}
            </span>
            <span className="text-[10px]">{shapesOpen ? '▲' : '▼'}</span>
          </button>
          {shapesOpen && (
            <div
              className="absolute left-0 right-0 z-50 mt-1 rounded-lg overflow-hidden shadow-lg"
              style={{
                backgroundColor: 'var(--surface-raised, var(--surface))',
                border: '1px solid var(--border)',
              }}
            >
              {SHAPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setTool(opt.value);
                    if (opt.value !== 'pen') setIsEraser(false);
                    setShapesOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs uppercase tracking-widest transition-colors hover:opacity-80"
                  style={
                    tool === opt.value
                      ? {
                          backgroundColor: 'var(--accent)',
                          color: 'var(--bg)',
                        }
                      : { color: 'var(--fg)' }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </ToolbarSection>

      {isMobile ? (
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            className="btn-ghost flex-1 rounded py-1.5 text-xs uppercase tracking-widest px-2"
            title="Undo last stroke"
          >
            ↩ Undo
          </button>
          <button
            onClick={clearAll}
            className="btn-ghost flex-1 rounded py-1.5 text-xs uppercase tracking-widest px-2"
            style={{ color: 'var(--danger)' }}
            title="Clear all canvases"
          >
            ✕ Clear
          </button>
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="btn-primary flex-1 rounded py-1.5 text-xs uppercase tracking-widest font-bold disabled:opacity-50"
            title="Save sketches to library"
          >
            {saveStatus === 'saving'
              ? '…'
              : saveStatus === 'saved'
                ? '✓'
                : saveStatus === 'error'
                  ? '!'
                  : 'Save'}
          </button>
        </div>
      ) : (
        <>
          <ToolbarSection label="History">
            <button
              onClick={handleUndo}
              className="btn-ghost w-full rounded py-1.5 text-xs uppercase tracking-widest text-left px-2"
              title="Undo last stroke"
            >
              ↩ Undo
            </button>
            <button
              onClick={clearAll}
              className="btn-ghost w-full rounded py-1.5 text-xs uppercase tracking-widest text-left px-2"
              style={{ color: 'var(--danger)' }}
              title="Clear all canvases"
            >
              ✕ Clear
            </button>
          </ToolbarSection>

          <ToolbarSection label="Save">
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="btn-primary w-full rounded py-2 text-xs uppercase tracking-widest font-bold disabled:opacity-50"
              title="Save sketches to library"
            >
              {saveStatus === 'saving' && 'Saving…'}
              {saveStatus === 'saved' && 'Saved ✓'}
              {saveStatus === 'error' && 'Error'}
              {saveStatus === 'idle' && 'Save'}
            </button>
          </ToolbarSection>
        </>
      )}
    </>
  );

  return (
    <main className="flex flex-col lg:flex-row flex-1 w-full max-w-screen-2xl mx-auto overflow-hidden">
      <Toolbar sideWidth={200}>{toolbarContent}</Toolbar>

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
                        tool={activeTool}
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

            <BodyThumbnail focusPart={focusPart} onSelect={selectPart} />
          </>
        )}
      </div>
    </main>
  );
}
