'use client';

import type { Side } from '@/hooks/use-sketch-canvas-rig';
import { ToolbarSection } from '@/components/shared/toolbar/toolbar-section';
import { SegmentedControl } from '@/components/shared/toolbar/segmented-control';
import { TableIcon } from '@/components/sketch/icons/table';
import { PART_LABEL, PARTS_ORDER } from '@/components/sketch/sketch-constants';

export type ArmPose = 'up' | 'down';
export type ViewMode = 'body' | 'single';

interface LayoutSectionProps {
  zoom: number;
  onZoomChange: (v: number) => void;
  onZoomReset: () => void;

  side: Side;
  onSideChange: (s: Side) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  focusIdx: number;
  onFocusIdxChange: (i: number) => void;
  armPose: ArmPose;
  onArmPoseChange: (p: ArmPose) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function LayoutSection({
  zoom,
  onZoomChange,
  onZoomReset,
  side,
  onSideChange,
  viewMode,
  onViewModeChange,
  focusIdx,
  onFocusIdxChange,
  armPose,
  onArmPoseChange,
  isOpen,
  onToggle,
  onClose,
}: LayoutSectionProps) {
  return (
    <ToolbarSection
      icon={<TableIcon />}
      label="Layout"
      onClick={onToggle}
      dropdownOpen={isOpen}
      onDropdownClose={onClose}
      dropdownContent={
        <div className="flex flex-col gap-1.5">
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
          <span
            className="text-[9px] uppercase tracking-widest"
            style={{ color: 'var(--fg-muted)' }}
          >
            Side
          </span>
          <SegmentedControl
            options={['front', 'back'] as Side[]}
            value={side}
            onChange={onSideChange}
            labels={{ front: 'Face-Up', back: 'Face-Down' }}
          />
          <span
            className="text-[9px] uppercase tracking-widest mt-1"
            style={{ color: 'var(--fg-muted)' }}
          >
            Body
          </span>
          <SegmentedControl
            options={['body', 'single'] as ViewMode[]}
            value={viewMode}
            onChange={onViewModeChange}
            labels={{ body: 'Full', single: 'Parts' }}
          />
          {viewMode === 'single' && (
            <select
              value={focusIdx}
              onChange={(e) => onFocusIdxChange(Number(e.target.value))}
              className="w-full rounded px-2 py-1 text-[11px] uppercase tracking-wider font-semibold"
              style={{
                backgroundColor: 'var(--bg)',
                color: 'var(--fg)',
                border: '1px solid var(--border)',
              }}
            >
              {PARTS_ORDER.map((p, i) => (
                <option key={p} value={i}>
                  {PART_LABEL[p]}
                </option>
              ))}
            </select>
          )}
          <span
            className="text-[9px] uppercase tracking-widest mt-1"
            style={{ color: 'var(--fg-muted)' }}
          >
            Arm Orientation
          </span>
          <SegmentedControl
            options={['up', 'down'] as ArmPose[]}
            value={armPose}
            onChange={onArmPoseChange}
            labels={{ up: 'Up', down: 'Down' }}
          />
        </div>
      }
    />
  );
}
