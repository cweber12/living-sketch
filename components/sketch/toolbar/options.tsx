'use client';

import { ToolbarSection } from '@/components/shared/toolbar/toolbar-section';
import { OptionsIcon } from '@/components/shared/icons/options';

export const DEFAULT_BRUSH = 6;

interface OptionsSectionProps {
  brushSize: number;
  onBrushSizeChange: (v: number) => void;
  isEraser: boolean;
  zoom: number;
  onZoomChange: (v: number) => void;
  onZoomReset: () => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function OptionsSection({
  brushSize,
  onBrushSizeChange,
  isEraser,
  zoom,
  onZoomChange,
  onZoomReset,
  isOpen,
  onToggle,
  onClose,
}: OptionsSectionProps) {
  return (
    <ToolbarSection
      icon={<OptionsIcon />}
      label="Options"
      onClick={onToggle}
      dropdownOpen={isOpen}
      onDropdownClose={onClose}
      dropdownContent={
        <div className="flex flex-col gap-2 w-full">
          <span
            className="text-[9px] uppercase tracking-widest mt-1"
            style={{ color: 'var(--fg-muted)' }}
          >
            Stroke Width
          </span>
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
                  backgroundColor: isEraser ? 'var(--danger)' : 'var(--accent)',
                  opacity: isEraser ? 0.5 : 0.85,
                  border: '1px solid var(--border-strong)',
                  flexShrink: 0,
                }}
              />
            </div>
          </div>
          <span
            className="text-[9px] uppercase tracking-widest mt-1"
            style={{ color: 'var(--fg-muted)' }}
          >
            Zoom
          </span>
          <div className="flex items-center gap-2">
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
              className="text-[10px] tabular-nums shrink-0 w-8"
              style={{ color: 'var(--fg-muted)' }}
            >
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <button
            onClick={onZoomReset}
            className="btn-ghost w-full rounded py-1 text-[10px] uppercase tracking-widest"
          >
            Reset Zoom
          </button>
        </div>
      }
    />
  );
}
