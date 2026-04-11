'use client';

import type { ShapeTool } from '@/components/sketch/canvas/sketch-canvas';
import { ToolbarGroup, ActionIcon } from '@/components/shared/toolbar';
import { DrillIcon } from '@/components/shared/icons/drill';
import { ZoomIcon } from '@/components/shared/icons/zoom';

export const DEFAULT_BRUSH = 6;
export const DEFAULT_COLOR_LIGHT = '#000000';
export const DEFAULT_COLOR_DARK = '#ffffff';

/* ── Inline SVG mini-icons ──────────────────────────────────────────── */

const PenMiniIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const EraserMiniIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.8 1.4c.8-.8 2-.8 2.8 0L21 4.8c.8.8.8 2 0 2.8L10 18" />
  </svg>
);

const BrushMiniIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="5" />
  </svg>
);

/* ── Shape mini-icons ───────────────────────────────────────────────── */

const PenShapeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
);

const LineShapeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <line x1="5" y1="19" x2="19" y2="5" />
  </svg>
);

const RectShapeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="1" />
  </svg>
);

const CircleShapeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const EllipseShapeIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <ellipse cx="12" cy="12" rx="10" ry="6" />
  </svg>
);

const SHAPE_ICONS: Record<ShapeTool, { icon: React.ReactNode; label: string }> =
  {
    pen: { icon: <PenShapeIcon />, label: 'Pen' },
    line: { icon: <LineShapeIcon />, label: 'Line' },
    rect: { icon: <RectShapeIcon />, label: 'Rectangle' },
    circle: { icon: <CircleShapeIcon />, label: 'Circle' },
    ellipse: { icon: <EllipseShapeIcon />, label: 'Ellipse' },
  };

/* ── Tools Section ──────────────────────────────────────────────────── */

interface ToolsSectionProps {
  tool: ShapeTool;
  onToolChange: (t: ShapeTool) => void;
  brushSize: number;
  onBrushSizeChange: (v: number) => void;
  isEraser: boolean;
  onIsEraserChange: (v: boolean) => void;
  expanded: boolean;
  onToggle: () => void;
  brushDropdownOpen: boolean;
  onBrushDropdownToggle: () => void;
  onBrushDropdownClose: () => void;
  zoom: number;
  onZoomChange: (v: number) => void;
  onZoomReset: () => void;
  zoomDropdownOpen: boolean;
  onZoomDropdownToggle: () => void;
  onZoomDropdownClose: () => void;
}

export function ToolsSection({
  zoom,
  onZoomChange,
  onZoomReset,
  brushSize,
  onBrushSizeChange,
  isEraser,
  onIsEraserChange,
  expanded,
  onToggle,
  brushDropdownOpen,
  onBrushDropdownToggle,
  onBrushDropdownClose,
  zoomDropdownOpen,
  onZoomDropdownToggle,
  onZoomDropdownClose,
}: ToolsSectionProps) {
  return (
    <ToolbarGroup
      icon={<DrillIcon />}
      label="Tools"
      expanded={expanded}
      onToggle={onToggle}
    >
      {/* Zoom */}
      <ActionIcon
        icon={<ZoomIcon />}
        label="Zoom"
        onClick={onZoomDropdownToggle}
        dropdownOpen={zoomDropdownOpen}
        onDropdownClose={onZoomDropdownClose}
        dropdownWidth={180}
        dropdownContent={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '4px 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => onZoomChange(Number(e.target.value))}
                className="flex-1 accent-accent"
                title="Canvas zoom"
              />
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--fg-muted)',
                  width: 32,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <button
              onClick={() => {
                onZoomReset();
                onZoomDropdownClose();
              }}
              style={{
                padding: '4px 8px',
                border: '1px solid var(--border)',
                background: 'none',
                color: 'var(--fg-muted)',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                borderRadius: 3,
                width: '100%',
                transition: 'background-color 100ms ease',
              }}
              aria-label="Reset Zoom"
            >
              Reset Zoom
            </button>
          </div>
        }
      />
      <ActionIcon
        icon={<PenMiniIcon />}
        label="Sketch"
        active={!isEraser}
        onClick={() => onIsEraserChange(false)}
      />
      <ActionIcon
        icon={<EraserMiniIcon />}
        label="Erase"
        active={isEraser}
        danger
        onClick={() => onIsEraserChange(true)}
      />
      <ActionIcon
        icon={<BrushMiniIcon />}
        label="Brush Size"
        onClick={onBrushDropdownToggle}
        dropdownOpen={brushDropdownOpen}
        onDropdownClose={onBrushDropdownClose}
        dropdownWidth={160}
        dropdownContent={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 0',
            }}
          >
            <input
              type="range"
              min={1}
              max={40}
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="flex-1 accent-accent"
              title="Brush size"
            />
            <div
              style={{
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: brushSize,
                  height: brushSize,
                  borderRadius: '50%',
                  backgroundColor: isEraser ? 'var(--danger)' : 'var(--accent)',
                  opacity: isEraser ? 0.5 : 0.85,
                  border: '1px solid var(--border-strong)',
                  flexShrink: 0,
                }}
              />
            </div>
          </div>
        }
      />
    </ToolbarGroup>
  );
}

/* ── Shapes Section ─────────────────────────────────────────────────── */

interface ShapesSectionProps {
  tool: ShapeTool;
  onToolChange: (t: ShapeTool) => void;
  isEraser: boolean;
  onIsEraserChange: (v: boolean) => void;
  expanded: boolean;
  onToggle: () => void;
}

export function ShapesSection({
  tool,
  onToolChange,
  isEraser,
  onIsEraserChange,
  expanded,
  onToggle,
}: ShapesSectionProps) {
  return (
    <ToolbarGroup
      icon={<RectShapeIcon />}
      label="Shapes"
      expanded={expanded}
      onToggle={onToggle}
    >
      {(Object.keys(SHAPE_ICONS) as ShapeTool[]).map((shape) => (
        <ActionIcon
          key={shape}
          icon={SHAPE_ICONS[shape].icon}
          label={SHAPE_ICONS[shape].label}
          active={!isEraser && tool === shape}
          onClick={() => {
            onToolChange(shape);
            onIsEraserChange(false);
          }}
        />
      ))}
    </ToolbarGroup>
  );
}
