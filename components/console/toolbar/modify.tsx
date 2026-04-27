'use client';

import { ToolbarGroup, ActionIcon } from '@/components/shared/toolbar';
import { PanelIcon } from '@/components/console/icons/panel';
import { ShiftIcon } from '@/components/console/icons/shift-icon';
import { ScaleIcon } from '@/components/console/icons/scale-icon';
import ShiftControls from '@/components/console/controls/shift-controls';
import ScaleControls from '@/components/console/controls/scale-controls';

/* Pose-skeleton joints icon: dots at key landmarks connected by lines */
const JointsIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    {/* Skeleton connections */}
    <line x1="12" y1="4" x2="7" y2="9" />
    <line x1="12" y1="4" x2="17" y2="9" />
    <line x1="7" y1="9" x2="4" y2="14" />
    <line x1="17" y1="9" x2="20" y2="14" />
    <line x1="7" y1="9" x2="10" y2="17" />
    <line x1="17" y1="9" x2="14" y2="17" />
    <line x1="10" y1="17" x2="9" y2="22" />
    <line x1="14" y1="17" x2="15" y2="22" />
    {/* Joint landmark dots */}
    <circle cx="12" cy="4" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="7" cy="9" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="17" cy="9" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="4" cy="14" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="20" cy="14" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="10" cy="17" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="14" cy="17" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="9" cy="22" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="15" cy="22" r="1.5" fill="currentColor" stroke="none" />
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
      icon={<PanelIcon size={24} />}
      label="Modifications"
      expanded={expanded}
      onToggle={onToggle}
    >
      <ActionIcon
        icon={<ShiftIcon size={24} />}
        label="Shift Joints"
        onClick={onShiftDropdownToggle}
        dropdownOpen={shiftDropdownOpen}
        onDropdownClose={onShiftDropdownClose}
        dropdownWidth={260}
        dropdownContent={<ShiftControls />}
      />
      <ActionIcon
        icon={<ScaleIcon size={24} />}
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
