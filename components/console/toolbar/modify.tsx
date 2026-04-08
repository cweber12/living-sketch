'use client';

import { useState } from 'react';
import { ToolbarSection } from '@/components/shared/ui/toolbar/toolbar-section';
import { SegmentedControl } from '@/components/shared/ui/toolbar/segmented-control';
import { PanelIcon } from '@/components/console/icons/panel';
import { ShiftIcon } from '@/components/console/icons/shift-icon';
import { ScaleIcon } from '@/components/console/icons/scale-icon';
import ShiftControls from '@/components/console/controls/shift-controls';
import ScaleControls from '@/components/console/controls/scale-controls';

interface ModifySectionProps {
  showAnchors: boolean;
  onShowAnchorsChange: (v: boolean) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function ModifySection({
  showAnchors,
  onShowAnchorsChange,
  isOpen,
  onToggle,
  onClose,
}: ModifySectionProps) {
  const [toolsPanel, setToolsPanel] = useState<'shift' | 'scale'>('shift');

  return (
    <ToolbarSection
      icon={<PanelIcon />}
      label="Modify"
      onClick={onToggle}
      dropdownOpen={isOpen}
      onDropdownClose={onClose}
      dropdownContent={
        <div className="flex flex-col gap-2 w-full">
          {/* SegmentedControl + Show Joints inline */}
          <div className="flex items-center gap-2">
            <SegmentedControl
              options={['shift', 'scale'] as const}
              value={toolsPanel}
              onChange={setToolsPanel}
              labels={{
                shift: (
                  <span className="flex items-center gap-1">
                    <ShiftIcon /> Shift
                  </span>
                ),
                scale: (
                  <span className="flex items-center gap-1">
                    <ScaleIcon /> Scale
                  </span>
                ),
              }}
            />
            <button
              onClick={() => onShowAnchorsChange(!showAnchors)}
              title={showAnchors ? 'Hide Joints' : 'Show Joints'}
              aria-label={showAnchors ? 'Hide Joints' : 'Show Joints'}
              style={{
                padding: '3px 7px',
                border: '1px solid var(--border)',
                borderRadius: 4,
                backgroundColor: showAnchors
                  ? 'transparent'
                  : 'var(--surface-raised)',
                color: showAnchors ? 'var(--accent)' : 'var(--fg-muted)',
                cursor: 'pointer',
                fontSize: 13,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ⊙
            </button>
          </div>
          {toolsPanel === 'shift' && <ShiftControls />}
          {toolsPanel === 'scale' && <ScaleControls />}
        </div>
      }
    />
  );
}
