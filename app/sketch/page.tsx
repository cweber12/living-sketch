'use client';

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type CSSProperties,
} from 'react';
import {
  SketchCanvas,
  type ShapeTool,
} from '@/components/sketch/canvas/sketch-canvas';
import { useSketchCanvasRig } from '@/hooks/use-sketch-canvas-rig';
import { BODY_PARTS } from '@/lib/constants/anchor-descriptors';
import type { BodyPartName, Side } from '@/hooks/use-sketch-canvas-rig';
import { BodyThumbnail } from '@/components/sketch/body-thumbnail';
import {
  SpecimenPlate,
  SpecimenBrackets,
} from '@/components/sketch/specimen-plate';
import { InspectorPanel } from '@/components/sketch/inspector-panel';
import { StatusStrip } from '@/components/sketch/status-strip';
import { ToolRail } from '@/components/sketch/toolbar/tool-rail';
import {
  OperatingHeader,
  type ArmPose,
  type ViewMode,
} from '@/components/sketch/toolbar/operating-header';
import {
  GRID_ARMS_UP,
  GRID_ARMS_DOWN,
  GRID_AREA,
  PART_LABEL,
  PART_CODE,
  PART_PROPORTIONS,
  PARTS_ORDER,
  DEFAULT_BRUSH,
  DEFAULT_COLOR_LIGHT,
  DEFAULT_COLOR_DARK,
} from '@/components/sketch/sketch-constants';
import { PrevIcon, NextIcon } from '@/components/shared/icons/navigate';

const SESSION_STATE_KEY = 'sketch-page-state';

const DEFAULT_CANVAS_SIZE = 110;
const MOBILE_BP = 768;

/* ─── Page ────────────────────────────────────────────────────────── */

/** Rotate a square data-URL image 90 degrees CW (+90) or CCW (-90) */
function rotateSquareDataURL(
  dataUrl: string,
  degrees: 90 | -90,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = img.naturalWidth;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.translate(size / 2, size / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -size / 2, -size / 2);
      resolve(canvas.toDataURL('image/webp', 0.9));
    };
    img.src = dataUrl;
  });
}

/** Parts that need rotation when arms are drawn in down-pose orientation */
const RIGHT_ARM_PARTS: BodyPartName[] = [
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
];
const LEFT_ARM_PARTS: BodyPartName[] = [
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
];

/**
 * Maps each front part to its mirrored back counterpart.
 * Left/right limbs swap (a rotated figure shows opposite limbs);
 * symmetric parts (head, torso) map to themselves.
 */
const MIRROR_PART_MAP: Record<BodyPartName, BodyPartName> = {
  head: 'head',
  torso: 'torso',
  rightUpperArm: 'leftUpperArm',
  rightLowerArm: 'leftLowerArm',
  rightHand: 'leftHand',
  leftUpperArm: 'rightUpperArm',
  leftLowerArm: 'rightLowerArm',
  leftHand: 'rightHand',
  rightUpperLeg: 'leftUpperLeg',
  rightLowerLeg: 'leftLowerLeg',
  rightFoot: 'leftFoot',
  leftUpperLeg: 'rightUpperLeg',
  leftLowerLeg: 'rightLowerLeg',
  leftFoot: 'rightFoot',
};

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

  const [armPose, setArmPose] = useState<ArmPose>('up'); // 'up' matches SSR; corrected post-hydration
  const [viewMode, setViewMode] = useState<ViewMode>('body');
  const [focusIdx, setFocusIdx] = useState(0);
  const [tool, setTool] = useState<ShapeTool>('pen');
  const [saveStatus, setSaveStatus] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');

  // Popover open-state (rail + header).
  const [brushOpen, setBrushOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [partsOpen, setPartsOpen] = useState(false);

  // Right inspector panel — collapsed flag (desktop only).
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

  const [zoom, setZoom] = useState(() =>
    // On mobile, start zoomed in so head+torso fill the initial viewport
    typeof window !== 'undefined' && window.innerWidth < MOBILE_BP ? 1.5 : 1,
  );
  const [usedColors, setUsedColors] = useState<string[]>([]);
  const backInitialised = useRef(false);
  const [showCopyFront, setShowCopyFront] = useState(false);

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BP,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BP - 1}px)`);
    const handle = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handle(mq);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  // Update stroke color when OS color scheme changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) =>
      setColor(e.matches ? DEFAULT_COLOR_DARK : DEFAULT_COLOR_LIGHT);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // On mount: detect browser reload and clear session, otherwise restore persisted state
  useEffect(() => {
    const navType = (
      performance.getEntriesByType('navigation')[0] as
        | PerformanceNavigationTiming
        | undefined
    )?.type;
    if (navType === 'reload') {
      try {
        sessionStorage.removeItem('sketch-canvases');
        sessionStorage.removeItem(SESSION_STATE_KEY);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      const raw = sessionStorage.getItem(SESSION_STATE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as Partial<{
        side: Side;
        viewMode: ViewMode;
        focusIdx: number;
        zoom: number;
        brushSize: number;
        color: string;
        isEraser: boolean;
        usedColors: string[];
        inspectorCollapsed: boolean;
      }>;
      if (s.side === 'front' || s.side === 'back') setSide(s.side);
      if (s.viewMode === 'body' || s.viewMode === 'single')
        setViewMode(s.viewMode);
      if (typeof s.focusIdx === 'number') setFocusIdx(s.focusIdx);
      if (typeof s.zoom === 'number' && s.zoom > 0) setZoom(s.zoom);
      if (typeof s.brushSize === 'number' && s.brushSize > 0)
        setBrushSize(s.brushSize);
      if (typeof s.color === 'string' && s.color) setColor(s.color);
      if (typeof s.isEraser === 'boolean') setIsEraser(s.isEraser);
      if (Array.isArray(s.usedColors)) setUsedColors(s.usedColors);
      if (typeof s.inspectorCollapsed === 'boolean')
        setInspectorCollapsed(s.inspectorCollapsed);
    } catch {
      /* ignore */
    }
  }, []);

  // Persist page state to sessionStorage whenever relevant values change.
  // armPose is intentionally excluded — it must always reflect the actual device
  // orientation on load, not a stale persisted value.
  useEffect(() => {
    try {
      sessionStorage.setItem(
        SESSION_STATE_KEY,
        JSON.stringify({
          side,
          viewMode,
          focusIdx,
          zoom,
          brushSize,
          color,
          isEraser,
          usedColors,
          inspectorCollapsed,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [
    side,
    viewMode,
    focusIdx,
    zoom,
    brushSize,
    color,
    isEraser,
    usedColors,
    inspectorCollapsed,
  ]);

  // After hydration: correct arm pose to match the actual device orientation.
  // armPose initialises as 'up' (SSR-safe); this effect fixes it on the client.
  // We intentionally don't canvas-rotate here — canvases are still loading from
  // session at this point. The existing orientation-change listener handles
  // subsequent rotations.

  useEffect(() => {
    const isLandscape = window.matchMedia('(orientation: landscape)').matches;
    const targetPose: ArmPose =
      window.innerWidth >= MOBILE_BP || isLandscape ? 'up' : 'down';
    setArmPose(targetPose);
  }, []); // run once after mount

  const effectiveArms: ArmPose = armPose; // orientation-managed via state
  const focusPart = PARTS_ORDER[focusIdx];
  const prevPart =
    PARTS_ORDER[(focusIdx - 1 + PARTS_ORDER.length) % PARTS_ORDER.length];
  const nextPart = PARTS_ORDER[(focusIdx + 1) % PARTS_ORDER.length];

  const {
    setCanvasRef,
    setZoomCanvasRef,
    pushUndoSnapshot,
    undo,
    clearAll,
    exportAll,
    mirrorCopyCanvas,
    rotatePartCanvas,
    saveToSession,
  } = useSketchCanvasRig();

  // Stable ref to current armPose so the orientation effect below can read it
  // without re-subscribing every time armPose changes.
  const armPoseRef = useRef<ArmPose>(armPose);
  armPoseRef.current = armPose;

  // Auto-rotate arm canvases when mobile orientation changes
  useEffect(() => {
    if (!isMobile) return;
    const mq = window.matchMedia('(orientation: landscape)');
    const update = () => {
      const targetPose: ArmPose = mq.matches ? 'up' : 'down';
      if (targetPose === armPoseRef.current) return;
      const sides: Side[] = ['front', 'back'];
      const leftDeg: 90 | -90 = targetPose === 'down' ? -90 : 90;
      const rightDeg: 90 | -90 = targetPose === 'down' ? 90 : -90;
      for (const s of sides) {
        for (const part of LEFT_ARM_PARTS) rotatePartCanvas(s, part, leftDeg);
        for (const part of RIGHT_ARM_PARTS) rotatePartCanvas(s, part, rightDeg);
      }
      setArmPose(targetPose);
      saveToSession();
    };
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [isMobile, rotatePartCanvas, saveToSession]);

  /**
   * Change arm pose: rotate arm/hand canvases to match new orientation.
   * Front: L-arms CCW (-90°), R-arms CW (+90°) going to arms-down.
   * Reverse for going back to arms-up.
   */
  const handleArmPoseChange = useCallback(
    (newPose: ArmPose) => {
      if (newPose === armPose) return;
      const sides: Side[] = ['front', 'back'];
      const leftDeg: 90 | -90 = newPose === 'down' ? -90 : 90;
      const rightDeg: 90 | -90 = newPose === 'down' ? 90 : -90;
      for (const s of sides) {
        for (const part of LEFT_ARM_PARTS) rotatePartCanvas(s, part, leftDeg);
        for (const part of RIGHT_ARM_PARTS) rotatePartCanvas(s, part, rightDeg);
      }
      setArmPose(newPose);
      saveToSession();
    },
    [armPose, rotatePartCanvas, saveToSession],
  );

  /**
   * First time switching to back: auto-mirror all front canvases.
   * Subsequent times: show a dismissible "Copy Front" button.
   */
  const handleSideChange = useCallback(
    (newSide: Side) => {
      if (newSide === 'back') {
        if (!backInitialised.current) {
          backInitialised.current = true;
          for (const part of BODY_PARTS) {
            const backPart = MIRROR_PART_MAP[part];
            mirrorCopyCanvas('front', part, 'back', backPart);
          }
        } else {
          setShowCopyFront(true);
        }
      }
      setSide(newSide);
      // brief animation flag reserved for future transitions
      setTimeout(() => {}, 350);
    },
    [mirrorCopyCanvas],
  );

  const handleCopyFront = useCallback(() => {
    for (const part of BODY_PARTS) {
      const backPart = MIRROR_PART_MAP[part];
      mirrorCopyCanvas('front', part, 'back', backPart);
    }
    setShowCopyFront(false);
  }, [mirrorCopyCanvas]);

  const handleStrokeStart = useCallback(
    (strokeSide: Side, part: BodyPartName) => {
      pushUndoSnapshot(strokeSide, part);
      if (!isEraser) {
        setUsedColors((prev) =>
          prev.includes(color) ? prev : [...prev, color].slice(-12),
        );
      }
    },
    [pushUndoSnapshot, color, isEraser],
  );

  const handleStrokeEnd = useCallback(() => {
    saveToSession();
  }, [saveToSession]);

  const handleUndo = useCallback(() => {
    undo();
    saveToSession();
  }, [undo, saveToSession]);

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      const images = exportAll();

      // When arms are drawn in down-pose orientation, rotate arm/hand canvases
      // back to T-pose (arms-up) orientation before saving, so the animation
      // pipeline receives consistently-oriented images.
      if (effectiveArms === 'down') {
        const sides: Side[] = ['front', 'back'];
        await Promise.all([
          ...sides.flatMap((s) =>
            RIGHT_ARM_PARTS.map(async (part) => {
              const url = images[s][part];
              if (url) images[s][part] = await rotateSquareDataURL(url, 90);
            }),
          ),
          ...sides.flatMap((s) =>
            LEFT_ARM_PARTS.map(async (part) => {
              const url = images[s][part];
              if (url) images[s][part] = await rotateSquareDataURL(url, -90);
            }),
          ),
        ]);
      }

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
      // Guard against mobile browsers that don't support WebP encoding:
      // the API would return HTTP 200 with an empty paths array.
      if (!json.paths?.length)
        throw new Error(
          'No images saved — canvas export may not be supported on this browser.',
        );
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  }, [exportAll, effectiveArms]);

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
  const u = DEFAULT_CANVAS_SIZE;
  const armsUp = effectiveArms === 'up';
  const gridTemplate = armsUp ? GRID_ARMS_UP : GRID_ARMS_DOWN;

  // mobileU: unit size (px) that fits the body grid in the viewport at zoom=1.
  // The zoom factor is then baked directly into the effectiveU so that we avoid
  // using CSS `zoom:` on the grid (which causes browser layout quirks with grid
  // track sizing and coordinate-mapping issues on webkit).
  // 160 = navbar(48) + operating-header(52) + tool-rail bottom strip(60)
  const mobileU =
    typeof window !== 'undefined'
      ? Math.max(
          20,
          Math.min(
            Math.floor((window.innerWidth - 20) / 4.3),
            Math.floor((window.innerHeight - 160) / 9.85),
          ),
        )
      : 80;
  // effectiveU incorporates the user's zoom so grid tracks are real px values.
  const effectiveU = (isMobile && viewMode === 'body' ? mobileU : u) * zoom;

  const armCol = effectiveU;
  const legCol = Math.round(effectiveU * 1.15);
  const handColUp = Math.round(effectiveU * 1.8); // slightly wider hand (was 1.75)
  const armColUp = Math.round(effectiveU * 1.4); // slightly wider arm (was 1.3)

  const gridCols = armsUp
    ? `${handColUp}px ${armColUp}px ${armColUp}px ${legCol}px ${legCol}px ${armColUp}px ${armColUp}px ${handColUp}px`
    : `${armCol}px ${legCol}px ${legCol}px ${armCol}px`;

  const gridRows = armsUp
    ? [
        effectiveU * 2.3, // head
        effectiveU * 1.1, // arm row (T-pose)
        effectiveU * 1.5, // torso lower
        effectiveU * 1.6, // upper legs (was 1.75)
        effectiveU * 1.4, // lower legs (was 1.6)
        effectiveU * 1.4, // feet (was 1.6)
      ]
        .map((v) => `${Math.round(v)}px`)
        .join(' ')
    : [
        effectiveU * 2.3, // head
        effectiveU * 1.5, // upper arm / torso top (was 1.3)
        effectiveU * 1.5, // lower arm / torso bottom (was 1.3)
        effectiveU * 1.6, // hand / upper legs (was 1.75)
        effectiveU * 1.4, // lower legs (was 1.6)
        effectiveU * 1.4, // feet (was 1.6)
      ]
        .map((v) => `${Math.round(v)}px`)
        .join(' ');

  /* ── Render helpers ── */
  const activeTool = isEraser ? 'pen' : tool;

  function renderCanvas(s: Side, part: BodyPartName) {
    const isFocused = part === focusPart;
    return (
      <div
        key={`${s}-${part}`}
        className={`${
          isFocused ? 'border-accent' : 'border-edge'
        } bg-surface relative h-full w-full overflow-hidden rounded-md border`}
        style={{
          gridArea: GRID_AREA[part],
          visibility: s === side ? 'visible' : 'hidden',
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
          onStrokeEnd={handleStrokeEnd}
        />
        {/* L / R shoulder → torso-edge indicators */}
        {part === 'torso' && (
          <>
            <span className="text-2xs text-muted pointer-events-none absolute top-1/3 left-1 font-bold tracking-widest opacity-45 select-none">
              {s === 'front' ? 'R' : 'L'}
            </span>
            <span className="text-2xs text-muted pointer-events-none absolute top-1/3 right-1 font-bold tracking-widest opacity-45 select-none">
              {s === 'front' ? 'L' : 'R'}
            </span>
          </>
        )}
        {/* Specimen-plate code label (bottom-center, pointer-events: none) */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 1,
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: 8,
            letterSpacing: '0.1em',
            color: isFocused ? 'var(--accent)' : 'var(--fg-muted)',
            opacity: isFocused ? 0.95 : 0.45,
            pointerEvents: 'none',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            maxWidth: 'calc(100% - 4px)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textShadow: '0 0 4px var(--surface), 0 0 4px var(--surface)',
          }}
        >
          {PART_CODE[part]}
        </span>
      </div>
    );
  }

  const focusProps = PART_PROPORTIONS[focusPart];

  // In armsDown mode, arm/hand parts are rotated 90° — swap aspect ratio
  const ARM_PART_SET = new Set<BodyPartName>([
    'leftUpperArm',
    'leftLowerArm',
    'leftHand',
    'rightUpperArm',
    'rightLowerArm',
    'rightHand',
  ]);
  // When arms are in T-pose (up), arm canvases are landscape; flip the aspect ratio.
  // When arms are down (mobile), canvases are portrait — use PART_PROPORTIONS directly.
  const effectiveFocusProps =
    ARM_PART_SET.has(focusPart) && effectiveArms === 'up'
      ? { w: focusProps.h, h: focusProps.w }
      : focusProps;

  /* ── Render ── */

  /* Shared style for the prev/next/exit pills in single-part mode */
  const navPillStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 32,
    padding: '0 12px',
    borderRadius: 16,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'var(--fg-muted)',
    fontFamily: 'var(--font-geist-mono), monospace',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition:
      'color 120ms var(--ease-ui), background-color 120ms var(--ease-ui), border-color 120ms var(--ease-ui)',
  };
  const mobileNavPillStyle: CSSProperties = {
    ...navPillStyle,
    height: 44,
    flex: 1,
    justifyContent: 'center',
    gap: 8,
    fontSize: 11,
  };

  const railProps = {
    isMobile,
    tool,
    onToolChange: setTool,
    isEraser,
    onIsEraserChange: setIsEraser,
    brushSize,
    onBrushSizeChange: setBrushSize,
    color,
    onColorChange: setColor,
    usedColors,
    zoom,
    onZoomChange: setZoom,
    onZoomReset: () => setZoom(1),
    brushOpen,
    onBrushToggle: () => setBrushOpen((v) => !v),
    onBrushClose: () => setBrushOpen(false),
    colorOpen,
    onColorToggle: () => setColorOpen((v) => !v),
    onColorClose: () => setColorOpen(false),
    zoomOpen,
    onZoomToggle: () => setZoomOpen((v) => !v),
    onZoomClose: () => setZoomOpen(false),
  };

  return (
    <main className="flex w-full flex-1 flex-col overflow-hidden">
      <OperatingHeader
        isMobile={isMobile}
        side={side}
        onSideChange={handleSideChange}
        armPose={armPose}
        onArmPoseChange={handleArmPoseChange}
        viewMode={viewMode}
        onViewModeChange={(v) => {
          setViewMode(v);
          setPartsOpen(v === 'single');
        }}
        focusIdx={focusIdx}
        onFocusIdxChange={setFocusIdx}
        saveStatus={saveStatus}
        saveDisabled={saveStatus === 'saving'}
        onSave={handleSave}
        onUndo={handleUndo}
        onClearAll={clearAll}
        showCopyFront={showCopyFront}
        onCopyFront={handleCopyFront}
        onDismissCopyFront={() => setShowCopyFront(false)}
        partsDropdownOpen={partsOpen}
        onPartsDropdownToggle={() => setPartsOpen((v) => !v)}
        onPartsDropdownClose={() => setPartsOpen(false)}
      />

      <div
        className={`flex flex-1 overflow-hidden ${
          isMobile ? 'flex-col' : 'flex-row'
        }`}
      >
        {!isMobile && <ToolRail {...railProps} />}

        {/* CANVAS STAGE */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* BODY MODE */}
          <div
            className={
              viewMode === 'single' ? 'hidden' : 'flex min-h-0 flex-1 flex-col'
            }
          >
            <div className="flex-1 overflow-auto">
              {/* min-w-max + flex justify-center: centers grid when it fits; allows scroll in both axes when zoomed */}
              <div className="flex min-w-max justify-center px-2 py-2 sm:px-4">
                <SpecimenPlate side={side} isMobile={isMobile}>
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
                </SpecimenPlate>
              </div>
            </div>
          </div>

          {/* SINGLE-PART MODE */}
          {viewMode === 'single' && (
            <div className="flex min-h-0 flex-1 flex-col py-2">
              {/* Top bar: Exit | Plate label | spacer */}
              <div className="flex shrink-0 items-center justify-between gap-3 px-3 pb-2 sm:px-6">
                <button
                  onClick={() => setViewMode('body')}
                  style={navPillStyle}
                  aria-label="Exit detail mode"
                  className="toolbar-action-btn"
                >
                  <PrevIcon />
                  Whole
                </button>
                <p
                  className="shrink-0 text-center"
                  style={{
                    fontFamily: 'var(--font-geist-mono), monospace',
                    fontSize: 10,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: 'var(--fg-muted)',
                  }}
                >
                  Plate ·{' '}
                  <span style={{ color: 'var(--fg)' }}>
                    {side === 'front' ? 'Anterior' : 'Posterior'}
                  </span>{' '}
                  ·{' '}
                  <span style={{ color: 'var(--accent)' }}>
                    {PART_LABEL[focusPart]}
                  </span>
                </p>
                {/* Spacer balances the Exit pill so the label stays centered */}
                <span aria-hidden="true" style={{ width: 92, flexShrink: 0 }} />
              </div>

              {/* Canvas row */}
              <div className="flex min-h-0 flex-1 items-center justify-center gap-3 overflow-auto px-3 md:px-4">
                <button
                  onClick={goPrev}
                  style={navPillStyle}
                  className="toolbar-action-btn hidden shrink-0 md:inline-flex"
                  aria-label={`Previous part: ${PART_LABEL[prevPart]}`}
                >
                  <PrevIcon />
                  {PART_LABEL[prevPart]}
                </button>

                <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-2">
                  <div
                    className="bg-surface relative overflow-hidden"
                    style={{
                      border: '1px solid var(--border)',
                      aspectRatio: `${effectiveFocusProps.w} / ${effectiveFocusProps.h}`,
                      width: `min(${Math.round(zoom * 96)}vw, ${Math.round(zoom * 380)}px)`,
                    }}
                  >
                    {(['front', 'back'] as Side[]).map((s) => (
                      <div
                        key={`single-${s}-${focusPart}`}
                        className="h-full w-full"
                        style={{ display: s === side ? 'block' : 'none' }}
                      >
                        <SketchCanvas
                          side={s}
                          part={focusPart}
                          brushSize={brushSize}
                          color={color}
                          isEraser={isEraser}
                          tool={activeTool}
                          onMount={setZoomCanvasRef}
                          onStrokeStart={handleStrokeStart}
                          onStrokeEnd={handleStrokeEnd}
                        />
                      </div>
                    ))}
                    <SpecimenBrackets />
                  </div>
                  <p
                    className="shrink-0"
                    style={{
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontSize: 9,
                      letterSpacing: '0.14em',
                      color: 'var(--fg-muted)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {String(focusIdx + 1).padStart(2, '0')} /{' '}
                    {String(PARTS_ORDER.length).padStart(2, '0')}
                  </p>
                </div>

                <button
                  onClick={goNext}
                  style={navPillStyle}
                  className="toolbar-action-btn hidden shrink-0 md:inline-flex"
                  aria-label={`Next part: ${PART_LABEL[nextPart]}`}
                >
                  {PART_LABEL[nextPart]}
                  <NextIcon />
                </button>
              </div>

              {/* Mobile prev/next pills */}
              <div className="flex shrink-0 items-stretch gap-3 px-4 pt-2 md:hidden">
                <button
                  onClick={goPrev}
                  style={mobileNavPillStyle}
                  aria-label={`Previous part: ${PART_LABEL[prevPart]}`}
                >
                  <PrevIcon />
                  {PART_LABEL[prevPart]}
                </button>
                <button
                  onClick={goNext}
                  style={mobileNavPillStyle}
                  aria-label={`Next part: ${PART_LABEL[nextPart]}`}
                >
                  {PART_LABEL[nextPart]}
                  <NextIcon />
                </button>
              </div>

              {/* Inline body map — tap any part to navigate */}
              <div className="flex shrink-0 items-center justify-center pt-2">
                <BodyThumbnail focusPart={focusPart} onSelect={selectPart} />
              </div>
            </div>
          )}
        </div>

        {!isMobile && (
          <InspectorPanel
            isMobile={isMobile}
            collapsed={inspectorCollapsed}
            onToggleCollapsed={() => setInspectorCollapsed((v) => !v)}
            color={color}
            onColorChange={setColor}
            onEraserOff={() => setIsEraser(false)}
            usedColors={usedColors}
            brushSize={brushSize}
            tool={tool}
            isEraser={isEraser}
            side={side}
            focusPart={focusPart}
          />
        )}

        {isMobile && <ToolRail {...railProps} />}
      </div>

      <StatusStrip
        isMobile={isMobile}
        tool={tool}
        isEraser={isEraser}
        brushSize={brushSize}
        color={color}
      />
    </main>
  );
}
