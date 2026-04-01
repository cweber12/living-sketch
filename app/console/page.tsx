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
import { TorsoDimensions } from '@/lib/utils/torso-dimensions';
import AnimationCanvas from '@/components/canvas/animation-canvas';
import ShiftControls from '@/components/controls/shift-controls';
import ScaleControls from '@/components/controls/scale-controls';
import FileList from '@/components/controls/file-list';
import {
  Toolbar,
  ToolbarSection,
  SegmentedControl,
} from '@/components/ui/toolbar';

const CANVAS_W = 640;
const CANVAS_H = 480;

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
  const [panel, setPanel] = useState<'files' | 'shift' | 'scale'>('files');
  const [armsDown, setArmsDown] = useState(false);
  const [showAnchors, setShowAnchors] = useState(false);

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

  // Scale landmarks to canvas dimensions (memoised — only recomputes when frames/dims change)
  const scaledFrames = useMemo(
    () =>
      scaleLandmarkFrames(frames, origDims, {
        width: CANVAS_W,
        height: CANVAS_H,
      }),
    [frames, origDims],
  );

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
  return (
    <main className="flex flex-1 flex-col lg:flex-row">
      {/* Toolbar / sidebar */}
      <Toolbar>
        <ToolbarSection label="Panel">
          <SegmentedControl
            value={panel}
            options={['files', 'shift', 'scale'] as const}
            onChange={(v) => setPanel(v)}
            labels={{ files: 'Files', shift: 'Shift', scale: 'Scale' }}
          />
        </ToolbarSection>

        {panel === 'files' && (
          <>
            <ToolbarSection label="Landmarks">
              <FileList
                bucket="landmarks"
                selected={landmarkFile}
                onSelect={loadLandmarks}
              />
            </ToolbarSection>
            <ToolbarSection label="SVG Characters">
              <FileList bucket="svgs" selected={svgFile} onSelect={loadSvgs} />
            </ToolbarSection>
          </>
        )}

        {panel === 'shift' && (
          <ToolbarSection label="Shift Anchors">
            <ShiftControls />
          </ToolbarSection>
        )}

        {panel === 'scale' && (
          <ToolbarSection label="Scale Parts">
            <ScaleControls />
          </ToolbarSection>
        )}

        <ToolbarSection label="Animation">
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

        <ToolbarSection label="Save">
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
        </ToolbarSection>
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
