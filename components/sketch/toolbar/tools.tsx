'use client';

import type { ShapeTool } from '@/components/sketch/canvas/sketch-canvas';
import { ToolbarGroup, ActionIcon } from '@/components/shared/toolbar';
import { DrillIcon } from '@/components/shared/icons/drill';
import { ZoomIcon } from '@/components/shared/icons/zoom';
import { PenIcon } from '@/components/sketch/icons/pen';
import { EraserIcon } from '@/components/sketch/icons/eraser';
import { BrushIcon } from '@/components/sketch/icons/brush';
import { LineIcon } from '@/components/sketch/icons/line';
import { RectIcon } from '@/components/sketch/icons/rect';
import { CircleIcon } from '@/components/sketch/icons/circle';
import { EllipseIcon } from '@/components/sketch/icons/ellipse';

export const DEFAULT_BRUSH = 6;
export const DEFAULT_COLOR_LIGHT = '#000000';
export const DEFAULT_COLOR_DARK = '#ffffff';

const SHAPE_ICONS: Record<ShapeTool, { icon: React.ReactNode; label: string }> =
  {
    pen: { icon: <PenIcon />, label: 'Pen' },
    line: { icon: <LineIcon />, label: 'Line' },
    rect: { icon: <RectIcon />, label: 'Rectangle' },
    circle: { icon: <CircleIcon />, label: 'Circle' },
    ellipse: { icon: <EllipseIcon />, label: 'Ellipse' },
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
                className="accent-accent flex-1"
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
        icon={<PenIcon />}
        label="Sketch"
        active={!isEraser}
        onClick={() => onIsEraserChange(false)}
      />
      <ActionIcon
        icon={<EraserIcon />}
        label="Erase"
        active={isEraser}
        danger
        onClick={() => onIsEraserChange(true)}
      />
      <ActionIcon
        icon={<BrushIcon />}
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
              className="accent-accent flex-1"
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
      icon={<RectIcon />}
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
