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
import { scaleLandmarkFramesUniform } from '@/lib/utils/pose-utils';
import {
  filterAndInterpolateFrames,
  interpolateLowConfidenceLandmarks,
} from '@/lib/utils/frame-filter';
import { smoothLandmarkFrames } from '@/lib/utils/landmark-smoother';
import { TorsoDimensions } from '@/lib/utils/torso-dimensions';
import AnimationCanvas from '@/components/console/canvas/animation-canvas';
import { ConsoleHeader } from '@/components/console/toolbar/console-header';
import { ConsoleRail } from '@/components/console/toolbar/console-rail';
import { ViewportPlate } from '@/components/console/canvas/viewport-plate';
import { ConsoleInspectorPanel } from '@/components/console/inspector-panel';
import { ConsoleStatusStrip } from '@/components/console/status-strip';

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
  const [showAnchors, setShowAnchors] = useState(false);
  const [previewBgColor, setPreviewBgColor] = useState('#1a1a1a');
  const [previewScale, setPreviewScale] = useState(1);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

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
    return scaleLandmarkFramesUniform(smoothed, origDims, {
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
  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* Top operating header */}
      <ConsoleHeader
        landmarkFile={landmarkFile}
        svgFile={svgFile}
        playing={playing}
        onPlayPause={() => setPlaying((p) => !p)}
        saveStatus={saveStatus}
        saveDisabled={saveStatus === 'saving' || frames.length === 0}
        onSave={save}
      />

      {/* Body: rail + canvas stage + inspector */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left icon rail */}
        <ConsoleRail
          isMobile={false}
          landmarkFile={landmarkFile}
          onLandmarkSelect={loadLandmarks}
          onLandmarkDeselect={() => setLandmarkFile(null)}
          svgFile={svgFile}
          onSvgSelect={loadSvgs}
          onSvgDeselect={() => setSvgFile(null)}
          bgColor={previewBgColor}
          onBgColorChange={setPreviewBgColor}
          scale={previewScale}
          onScaleChange={setPreviewScale}
          showAnchors={showAnchors}
          onShowAnchorsChange={setShowAnchors}
        />

        {/* Canvas stage */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Viewport area — themed background */}
          <div
            className="flex flex-1 items-center justify-center overflow-hidden"
            style={{ backgroundColor: 'var(--bg)' }}
          >
            <ViewportPlate playing={playing}>
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
            </ViewportPlate>
          </div>

          {/* Status strip */}
          <ConsoleStatusStrip
            isMobile={false}
            landmarkFile={landmarkFile}
            svgFile={svgFile}
            frameCount={scaledFrames.length}
            playing={playing}
          />
        </div>

        {/* Right inspector panel */}
        <ConsoleInspectorPanel
          isMobile={false}
          collapsed={inspectorCollapsed}
          onToggleCollapsed={() => setInspectorCollapsed((v) => !v)}
        />
      </div>
    </main>
  );
}
