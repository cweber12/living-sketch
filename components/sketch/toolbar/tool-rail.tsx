'use client';

import { useRef } from 'react';
import { RailButton } from './rail-button';
import { Popover } from './popover';
import type { ShapeTool } from '@/components/sketch/canvas/sketch-canvas';
import { PenIcon } from '@/components/sketch/icons/pen';
import { LineIcon } from '@/components/sketch/icons/line';
import { RectIcon } from '@/components/sketch/icons/rect';
import { CircleIcon } from '@/components/sketch/icons/circle';
import { EllipseIcon } from '@/components/sketch/icons/ellipse';
import { EraserIcon } from '@/components/sketch/icons/eraser';
import { BrushIcon } from '@/components/sketch/icons/brush';
import { Flask2Icon } from '@/components/sketch/icons/flask-2';
import { ZoomIcon } from '@/components/shared/icons/zoom';

const SHAPES: {
  tool: ShapeTool;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}[] = [
  { tool: 'pen', icon: <PenIcon />, label: 'Pen', shortcut: 'P' },
  { tool: 'line', icon: <LineIcon />, label: 'Line', shortcut: 'L' },
  { tool: 'rect', icon: <RectIcon />, label: 'Rectangle', shortcut: 'R' },
  { tool: 'circle', icon: <CircleIcon />, label: 'Circle', shortcut: 'C' },
  { tool: 'ellipse', icon: <EllipseIcon />, label: 'Ellipse', shortcut: 'O' },
];

interface ToolRailProps {
  isMobile: boolean;
  tool: ShapeTool;
  onToolChange: (t: ShapeTool) => void;
  isEraser: boolean;
  onIsEraserChange: (v: boolean) => void;
  brushSize: number;
  onBrushSizeChange: (v: number) => void;
  color: string;
  onColorChange: (c: string) => void;
  usedColors: string[];
  zoom: number;
  onZoomChange: (v: number) => void;
  onZoomReset: () => void;
  brushOpen: boolean;
  onBrushToggle: () => void;
  onBrushClose: () => void;
  colorOpen: boolean;
  onColorToggle: () => void;
  onColorClose: () => void;
  zoomOpen: boolean;
  onZoomToggle: () => void;
  onZoomClose: () => void;
}

export function ToolRail({
  isMobile,
  tool,
  onToolChange,
  isEraser,
  onIsEraserChange,
  brushSize,
  onBrushSizeChange,
  color,
  onColorChange,
  usedColors,
  zoom,
  onZoomChange,
  onZoomReset,
  brushOpen,
  onBrushToggle,
  onBrushClose,
  colorOpen,
  onColorToggle,
  onColorClose,
  zoomOpen,
  onZoomToggle,
  onZoomClose,
}: ToolRailProps) {
  const brushRef = useRef<HTMLButtonElement>(null);
  const colorRef = useRef<HTMLButtonElement>(null);
  const zoomRef = useRef<HTMLButtonElement>(null);
  const popoverAnchor = isMobile ? 'top' : 'right';
  const buttonSize = isMobile ? 44 : 40;

  const containerStyle: React.CSSProperties = isMobile
    ? {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: '6px 8px',
        backgroundColor: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        overflowX: 'auto',
        flexShrink: 0,
        height: 60,
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '10px 6px',
        backgroundColor: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        width: 56,
        flexShrink: 0,
      };

  const dividerStyle: React.CSSProperties = isMobile
    ? {
        width: 1,
        height: 28,
        backgroundColor: 'var(--border)',
        margin: '0 4px',
        flexShrink: 0,
      }
    : {
        width: 28,
        height: 1,
        backgroundColor: 'var(--border)',
        margin: '4px 0',
        flexShrink: 0,
      };

  return (
    <div style={containerStyle} aria-label="Drawing tools">
      {SHAPES.map(({ tool: t, icon, label, shortcut }) => (
        <RailButton
          key={t}
          icon={icon}
          label={label}
          shortcut={shortcut}
          size={buttonSize}
          active={!isEraser && tool === t}
          onClick={() => {
            onToolChange(t);
            onIsEraserChange(false);
          }}
        />
      ))}
      <RailButton
        icon={<EraserIcon />}
        label="Eraser"
        shortcut="E"
        size={buttonSize}
        danger
        active={isEraser}
        onClick={() => onIsEraserChange(true)}
      />

      <div style={dividerStyle} aria-hidden="true" />

      <RailButton
        ref={brushRef}
        icon={<BrushIcon />}
        label="Brush size"
        shortcut="[ / ]"
        size={buttonSize}
        active={brushOpen}
        badge={brushSize}
        onClick={onBrushToggle}
      />
      <Popover
        anchorRef={brushRef}
        open={brushOpen}
        onClose={onBrushClose}
        anchor={popoverAnchor}
        width={200}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 10,
              fontFamily: 'var(--font-geist-mono), monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--fg-muted)',
            }}
          >
            <span>Brush Ø</span>
            <span
              style={{ color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}
            >
              {brushSize}px
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="range"
              min={1}
              max={40}
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="accent-accent flex-1"
            />
            <div
              style={{
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: Math.min(brushSize, 22),
                  height: Math.min(brushSize, 22),
                  borderRadius: '50%',
                  backgroundColor: isEraser ? 'var(--danger)' : 'var(--accent)',
                  opacity: isEraser ? 0.5 : 0.9,
                  border: '1px solid var(--border-strong)',
                }}
              />
            </div>
          </div>
        </div>
      </Popover>

      <RailButton
        ref={colorRef}
        icon={<Flask2Icon size={22} secondaryColor={color} />}
        label="Color"
        size={buttonSize}
        active={colorOpen}
        onClick={onColorToggle}
      />
      <Popover
        anchorRef={colorRef}
        open={colorOpen}
        onClose={onColorClose}
        anchor={popoverAnchor}
        width={220}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 2px',
            }}
          >
            <input
              type="color"
              value={color}
              onChange={(e) => {
                onColorChange(e.target.value);
                onIsEraserChange(false);
              }}
              style={{
                width: 40,
                height: 28,
                cursor: 'pointer',
                padding: 0,
                border: '1px solid var(--border)',
                borderRadius: 4,
                backgroundColor: 'transparent',
              }}
              aria-label="Stroke color"
            />
            <span
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-geist-mono), monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--fg)',
              }}
            >
              {color}
            </span>
          </div>
          {usedColors.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--font-geist-mono), monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--fg-muted)',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: 4,
                }}
              >
                Recent
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 4,
                }}
              >
                {usedColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      onColorChange(c);
                      onIsEraserChange(false);
                    }}
                    title={c}
                    aria-label={`Use color ${c}`}
                    style={{
                      width: '100%',
                      aspectRatio: '1 / 1',
                      border:
                        c === color
                          ? '2px solid var(--accent)'
                          : '1px solid var(--border)',
                      borderRadius: 4,
                      backgroundColor: c,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </Popover>

      <div style={dividerStyle} aria-hidden="true" />

      <RailButton
        ref={zoomRef}
        icon={<ZoomIcon />}
        label="Zoom"
        size={buttonSize}
        active={zoomOpen}
        badge={Math.round(zoom * 100)}
        onClick={onZoomToggle}
      />
      <Popover
        anchorRef={zoomRef}
        open={zoomOpen}
        onClose={onZoomClose}
        anchor={popoverAnchor}
        width={200}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 10,
              fontFamily: 'var(--font-geist-mono), monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--fg-muted)',
            }}
          >
            <span>Zoom</span>
            <span
              style={{ color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' }}
            >
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="accent-accent"
          />
          <button
            onClick={() => {
              onZoomReset();
              onZoomClose();
            }}
            className="btn-ghost"
            style={{
              padding: '5px 8px',
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Reset to 100%
          </button>
        </div>
      </Popover>
    </div>
  );
}
