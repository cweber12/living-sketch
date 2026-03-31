'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
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
    'idle' | 'saving' | 'done' | 'error'
  >('idle');
  const [panel, setPanel] = useState<'files' | 'shift' | 'scale'>('files');

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
    setPlaying(false);
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
    setPlaying(false);
    try {
      const res = await fetch(
        `/api/storage/upload?key=${encodeURIComponent(file.key)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setSvgParts(data.svgs ?? data);
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
      setSaveStatus(res.ok ? 'done' : 'error');
    } catch {
      setSaveStatus('error');
    }
  }, [frames, svgParts, origDims, shifts, scales]);

  // Reset save status after feedback
  useEffect(() => {
    if (saveStatus === 'done' || saveStatus === 'error') {
      const t = setTimeout(() => setSaveStatus('idle'), 2000);
      return () => clearTimeout(t);
    }
  }, [saveStatus]);

  /* ── UI ─────────────────────────────────────────────────────────── */
  const canPlay = frames.length > 0 && Object.keys(svgImages).length > 0;

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

        <ToolbarSection label="Playback">
          <div className="flex flex-wrap gap-2">
            <button
              disabled={!canPlay}
              onClick={() => setPlaying((p) => !p)}
              className="rounded bg-blue-600 px-3 py-1 text-xs text-white disabled:opacity-40"
            >
              {playing ? 'Pause' : 'Play'}
            </button>
            <button
              disabled={frames.length === 0}
              onClick={save}
              className="rounded bg-green-600 px-3 py-1 text-xs text-white disabled:opacity-40"
            >
              {saveStatus === 'saving'
                ? 'Saving…'
                : saveStatus === 'done'
                  ? 'Saved!'
                  : saveStatus === 'error'
                    ? 'Error'
                    : 'Save Animation'}
            </button>
          </div>
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
        />
      </div>
    </main>
  );
}
