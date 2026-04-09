'use client';

import type { ShapeTool } from '@/components/sketch/canvas/sketch-canvas';
import { ToolbarSection } from '@/components/shared/toolbar/toolbar-section';
import { SegmentedControl } from '@/components/shared/toolbar/segmented-control';
import { DrillIcon } from '@/components/shared/icons/drill';

const SHAPE_OPTIONS: { value: ShapeTool; label: string }[] = [
  { value: 'pen', label: '✏ Pen' },
  { value: 'line', label: '╱ Line' },
  { value: 'rect', label: '▭ Rectangle' },
  { value: 'circle', label: '○ Circle' },
  { value: 'ellipse', label: '⬭ Ellipse' },
];

interface ToolsSectionProps {
  tool: ShapeTool;
  onToolChange: (t: ShapeTool) => void;
  isEraser: boolean;
  onIsEraserChange: (v: boolean) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function ToolsSection({
  tool,
  onToolChange,
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
          <span
            className="text-[9px] uppercase tracking-widest"
            style={{ color: 'var(--fg-muted)' }}
          >
            Tool
          </span>
          <SegmentedControl
            options={['sketch', 'erase'] as ('sketch' | 'erase')[]}
            value={isEraser ? 'erase' : 'sketch'}
            onChange={(v) => onIsEraserChange(v === 'erase')}
            labels={{ sketch: 'Sketch', erase: 'Erase' }}
            dangerValue="erase"
          />
          <span
            className="text-[9px] uppercase tracking-widest"
            style={{ color: 'var(--fg-muted)' }}
          >
            Shape Tool
          </span>
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
