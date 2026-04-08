'use client';

import type { Side } from '@/hooks/use-sketch-canvas-rig';
import { ToolbarSection } from '@/components/shared/ui/toolbar/toolbar-section';
import { SegmentedControl } from '@/components/shared/ui/toolbar/segmented-control';
import { TableIcon } from '@/components/sketch/icons/table';
import { PART_LABEL, PARTS_ORDER } from '@/components/sketch/sketch-constants';

export type ArmPose = 'up' | 'down';
export type ViewMode = 'body' | 'single';

interface LayoutSectionProps {
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
            className="text-[9px] uppercase tracking-widest"
            style={{ color: 'var(--fg-muted)' }}
          >
            Side
          </span>
          <SegmentedControl
            options={['front', 'back'] as Side[]}
            value={side}
            onChange={onSideChange}
            labels={{ front: 'Front', back: 'Back' }}
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
