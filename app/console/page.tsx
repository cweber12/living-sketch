'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type {
  LandmarkFrame,
  FileEntry,
  SvgParts,
  Dimensions,
} from '@/lib/types';
import { useShiftFactorsStore } from '@/lib/stores/shift-factors-store';
import { useScaleFactorsStore } from '@/lib/stores/scale-factors-store';
import { useCacheSvgs } from '@/hooks/use-cache-svgs';
import { scaleLandmarkFrames } from '@/lib/utils/pose-utils';
import {
  filterAndInterpolateFrames,
  interpolateLowConfidenceLandmarks,
} from '@/lib/utils/frame-filter';
import { smoothLandmarkFrames } from '@/lib/utils/landmark-smoother';
import { TorsoDimensions } from '@/lib/utils/torso-dimensions';
import AnimationCanvas from '@/components/canvas/animation-canvas';
import ShiftControls from '@/components/controls/shift-controls';
import ScaleControls from '@/components/controls/scale-controls';
import FileList from '@/components/controls/file-list';
import {
  Toolbar,
  ToolbarDropdown,
  SegmentedControl,
  type ToolbarMode,
} from '@/components/ui/toolbar';

const CANVAS_W = 640;
const CANVAS_H = 480;

function formatFileTimestamp(name: string): string {
  // ISO-like: "2026-03-31T13-16-35-194Z" or "capture-2026-03-31T05-36-51-828Z.json"
  const isoFixed = name
    .replace(/^capture-/, '')
    .replace(/\.json$/, '')
    .replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, 'T$1:$2:$3.$4Z');
  const d = new Date(isoFixed);
  if (!isNaN(d.getTime())) {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return name;
}

// formatCreationLabel removed — FileList now shows plain timestamps for all files

export default function ConsolePage() {
  /* ── State ──────────────────────────────────────────────────────── */
  const [landmarkFile, setLandmarkFile] = useState<string | null>(null);
  const [svgFile, setSvgFile] = useState<string | null>(null);
  const [frames, setFrames] = useState<LandmarkFrame[]>([]);
  const [origDims, setOrigDims] = useState<Dimensions>({
    width: CANVAS_W,
    height: CANVAS_H,
  });
  const [svgParts, setSvgParts] = useState<SvgParts>({});
  const [playing, setPlaying] = useState(false);
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [toolsPanel, setToolsPanel] = useState<'shift' | 'scale' | null>(null);
  const [showAnchors, setShowAnchors] = useState(false);
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>('side');
  const [previewBgColor, setPreviewBgColor] = useState('#1a1a1a');
  const [previewScale, setPreviewScale] = useState(1);
  const [fileView, setFileView] = useState<'animations' | 'creations'>(
    'animations',
  );

  const [torsoDimsVal] = useState(() => new TorsoDimensions());
  const shifts = useShiftFactorsStore(
    useShallow((s) => ({
      torsoShift: s.torsoShift,
      headShift: s.headShift,
      shoulderShift: s.shoulderShift,
      elbowShift: s.elbowShift,
      wristShift: s.wristShift,
      hipShift: s.hipShift,
      kneeShift: s.kneeShift,
      ankleShift: s.ankleShift,
      footShift: s.footShift,
    })),
  );
  const scales = useScaleFactorsStore(
    useShallow((s) => ({
      headScale: s.headScale,
      armScale: s.armScale,
      handScale: s.handScale,
      legScale: s.legScale,
      footScale: s.footScale,
    })),
  );
  const svgImages = useCacheSvgs(svgParts, torsoDimsVal);

  // Pipeline: filter bad frames → fill per-landmark holes → smooth → scale
  const scaledFrames = useMemo(() => {
    const filtered = filterAndInterpolateFrames(frames);
    const filled = interpolateLowConfidenceLandmarks(filtered);
    const smoothed = smoothLandmarkFrames(filled);
    return scaleLandmarkFrames(smoothed, origDims, {
      width: CANVAS_W,
      height: CANVAS_H,
    });
  }, [frames, origDims]);

  /* ── Load landmark file ─────────────────────────────────────────── */
  const loadLandmarks = useCallback(async (file: FileEntry) => {
    setLandmarkFile(file.key);
    try {
      const res = await fetch(
        `/api/storage/landmarks?key=${encodeURIComponent(file.key)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setFrames(data.frames ?? []);
      if (data.dimensions) setOrigDims(data.dimensions);
    } catch {
      setFrames([]);
    }
  }, []);

  /* ── Load SVG set ───────────────────────────────────────────────── */
  const loadSvgs = useCallback(async (file: FileEntry) => {
    setSvgFile(file.key);
    try {
      const res = await fetch(
        `/api/storage/upload?key=${encodeURIComponent(file.key)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const raw: Record<string, string> = data.images ?? {};

      // Normalize keys: "head-front" → "head", "torso-back" → "torso-back"
      // Front images use plain part names; back images keep the "-back" suffix.
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(raw)) {
        const match = key.match(/^(.+)-(front|back)$/);
        if (match) {
          const partName = match[1];
          const side = match[2];
          if (side === 'front') {
            normalized[partName] = value;
          } else {
            normalized[`${partName}-back`] = value;
          }
        } else {
          normalized[key] = value;
        }
      }

      setSvgParts(normalized);
    } catch {
      setSvgParts({});
    }
  }, []);

  /* ── Save animation ─────────────────────────────────────────────── */
  const save = useCallback(async () => {
    if (frames.length === 0 || Object.keys(svgParts).length === 0) return;
    setSaveStatus('saving');
    try {
      const name = `anim_${Date.now()}`;
      const res = await fetch('/api/storage/animations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          landmarks: frames,
          svgs: svgParts,
          dimensions: origDims,
          shiftFactors: shifts,
          scaleFactors: scales,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  }, [frames, svgParts, origDims, shifts, scales]);

  // Reset save status — handled by setTimeout in save callback

  /* ── Auto-load most recent files on mount ───────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [lmRes, svgRes] = await Promise.all([
          fetch('/api/storage/list?bucket=landmarks'),
          fetch('/api/storage/list?bucket=svgs'),
        ]);
        const lmData = await lmRes.json();
        const svgData = await svgRes.json();

        if (cancelled) return;
        const lmFiles: FileEntry[] = lmData.files ?? [];
        const svgFiles: FileEntry[] = svgData.files ?? [];

        if (lmFiles.length > 0) loadLandmarks(lmFiles[0]);
        if (svgFiles.length > 0) loadSvgs(svgFiles[0]);
      } catch {
        // ignore — files will load when user selects manually
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Auto-play when both landmarks and SVG images are loaded ────── */
  const prevDataKey = useRef('');
  useEffect(() => {
    const dataKey = `${frames.length}:${Object.keys(svgImages).length}`;
    if (dataKey === prevDataKey.current) return;
    prevDataKey.current = dataKey;
    if (frames.length > 0 && Object.keys(svgImages).length > 0) {
      setPlaying(true);
    }
  }, [frames, svgImages]);

  /* ── UI ─────────────────────────────────────────────────────────── */
  const iconPanel = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 3.5h8M2 6h8M2 8.5h8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
  const iconFiles = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 2.5h3.5L7 4H10a1 1 0 011 1v4a1 1 0 01-1 1H2a1 1 0 01-1-1V3.5A1 1 0 012 2.5z"
        stroke="currentColor"
        strokeWidth="1.2"
      />
    </svg>
  );
  const iconShift = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 1.5v9M1.5 6h9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M4.5 3L6 1.5 7.5 3M4.5 9L6 10.5 7.5 9M3 4.5L1.5 6 3 7.5M9 4.5L10.5 6 9 7.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
  const iconScale = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1.5 4.5V1.5h3M1.5 7.5V10.5h3M7.5 1.5H10.5v3M10.5 7.5V10.5H7.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
  const iconPreview = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="2"
        width="10"
        height="7"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M4 10h4"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
  return (
    <main className="flex flex-col flex-1 overflow-hidden">
      {/* ── Action bar ── */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 shrink-0"
        style={{
          borderBottom: '1px solid var(--border-strong)',
          backgroundColor: 'var(--surface)',
        }}
      >
        <div className="ml-auto">
          <button
            onClick={save}
            disabled={saveStatus === 'saving' || frames.length === 0}
            className="btn-primary rounded py-1.5 px-4 text-xs uppercase tracking-widest font-bold disabled:opacity-50"
            title="Save animation"
          >
            {saveStatus === 'saving' && '…'}
            {saveStatus === 'saved' && '✓ Saved'}
            {saveStatus === 'error' && 'Error'}
            {saveStatus === 'idle' && '↑ Save'}
          </button>
        </div>
      </div>

      {/* ── Toolbar + canvas ── */}
      <div
        className={`flex flex-1 overflow-hidden ${toolbarMode === 'side' ? 'flex-row' : 'flex-col'}`}
      >
        <Toolbar onModeChange={setToolbarMode}>
          {/* Files */}
          <ToolbarDropdown id="files" label="Files" icon={iconFiles}>
            <SegmentedControl
              options={['animations', 'creations'] as const}
              value={fileView}
              onChange={setFileView}
              labels={{ animations: 'Animations', creations: 'Creations' }}
            />
            <div className="max-h-48 overflow-y-auto">
              {fileView === 'animations' ? (
                <FileList
                  bucket="landmarks"
                  selected={landmarkFile}
                  onSelect={loadLandmarks}
                  formatLabel={(name) => formatFileTimestamp(name)}
                  onDelete={(f) => {
                    if (landmarkFile === f.key) setLandmarkFile(null);
                  }}
                />
              ) : (
                <FileList
                  bucket="svgs"
                  selected={svgFile}
                  onSelect={loadSvgs}
                  formatLabel={(name) => formatFileTimestamp(name)}
                  onDelete={(f) => {
                    if (svgFile === f.key) setSvgFile(null);
                  }}
                />
              )}
            </div>
          </ToolbarDropdown>

          {/* Tools */}
          <ToolbarDropdown id="tools" label="Tools" icon={iconPanel}>
            <button
              onClick={() =>
                setToolsPanel((p) => (p === 'shift' ? null : 'shift'))
              }
              className={`btn-ghost w-full rounded py-1.5 text-xs uppercase tracking-widest text-left px-2 flex items-center gap-2 ${toolsPanel === 'shift' ? 'font-bold' : ''}`}
              style={
                toolsPanel === 'shift' ? { color: 'var(--accent)' } : undefined
              }
            >
              <span style={{ color: 'var(--accent)' }}>{iconShift}</span>
              Shift Anchors
            </button>
            <div
              className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
              style={{ maxHeight: toolsPanel === 'shift' ? 1000 : 0 }}
            >
              <div className="pt-1.5">
                <ShiftControls />
              </div>
            </div>

            <button
              onClick={() =>
                setToolsPanel((p) => (p === 'scale' ? null : 'scale'))
              }
              className={`btn-ghost w-full rounded py-1.5 text-xs uppercase tracking-widest text-left px-2 flex items-center gap-2 ${toolsPanel === 'scale' ? 'font-bold' : ''}`}
              style={
                toolsPanel === 'scale' ? { color: 'var(--accent)' } : undefined
              }
            >
              <span style={{ color: 'var(--accent)' }}>{iconScale}</span>
              Scale Parts
            </button>
            <div
              className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
              style={{ maxHeight: toolsPanel === 'scale' ? 1000 : 0 }}
            >
              <div className="pt-1.5">
                <ScaleControls />
              </div>
            </div>

            <button
              onClick={() => setShowAnchors((v) => !v)}
              className={`btn-ghost w-full rounded py-1.5 text-xs uppercase tracking-widest text-left px-2 ${showAnchors ? 'font-bold' : ''}`}
              style={showAnchors ? { color: 'var(--accent)' } : undefined}
            >
              {showAnchors ? '⊙ Hide Anchors' : '⊙ Show Anchors'}
            </button>
          </ToolbarDropdown>

          {/* Preview */}
          <ToolbarDropdown id="preview" label="Preview" icon={iconPreview}>
            <div className="flex flex-col gap-2 w-full">
              <label className="flex items-center justify-between gap-2 text-xs uppercase tracking-widest">
                <span>Background</span>
                <input
                  type="color"
                  value={previewBgColor}
                  onChange={(e) => setPreviewBgColor(e.target.value)}
                  className="h-5 w-8 cursor-pointer rounded border border-neutral-300 bg-transparent p-0 dark:border-neutral-600"
                  title="Canvas background colour"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs uppercase tracking-widest">
                <div className="flex items-center justify-between">
                  <span>Size</span>
                  <span className="font-mono text-[10px]">
                    {Math.round(previewScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="2"
                  step="0.05"
                  value={previewScale}
                  onChange={(e) => setPreviewScale(parseFloat(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
              </label>
            </div>
          </ToolbarDropdown>
        </Toolbar>

        {/* Canvas area */}
        <div className="flex flex-1 items-center justify-center p-4">
          <AnimationCanvas
            frames={scaledFrames}
            svgImages={svgImages}
            shifts={shifts}
            scales={scales}
            playing={playing}
            width={CANVAS_W}
            height={CANVAS_H}
            showAnchors={showAnchors}
            bgColor={previewBgColor}
            previewScale={previewScale}
          />
        </div>
      </div>
    </main>
  );
}
