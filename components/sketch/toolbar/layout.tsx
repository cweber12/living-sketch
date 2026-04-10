'use client';

import type { Side } from '@/hooks/use-sketch-canvas-rig';
import { ToolbarGroup, ActionIcon } from '@/components/shared/toolbar';
import { TableIcon } from '@/components/sketch/icons/table';
import { HeadIcon } from '@/components/sketch/icons/head';
import { PART_LABEL, PARTS_ORDER } from '@/components/sketch/sketch-constants';

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

const SawIcon = () => (
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
    <circle cx="12" cy="12" r="9" />
    <line x1="2" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="22" y2="12" />
    <line x1="12" y1="2" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const ZoomIcon = () => (
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
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
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
  zoomDropdownOpen: boolean;
  onZoomDropdownToggle: () => void;
  onZoomDropdownClose: () => void;
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
  expanded,
  onToggle,
  partsDropdownOpen,
  onPartsDropdownToggle,
  onPartsDropdownClose,
  zoomDropdownOpen,
  onZoomDropdownToggle,
  onZoomDropdownClose,
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
        icon={<SawIcon />}
        label="Parts Mode"
        active={isSingle}
        onClick={() => {
          const newMode = isSingle ? 'body' : 'single';
          onViewModeChange(newMode);
          if (newMode === 'single') onPartsDropdownToggle();
        }}
        dropdownOpen={isSingle && partsDropdownOpen}
        onDropdownClose={onPartsDropdownClose}
        dropdownWidth={180}
        dropdownContent={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              padding: '4px 0',
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
                  gap: 6,
                  padding: '4px 8px',
                  border: 'none',
                  background: focusIdx === i ? 'var(--accent)' : 'none',
                  color: focusIdx === i ? 'var(--bg)' : 'var(--fg)',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  width: '100%',
                  borderRadius: 2,
                  transition: 'background-color 100ms ease',
                }}
                aria-label={PART_LABEL[part]}
              >
                {PART_LABEL[part]}
              </button>
            ))}
          </div>
        }
      />
      {/* Zoom */}
      <ActionIcon
        icon={<ZoomIcon />}
        label="Zoom"
        onClick={onZoomDropdownToggle}
        dropdownOpen={zoomDropdownOpen}
        onDropdownClose={onZoomDropdownClose}
        dropdownWidth={180}
        dropdownContent={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '4px 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                style={{
                  fontSize: 10,
                  color: 'var(--fg-muted)',
                  width: 32,
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <button
              onClick={() => {
                onZoomReset();
                onZoomDropdownClose();
              }}
              style={{
                padding: '4px 8px',
                border: '1px solid var(--border)',
                background: 'none',
                color: 'var(--fg-muted)',
                cursor: 'pointer',
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                borderRadius: 3,
                width: '100%',
                transition: 'background-color 100ms ease',
              }}
              aria-label="Reset Zoom"
            >
              Reset Zoom
            </button>
          </div>
        }
      />
    </ToolbarGroup>
  );
}
