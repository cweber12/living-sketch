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
import { filterAndInterpolateFrames } from '@/lib/utils/frame-filter';
import { smoothLandmarkFrames } from '@/lib/utils/landmark-smoother';
import { TorsoDimensions } from '@/lib/utils/torso-dimensions';
import AnimationCanvas from '@/components/canvas/animation-canvas';
import ShiftControls from '@/components/controls/shift-controls';
import ScaleControls from '@/components/controls/scale-controls';
import FileList from '@/components/controls/file-list';
import {
  Toolbar,
  ToolbarSection,
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
  const [armsDown, setArmsDown] = useState(false);
  const [showAnchors, setShowAnchors] = useState(false);
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>('side');

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

  // Pipeline: filter bad frames → smooth → scale to canvas dimensions
  const scaledFrames = useMemo(() => {
    const filtered = filterAndInterpolateFrames(frames);
    const smoothed = smoothLandmarkFrames(filtered);
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
  const iconAnimations = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path d="M3 2.5L10 6l-7 3.5V2.5z" fill="currentColor" />
    </svg>
  );
  const iconCreations = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 10L7.5 4.5M7.5 4.5L9.5 2l1 1L8 5.5M5 3l.5-.5M9 7l-.5.5M3.5 2.5L3 3M9.5 8.5L9 9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
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
  const iconAnimation = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1.5"
        y="2.5"
        width="9"
        height="7"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path
        d="M1.5 4.5h9M1.5 7.5h9M4 2.5v2M8 2.5v2M4 7.5v2M8 7.5v2"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
  const iconSave = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 9.5h7M6 7.5V2.5M4 4.5L6 2.5 8 4.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <main
      className={`flex flex-1 ${toolbarMode === 'side' ? 'flex-row' : 'flex-col'}`}
    >
      {/* Toolbar / sidebar */}
      <Toolbar onModeChange={setToolbarMode}>
        {/* Animations — always visible dropdown */}
        <ToolbarSection label="Animations" icon={iconAnimations}>
          <FileList
            bucket="landmarks"
            selected={landmarkFile}
            onSelect={loadLandmarks}
            formatLabel={(name) => formatFileTimestamp(name)}
            onDelete={(f) => {
              if (landmarkFile === f.key) setLandmarkFile(null);
            }}
          />
        </ToolbarSection>

        {/* Creations — always visible dropdown */}
        <ToolbarSection label="Creations" icon={iconCreations}>
          <FileList
            bucket="svgs"
            selected={svgFile}
            onSelect={loadSvgs}
            formatLabel={(name) => formatFileTimestamp(name)}
            onDelete={(f) => {
              if (svgFile === f.key) setSvgFile(null);
            }}
          />
        </ToolbarSection>

        {/* Tools — contains Shift and Scale sub-panels */}
        <ToolbarSection label="Tools" icon={iconPanel}>
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
        </ToolbarSection>

        {/* Animation playback settings */}
        <ToolbarSection label="Animation" icon={iconAnimation}>
          <SegmentedControl
            value={armsDown ? 'down' : 'up'}
            options={['up', 'down'] as const}
            onChange={(v) => setArmsDown(v === 'down')}
            labels={{ up: 'Arms Up', down: 'Arms Down' }}
          />
          <button
            onClick={() => setShowAnchors((v) => !v)}
            className={`btn-ghost w-full rounded py-1.5 text-xs uppercase tracking-widest text-left px-2 ${showAnchors ? 'font-bold' : ''}`}
            style={showAnchors ? { color: 'var(--accent)' } : undefined}
          >
            {showAnchors ? '⊙ Hide Anchors' : '⊙ Show Anchors'}
          </button>
        </ToolbarSection>

        {/* Save — direct toolbar item, not inside a dropdown */}
        <div className="flex flex-col gap-1.5 px-0.5">
          <div
            className="flex items-center gap-1.5"
            style={{ color: 'var(--fg-muted)' }}
          >
            <span style={{ color: 'var(--accent)' }}>{iconSave}</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
              Save
            </span>
          </div>
          <button
            onClick={save}
            disabled={saveStatus === 'saving' || frames.length === 0}
            className="btn-primary w-full rounded py-2 text-xs uppercase tracking-widest font-bold disabled:opacity-50"
            title="Save animation"
          >
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && 'Saved ✓'}
            {saveStatus === 'error' && 'Error'}
            {saveStatus === 'idle' && 'Save'}
          </button>
        </div>
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
          armsDown={armsDown}
          showAnchors={showAnchors}
        />
      </div>
    </main>
  );
}
