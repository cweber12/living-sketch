'use client';

import { ToolbarGroup, ActionIcon } from '@/components/shared/toolbar';
import { PanelIcon } from '@/components/console/icons/panel';
import { ShiftIcon } from '@/components/console/icons/shift-icon';
import { ScaleIcon } from '@/components/console/icons/scale-icon';
import ShiftControls from '@/components/console/controls/shift-controls';
import ScaleControls from '@/components/console/controls/scale-controls';

/* Anchor/joints icon */
const JointsIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="8" strokeDasharray="2 3" />
  </svg>
);

interface ModifySectionProps {
  showAnchors: boolean;
  onShowAnchorsChange: (v: boolean) => void;
  expanded: boolean;
  onToggle: () => void;
  shiftDropdownOpen: boolean;
  onShiftDropdownToggle: () => void;
  onShiftDropdownClose: () => void;
  scaleDropdownOpen: boolean;
  onScaleDropdownToggle: () => void;
  onScaleDropdownClose: () => void;
}

export function ModifySection({
  showAnchors,
  onShowAnchorsChange,
  expanded,
  onToggle,
  shiftDropdownOpen,
  onShiftDropdownToggle,
  onShiftDropdownClose,
  scaleDropdownOpen,
  onScaleDropdownToggle,
  onScaleDropdownClose,
}: ModifySectionProps) {
  return (
    <ToolbarGroup
      icon={<PanelIcon size={14} />}
      label="Modifications"
      expanded={expanded}
      onToggle={onToggle}
    >
      <ActionIcon
        icon={<ShiftIcon size={14} />}
        label="Shift Joints"
        onClick={onShiftDropdownToggle}
        dropdownOpen={shiftDropdownOpen}
        onDropdownClose={onShiftDropdownClose}
        dropdownWidth={260}
        dropdownContent={<ShiftControls />}
      />
      <ActionIcon
        icon={<ScaleIcon size={14} />}
        label="Scale Parts"
        onClick={onScaleDropdownToggle}
        dropdownOpen={scaleDropdownOpen}
        onDropdownClose={onScaleDropdownClose}
        dropdownWidth={260}
        dropdownContent={<ScaleControls />}
      />
      <ActionIcon
        icon={<JointsIcon />}
        label="Show Joints"
        active={showAnchors}
        onClick={() => onShowAnchorsChange(!showAnchors)}
      />
    </ToolbarGroup>
  );
}
