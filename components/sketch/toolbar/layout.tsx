'use client';

import type { Side } from '@/hooks/use-sketch-canvas-rig';
import { ToolbarGroup, ActionIcon } from '@/components/shared/toolbar';
import { TableIcon } from '@/components/sketch/icons/table';
import { HeadIcon } from '@/components/sketch/icons/head';
import { PART_LABEL, PARTS_ORDER } from '@/components/sketch/sketch-constants';
import { CleaverIcon } from '@/components/shared/icons/cleaver';
export type ArmPose = 'up' | 'down';
export type ViewMode = 'body' | 'single';

/* ── Mini icons ─────────────────────────────────────────────────────── */

const ArmsUpIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="5" r="2" />
    <line x1="12" y1="7" x2="12" y2="16" />
    <line x1="12" y1="16" x2="8" y2="22" />
    <line x1="12" y1="16" x2="16" y2="22" />
    <line x1="12" y1="10" x2="5" y2="5" />
    <line x1="12" y1="10" x2="19" y2="5" />
  </svg>
);

const ArmsDownIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="5" r="2" />
    <line x1="12" y1="7" x2="12" y2="16" />
    <line x1="12" y1="16" x2="8" y2="22" />
    <line x1="12" y1="16" x2="16" y2="22" />
    <line x1="12" y1="10" x2="6" y2="16" />
    <line x1="12" y1="10" x2="18" y2="16" />
  </svg>
);

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
  expanded: boolean;
  onToggle: () => void;
  partsDropdownOpen: boolean;
  onPartsDropdownToggle: () => void;
  onPartsDropdownClose: () => void;
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
  expanded,
  onToggle,
  partsDropdownOpen,
  onPartsDropdownToggle,
  onPartsDropdownClose,
}: LayoutSectionProps) {
  const isSingle = viewMode === 'single';

  return (
    <ToolbarGroup
      icon={<TableIcon size={14} />}
      label="Layout"
      expanded={expanded}
      onToggle={onToggle}
    >
      {/* Face Up */}
      <ActionIcon
        icon={
          <span style={{ display: 'flex', transform: 'rotate(90deg)' }}>
            <HeadIcon size={14} />
          </span>
        }
        label="Face Up"
        active={side === 'front'}
        onClick={() => onSideChange('front')}
      />
      {/* Face Down */}
      <ActionIcon
        icon={
          <span
            style={{ display: 'flex', transform: 'rotate(90deg) scaleX(-1)' }}
          >
            <HeadIcon size={14} />
          </span>
        }
        label="Face Down"
        active={side === 'back'}
        onClick={() => onSideChange('back')}
      />
      {/* Arms Up */}
      <ActionIcon
        icon={<ArmsUpIcon />}
        label="Arms Up"
        active={armPose === 'up'}
        disabled={isSingle}
        onClick={() => onArmPoseChange('up')}
      />
      {/* Arms Down */}
      <ActionIcon
        icon={<ArmsDownIcon />}
        label="Arms Down"
        active={armPose === 'down'}
        disabled={isSingle}
        onClick={() => onArmPoseChange('down')}
      />
      {/* Parts Mode */}
      <ActionIcon
        icon={<CleaverIcon />}
        label="Parts Mode"
        active={isSingle}
        onClick={() => {
          const newMode = isSingle ? 'body' : 'single';
          onViewModeChange(newMode);
          if (newMode === 'single') {
            onPartsDropdownToggle();
          } else {
            onPartsDropdownClose();
          }
        }}
        dropdownOpen={isSingle && partsDropdownOpen}
        onDropdownClose={onPartsDropdownClose}
        dropdownWidth={180}
        dropdownContent={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              padding: '2px 0',
            }}
          >
            {PARTS_ORDER.map((part, i) => (
              <button
                key={part}
                onClick={() => {
                  onFocusIdxChange(i);
                  onPartsDropdownClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 10px',
                  border: 'none',
                  background: focusIdx === i ? 'var(--accent)' : 'transparent',
                  color: focusIdx === i ? 'var(--bg)' : 'var(--fg)',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  width: '100%',
                  borderRadius: 2,
                  transition: 'background-color 100ms ease',
                  whiteSpace: 'nowrap',
                  textAlign: 'left',
                }}
                aria-label={PART_LABEL[part]}
              >
                {PART_LABEL[part]}
              </button>
            ))}
          </div>
        }
      />
    </ToolbarGroup>
  );
}
