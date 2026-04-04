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
  const [fileView, setFileView] = useState<'activity' | 'creations'>(
    'activity',
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
          {/* Archives */}
          <ToolbarDropdown id="files" label="Archives" icon={iconFiles}>
            <SegmentedControl
              options={['activity', 'creations'] as const}
              value={fileView}
              onChange={setFileView}
              labels={{
                activity: (
                  <span className="flex items-center justify-center gap-1">
                    <svg
                      fill="none"
                      width="15px"
                      height="15px"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                        fill="currentColor"
                        d="M11.7086 1.53214C10.9786 1.05676 10.078 0.917375 9.27255 1.04467C8.46803 1.17183 7.62325 1.5904 7.12591 2.39445C6.9332 2.70601 6.81024 3.04646 6.7559 3.40767C5.97312 3.35525 5.18086 3.59264 4.58547 4.08919C3.98255 4.59201 3.59741 5.34432 3.59741 6.25684C3.59741 6.55614 3.63851 6.86315 3.72008 7.17654C3.42298 7.23942 3.13697 7.34918 2.86932 7.50027C1.98542 7.99927 1.36438 8.90663 1.11913 9.88841C0.869371 10.8882 0.989124 12.0467 1.70052 13.0391C2.0609 13.5419 2.54903 13.9691 3.1623 14.305C3.01053 14.5081 2.88229 14.7271 2.77811 14.9565C2.35249 15.8935 2.32044 17.0038 2.64559 17.98C2.97535 18.9701 3.69756 19.8871 4.83624 20.3254C5.57833 20.6111 6.42615 20.6665 7.35551 20.4749C7.39798 20.9494 7.52745 21.3806 7.74983 21.7577C8.22598 22.5651 9.0236 22.9458 9.80541 22.9947C10.5523 23.0414 11.3758 22.778 12 22.2458C12.6242 22.778 13.4477 23.0414 14.1946 22.9947C14.9764 22.9458 15.774 22.5651 16.2502 21.7577C16.4725 21.3806 16.602 20.9494 16.6445 20.4749C17.5738 20.6665 18.4217 20.6111 19.1638 20.3254C20.3024 19.8871 21.0246 18.9701 21.3544 17.98C21.6796 17.0038 21.6475 15.8935 21.2219 14.9565C21.1177 14.7271 20.9895 14.5081 20.8377 14.305C21.451 13.9691 21.9391 13.5419 22.2995 13.0391C23.0109 12.0467 23.1306 10.8882 22.8809 9.88841C22.6356 8.90663 22.0146 7.99927 21.1307 7.50027C20.863 7.34918 20.577 7.23942 20.2799 7.17654C20.3615 6.86315 20.4026 6.55614 20.4026 6.25684C20.4026 5.34432 20.0175 4.59201 19.4145 4.08919C18.8191 3.59264 18.0269 3.35525 17.2441 3.40767C17.1898 3.04646 17.0668 2.70601 16.8741 2.39445C16.3767 1.5904 15.532 1.17183 14.7274 1.04467C13.922 0.917375 13.0214 1.05676 12.2914 1.53214C11.9861 1.73097 12.0139 1.73097 11.7086 1.53214ZM13.0033 20.0518L13.0033 17.5288C13.0045 17.0494 13.1133 16.3457 13.3939 15.7998C13.6573 15.2872 13.9946 15.0268 14.5082 15.0268C15.0623 15.0268 15.5115 14.5773 15.5115 14.0227C15.5115 13.4682 15.0623 13.0186 14.5082 13.0186C13.9202 13.0186 13.4216 13.16 13.0033 13.3894V12.5084C13.0045 12.029 13.1133 11.3254 13.3939 10.7794C13.6573 10.2668 13.9946 10.0064 14.5082 10.0064C15.0623 10.0064 15.5115 9.55688 15.5115 9.00234C15.5115 8.4478 15.0623 7.99826 14.5082 7.99826C13.9202 7.99826 13.4216 8.13957 13.0033 8.36902L13.0033 3.97532C13.005 3.57853 13.1671 3.35779 13.3859 3.21528C13.6436 3.04746 14.0284 2.96723 14.4144 3.02824C14.8013 3.08939 15.0539 3.26704 15.1679 3.45142C15.2603 3.60078 15.3726 3.9329 15.091 4.59054C14.9015 5.03294 15.0524 5.54766 15.4507 5.8175C15.849 6.08734 16.3825 6.03639 16.7226 5.69604C17.0903 5.32811 17.7563 5.32032 18.1299 5.63189C18.2795 5.75662 18.396 5.94564 18.396 6.25684C18.396 6.59422 18.2548 7.14633 17.705 7.91672C17.4235 8.31116 17.4637 8.85055 17.8006 9.19878C18.1375 9.54701 18.6749 9.60465 19.0779 9.33577C19.5101 9.04741 19.8566 9.08664 20.1448 9.24934C20.4837 9.44063 20.8032 9.85112 20.9342 10.3755C21.0607 10.8818 20.9923 11.4176 20.669 11.8686C20.3466 12.3184 19.6765 12.8121 18.3565 13.0323C17.8683 13.1137 17.5124 13.5392 17.5182 14.0344C17.5239 14.5296 17.8896 14.9467 18.3795 15.0167C18.8812 15.0884 19.207 15.3732 19.3952 15.7874C19.5966 16.231 19.6273 16.8151 19.4508 17.345C19.2789 17.861 18.9351 18.2619 18.4434 18.4511C17.9498 18.6411 17.1399 18.6809 15.9267 18.129C15.5761 17.9695 15.1653 18.025 14.8694 18.2716C14.5735 18.5183 14.4448 18.9127 14.5382 19.2866C14.6621 19.7827 14.8668 20.9406 14.0694 20.9905C13.5184 21.0249 13.0062 20.6055 13.0033 20.0518ZM10.9967 3.97532C10.995 3.57853 10.8329 3.35779 10.6141 3.21528C10.3564 3.04746 9.97157 2.96723 9.58558 3.02824C9.19869 3.08939 8.94611 3.26704 8.83207 3.45142C8.73968 3.60078 8.62739 3.9329 8.90901 4.59054C9.09846 5.03294 8.94757 5.54766 8.54931 5.8175C8.15105 6.08734 7.61747 6.03639 7.27739 5.69604C6.90975 5.32811 6.24365 5.32032 5.87006 5.63189C5.72051 5.75662 5.604 5.94564 5.604 6.25684C5.604 6.59422 5.74515 7.14633 6.29501 7.91672C6.57653 8.31116 6.53629 8.85055 6.19937 9.19878C5.86246 9.54701 5.32505 9.60465 4.92206 9.33577C4.48987 9.04741 4.1434 9.08664 3.8552 9.24934C3.51634 9.44063 3.19679 9.85112 3.06581 10.3755C2.93933 10.8818 3.0077 11.4176 3.33095 11.8686C3.65342 12.3184 4.32349 12.8121 5.64353 13.0323C6.13166 13.1137 6.48757 13.5392 6.48182 14.0344C6.47607 14.5296 6.11037 14.9467 5.62048 15.0167C5.1188 15.0884 4.793 15.3732 4.60484 15.7874C4.40339 16.231 4.37273 16.8151 4.54922 17.345C4.7211 17.861 5.06489 18.2619 5.55656 18.4511C6.05021 18.6411 6.86015 18.6809 8.0733 18.129C8.42388 17.9695 8.83474 18.025 9.13063 18.2716C9.42652 18.5183 9.5552 18.9127 9.4618 19.2866C9.33788 19.7827 9.13324 20.9406 9.93058 20.9905C10.4816 21.0249 10.9938 20.6055 10.9967 20.0518L10.9967 20.0472V17.5292C10.9955 17.0498 10.8868 16.3459 10.6061 15.7998C10.3427 15.2872 10.0054 15.0268 9.49176 15.0268C8.93765 15.0268 8.48846 14.5773 8.48846 14.0227C8.48846 13.4682 8.93765 13.0186 9.49176 13.0186C10.0798 13.0186 10.5784 13.16 10.9967 13.3894V12.5088C10.9955 12.0294 10.8868 11.3255 10.6061 10.7794C10.3427 10.2668 10.0054 10.0064 9.49176 10.0064C8.93765 10.0064 8.48846 9.55688 8.48846 9.00234C8.48846 8.4478 8.93765 7.99826 9.49176 7.99826C10.0798 7.99826 10.5784 8.13957 10.9967 8.36902L10.9967 3.97532Z"
                      />
                    </svg>
                    Extractions
                  </span>
                ),
                creations: (
                  <span className="flex items-center justify-center gap-1">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="7"
                        cy="2.8"
                        r="1.8"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                      <path
                        d="M4.5 5.5 L9.5 5.5 L9 9 L7.5 9 L7.5 13 L6.5 13 L6.5 9 L5 9 Z"
                        stroke="currentColor"
                        strokeWidth="1.1"
                        fill="none"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4.5 6 L2.5 8 M9.5 6 L11.5 8"
                        stroke="currentColor"
                        strokeWidth="1.1"
                        strokeLinecap="round"
                      />
                    </svg>
                    Creations
                  </span>
                ),
              }}
            />
            <div className="overflow-y-auto">
              {fileView === 'activity' ? (
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
            <div className="flex flex-col gap-0.5 w-full">
              <button
                onClick={() =>
                  setToolsPanel((p) => (p === 'shift' ? null : 'shift'))
                }
                className={`btn-ghost w-full rounded py-1.5 text-xs uppercase tracking-widest text-left px-2 flex items-center gap-2 ${toolsPanel === 'shift' ? 'font-bold' : ''}`}
                style={
                  toolsPanel === 'shift'
                    ? { color: 'var(--accent)' }
                    : undefined
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
                  toolsPanel === 'scale'
                    ? { color: 'var(--accent)' }
                    : undefined
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
            </div>
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
