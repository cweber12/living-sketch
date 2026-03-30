'use client';

import { useState, useCallback } from 'react';
import { SketchCanvas } from '@/components/canvas/sketch-canvas';
import { useSketchCanvasRig } from '@/hooks/use-sketch-canvas-rig';
import { BODY_PARTS } from '@/lib/constants/anchor-descriptors';
import type { BodyPartName, Side } from '@/hooks/use-sketch-canvas-rig';

// Display labels and aspect ratios (width:height) for each body part
const PART_META: Record<BodyPartName, { label: string; aspect: string }> = {
  head: { label: 'Head', aspect: '1 / 1' },
  torso: { label: 'Torso', aspect: '3 / 4' },
  leftUpperArm: { label: 'L Upper Arm', aspect: '1 / 2' },
  leftLowerArm: { label: 'L Lower Arm', aspect: '1 / 2' },
  leftHand: { label: 'L Hand', aspect: '4 / 5' },
  rightUpperArm: { label: 'R Upper Arm', aspect: '1 / 2' },
  rightLowerArm: { label: 'R Lower Arm', aspect: '1 / 2' },
  rightHand: { label: 'R Hand', aspect: '4 / 5' },
  leftUpperLeg: { label: 'L Upper Leg', aspect: '1 / 2' },
  leftLowerLeg: { label: 'L Lower Leg', aspect: '1 / 2' },
  leftFoot: { label: 'L Foot', aspect: '5 / 3' },
  rightUpperLeg: { label: 'R Upper Leg', aspect: '1 / 2' },
  rightLowerLeg: { label: 'R Lower Leg', aspect: '1 / 2' },
  rightFoot: { label: 'R Foot', aspect: '5 / 3' },
};

const DEFAULT_COLOR = '#39ff14'; // volt green (accent)
const DEFAULT_BRUSH = 6;

export default function SketchPage() {
  const [side, setSide] = useState<Side>('front');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH);
  const [isEraser, setIsEraser] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  const { setCanvasRef, pushUndoSnapshot, undo, clearAll, exportAll } =
    useSketchCanvasRig();

  const handleUndo = useCallback(() => {
    for (const part of BODY_PARTS) undo(side, part);
  }, [side, undo]);

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
        const json = await res.json();
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
        {/* Color picker */}
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

        <div
          className="w-px h-6 shrink-0"
          style={{ backgroundColor: 'var(--border)' }}
        />

        {/* Stroke width */}
        <label className="flex items-center gap-2" title="Brush size">
          <span
            className="text-xs tracking-widest uppercase"
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
            className="w-24 accent-accent"
          />
          <span
            className="text-xs w-5 text-right"
            style={{ color: 'var(--fg-muted)' }}
          >
            {brushSize}
          </span>
        </label>

        <div
          className="w-px h-6 shrink-0"
          style={{ backgroundColor: 'var(--border)' }}
        />

        {/* Brush / Eraser toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEraser(false)}
            className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-widest transition-colors ${!isEraser ? '' : 'btn-ghost'}`}
            style={
              !isEraser
                ? { backgroundColor: 'var(--accent)', color: 'var(--bg)' }
                : {}
            }
          >
            Brush
          </button>
          <button
            onClick={() => setIsEraser(true)}
            className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-widest transition-colors ${isEraser ? '' : 'btn-ghost'}`}
            style={
              isEraser
                ? { backgroundColor: 'var(--accent)', color: 'var(--bg)' }
                : {}
            }
          >
            Eraser
          </button>
        </div>

        <div
          className="w-px h-6 shrink-0"
          style={{ backgroundColor: 'var(--border)' }}
        />

        {/* Undo */}
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

      {/* ── Canvas grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
        {BODY_PARTS.map((part) => {
          const meta = PART_META[part];
          return (
            <div key={part} className="flex flex-col gap-1">
              <p
                className="text-xs font-semibold uppercase tracking-widest text-center truncate"
                style={{ color: 'var(--fg-muted)' }}
              >
                {meta.label}
              </p>
              <div
                className="rounded-lg overflow-hidden border"
                style={{
                  aspectRatio: meta.aspect,
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--surface)',
                }}
              >
                <SketchCanvas
                  key={`${side}-${part}`}
                  side={side}
                  part={part}
                  brushSize={brushSize}
                  color={color}
                  isEraser={isEraser}
                  onMount={setCanvasRef}
                  onStrokeStart={pushUndoSnapshot}
                />
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
