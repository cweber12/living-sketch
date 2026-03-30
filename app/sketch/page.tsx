'use client';

import { useState, useCallback, useRef } from 'react';
import { SketchCanvas } from '@/components/canvas/sketch-canvas';
import { useSketchCanvasRig } from '@/hooks/use-sketch-canvas-rig';
import { BODY_PARTS } from '@/lib/constants/anchor-descriptors';
import type { BodyPartName, Side } from '@/hooks/use-sketch-canvas-rig';

// CSS grid-template-areas — body laid out like a figure on an examination table
const GRID_TEMPLATE_AREAS = `
  ". head ."
  "luarm torso ruarm"
  "llarm torso rlarm"
  "lhand torso rhand"
  "lulg . rulg"
  "lllg . rllg"
  "lfoot . rfoot"
`;

// Grid area name per body part
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

const DEFAULT_COLOR = '#39ff14'; // volt green (accent)
const DEFAULT_BRUSH = 6;
const DEFAULT_CANVAS_SIZE = 110; // px – side column width
const MIN_CANVAS_SIZE = 60;
const MAX_CANVAS_SIZE = 220;

function ToolDivider() {
  return (
    <div
      className="w-px h-6 shrink-0"
      style={{ backgroundColor: 'var(--border)' }}
    />
  );
}

export default function SketchPage() {
  const [side, setSide] = useState<Side>('front');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH);
  const [isEraser, setIsEraser] = useState(false);
  const [canvasSize, setCanvasSize] = useState(DEFAULT_CANVAS_SIZE);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  // Track the very last stroke so Undo only reverts that one canvas
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

      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
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

  // Grid track sizes derived from the canvas-size slider
  const sideCol = canvasSize;
  const centerCol = Math.round(canvasSize * 1.5);
  const rowHead = canvasSize;
  const rowArm = Math.round(canvasSize * 1.6);
  const rowHand = Math.round(canvasSize * 0.9);
  const rowLeg = Math.round(canvasSize * 1.6);
  const rowFoot = Math.round(canvasSize * 0.65);

  return (
    <main className="flex flex-col flex-1 px-4 py-6 max-w-screen-2xl mx-auto w-full gap-6">
      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p
            className="text-xs font-bold tracking-[0.35em] uppercase mb-1"
            style={{ color: 'var(--accent)' }}
          >
            I — Sketch
          </p>
          <h1
            className="font-display font-black uppercase tracking-wider text-2xl"
            style={{ color: 'var(--fg)' }}
          >
            The Laboratory
          </h1>
        </div>

        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="btn-primary rounded px-6 py-2 text-xs uppercase tracking-widest font-bold disabled:opacity-50"
        >
          {saveStatus === 'saving' && 'Saving…'}
          {saveStatus === 'saved' && 'Saved ✓'}
          {saveStatus === 'error' && 'Error — retry'}
          {saveStatus === 'idle' && 'Save to Cloud'}
        </button>
      </div>

      {/* ── Toolbar ───────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-4 px-4 py-3 rounded-lg border"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--surface)',
        }}
      >
        {/* Color */}
        <label
          className="flex items-center gap-2 cursor-pointer"
          title="Brush color"
        >
          <span
            className="text-xs tracking-widest uppercase"
            style={{ color: 'var(--fg-muted)' }}
          >
            Color
          </span>
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              setIsEraser(false);
            }}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0"
            style={{ backgroundColor: 'transparent' }}
          />
        </label>

        <ToolDivider />

        {/* Brush size */}
        <label className="flex items-center gap-2" title="Brush size">
          <span
            className="text-xs tracking-widest uppercase"
            style={{ color: 'var(--fg-muted)' }}
          >
            Brush
          </span>
          <input
            type="range"
            min={1}
            max={40}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-24 accent-accent"
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
          {([false, true] as const).map((erase) => (
            <button
              key={String(erase)}
              onClick={() => setIsEraser(erase)}
              className="px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-widest transition-colors btn-ghost"
              style={
                isEraser === erase
                  ? { backgroundColor: 'var(--accent)', color: 'var(--bg)' }
                  : {}
              }
            >
              {erase ? 'Eraser' : 'Brush'}
            </button>
          ))}
        </div>

        <ToolDivider />

        {/* Undo last stroke */}
        <button
          onClick={handleUndo}
          className="btn-ghost rounded px-3 py-1.5 text-xs uppercase tracking-widest"
        >
          Undo
        </button>

        {/* Clear all */}
        <button
          onClick={clearAll}
          className="btn-ghost rounded px-3 py-1.5 text-xs uppercase tracking-widest"
          style={{ color: 'var(--danger)' }}
        >
          Clear All
        </button>

        <ToolDivider />

        {/* Canvas scale */}
        <label className="flex items-center gap-2" title="Canvas scale">
          <span
            className="text-xs tracking-widest uppercase"
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
            className="w-24 accent-accent"
          />
          <span
            className="text-xs w-9 text-right"
            style={{ color: 'var(--fg-muted)' }}
          >
            {canvasSize}px
          </span>
        </label>
      </div>

      {/* ── Front / Back toggle ───────────────────────────────────── */}
      <div className="flex items-center gap-1 self-start">
        {(['front', 'back'] as Side[]).map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className="px-6 py-2 rounded text-sm font-bold uppercase tracking-widest transition-colors"
            style={
              side === s
                ? { backgroundColor: 'var(--accent)', color: 'var(--bg)' }
                : {
                    color: 'var(--fg-muted)',
                    border: '1px solid var(--border)',
                  }
            }
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Body layout ───────────────────────────────────────────── */}
      {/*
        All 28 canvases (14 × front + back) are always mounted so their
        ImageData is preserved when toggling sides. Only the active side
        is visible; the inactive set is hidden via display:none.
      */}
      <div className="overflow-auto pb-6">
        <div
          style={{
            display: 'grid',
            gridTemplateAreas: GRID_TEMPLATE_AREAS,
            gridTemplateColumns: `${sideCol}px ${centerCol}px ${sideCol}px`,
            gridTemplateRows: `${rowHead}px ${rowArm}px ${rowArm}px ${rowHand}px ${rowLeg}px ${rowLeg}px ${rowFoot}px`,
            gap: '6px',
          }}
        >
          {(['front', 'back'] as Side[]).flatMap((s) =>
            BODY_PARTS.map((part) => (
              <div
                key={`${s}-${part}`}
                style={{
                  gridArea: GRID_AREA[part],
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
                {/* Floating part label */}
                <span
                  className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-bold uppercase tracking-widest pointer-events-none select-none"
                  style={{ color: 'var(--fg-muted)', opacity: 0.6 }}
                >
                  {PART_LABEL[part]}
                </span>
              </div>
            )),
          )}
        </div>
      </div>
    </main>
  );
}
