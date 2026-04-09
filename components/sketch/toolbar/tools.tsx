'use client';

import type { ShapeTool } from '@/components/sketch/canvas/sketch-canvas';
import { ToolbarSection } from '@/components/shared/toolbar/toolbar-section';
import { SegmentedControl } from '@/components/shared/toolbar/segmented-control';
import { DrillIcon } from '@/components/shared/icons/drill';
import { Flask2Icon } from '@/components/sketch/icons/flask-2';

export const DEFAULT_BRUSH = 6;
export const DEFAULT_COLOR_LIGHT = '#000000';
export const DEFAULT_COLOR_DARK = '#ffffff';

const SHAPE_OPTIONS: { value: ShapeTool; label: string }[] = [
  { value: 'pen', label: '✏ Pen' },
  { value: 'line', label: '╱ Line' },
  { value: 'rect', label: '▭ Rectangle' },
  { value: 'circle', label: '○ Circle' },
  { value: 'ellipse', label: '⬭ Ellipse' },
];

interface ToolsSectionProps {
  color: string;
  onColorChange: (c: string) => void;
  onEraserOff: () => void;
  usedColors: string[];
  tool: ShapeTool;
  onToolChange: (t: ShapeTool) => void;
  brushSize: number;
  onBrushSizeChange: (v: number) => void;
  isEraser: boolean;
  onIsEraserChange: (v: boolean) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function ToolsSection({
  color,
  onColorChange,
  onEraserOff,
  usedColors,
  tool,
  onToolChange,
  brushSize,
  onBrushSizeChange,
  isEraser,
  onIsEraserChange,
  isOpen,
  onToggle,
  onClose,
}: ToolsSectionProps) {
  return (
    <ToolbarSection
      icon={<DrillIcon />}
      label="Tools"
      onClick={onToggle}
      dropdownOpen={isOpen}
      onDropdownClose={onClose}
      dropdownContent={
        <div className="flex flex-col gap-2 w-full">
          <SegmentedControl
            options={['sketch', 'erase'] as ('sketch' | 'erase')[]}
            value={isEraser ? 'erase' : 'sketch'}
            onChange={(v) => onIsEraserChange(v === 'erase')}
            labels={{ sketch: 'Sketch', erase: 'Erase' }}
            dangerValue="erase"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col items-center gap-0.5 w-fit">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  onColorChange(e.target.value);
                  onEraserOff();
                }}
                onMouseEnter={(e) => {
                  const input = e.currentTarget;
                  input.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  const input = e.currentTarget;
                  input.style.opacity = '0.7';
                }}
                className="transition-opacity duration-150 focus-visible:outline-none"
                style={{
                  width: 48,
                  height: 24,
                  cursor: 'pointer',
                  borderRadius: 8,
                  backgroundColor: 'transparent',
                  padding: 0,
                }}
                aria-label="Stroke color"
              />
              <span
                className="text-[10px] uppercase tracking-widest"
                style={{ color: 'var(--fg-muted)' }}
              >
                {color}
              </span>
            </div>
            {usedColors.length > 0 && (
              <>
                <span
                  className="text-[9px] uppercase tracking-widest"
                  style={{ color: 'var(--fg-muted)' }}
                >
                  Recent
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {usedColors.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        onColorChange(c);
                        onEraserOff();
                      }}
                      title={c}
                      className="rounded transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      style={{
                        width: 20,
                        height: 20,
                        padding: 0,
                        background: 'none',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--fg-muted)',
                      }}
                    >
                      <Flask2Icon size={18} secondaryColor={c} />
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
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
                className="shrink-0 flex items-center justify-center"
                style={{ width: 32, height: 32 }}
              >
                <div
                  style={{
                    width: Math.min(brushSize, 28),
                    height: Math.min(brushSize, 28),
                    borderRadius: '50%',
                    backgroundColor: isEraser
                      ? 'var(--danger)'
                      : 'var(--accent)',
                    opacity: isEraser ? 0.5 : 0.85,
                    border: '1px solid var(--border-strong)',
                    flexShrink: 0,
                  }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEraser && (
              <select
                value={tool}
                onChange={(e) => {
                  const v = e.target.value as ShapeTool;
                  onToolChange(v);
                  if (v !== 'pen') onIsEraserChange(false);
                }}
                className="flex-1 min-w-0 rounded px-2 py-1 text-[11px] uppercase tracking-wider font-semibold"
                style={{
                  backgroundColor: 'var(--bg)',
                  color: 'var(--fg)',
                  border: '1px solid var(--border)',
                }}
              >
                {SHAPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
            {isEraser && (
              <span
                className="flex-1 text-[10px] uppercase tracking-widest"
                style={{ color: 'var(--fg-muted)' }}
              >
                Eraser active
              </span>
            )}
          </div>
        </div>
      }
    />
  );
}
