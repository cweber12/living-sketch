'use client';

import { ToolbarGroup, ActionIcon } from '@/components/shared/toolbar';
import { PreviewIcon } from '@/components/console/icons/preview-icon';

/* Inline mini-icons */
// Shows the current background colour as a filled swatch — clicking opens the picker.
const BackgroundIcon = ({ bgColor }: { bgColor: string }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="1"
      y="1"
      width="12"
      height="12"
      rx="2"
      fill={bgColor}
      stroke="currentColor"
      strokeWidth="1.5"
    />
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

interface DisplaySectionProps {
  bgColor: string;
  onBgColorChange: (c: string) => void;
  scale: number;
  onScaleChange: (v: number) => void;
  expanded: boolean;
  onToggle: () => void;
  bgDropdownOpen: boolean;
  onBgDropdownToggle: () => void;
  onBgDropdownClose: () => void;
  zoomDropdownOpen: boolean;
  onZoomDropdownToggle: () => void;
  onZoomDropdownClose: () => void;
}

export function DisplaySection({
  bgColor,
  onBgColorChange,
  scale,
  onScaleChange,
  expanded,
  onToggle,
  bgDropdownOpen,
  onBgDropdownToggle,
  onBgDropdownClose,
  zoomDropdownOpen,
  onZoomDropdownToggle,
  onZoomDropdownClose,
}: DisplaySectionProps) {
  return (
    <ToolbarGroup
      icon={<PreviewIcon size={14} />}
      label="Display"
      expanded={expanded}
      onToggle={onToggle}
    >
      <ActionIcon
        icon={<BackgroundIcon bgColor={bgColor} />}
        label="Background"
        onClick={onBgDropdownToggle}
        dropdownOpen={bgDropdownOpen}
        onDropdownClose={onBgDropdownClose}
        dropdownWidth={140}
        dropdownContent={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 0',
            }}
          >
            <input
              type="color"
              value={bgColor}
              onChange={(e) => onBgColorChange(e.target.value)}
              style={{
                width: 32,
                height: 24,
                cursor: 'pointer',
                borderRadius: 4,
                backgroundColor: 'transparent',
                padding: 0,
                border: 'none',
              }}
              title="Canvas background colour"
              aria-label="Canvas background colour"
            />
            <span
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--fg-muted)',
              }}
            >
              {bgColor}
            </span>
          </div>
        }
      />
      <ActionIcon
        icon={<ZoomIcon />}
        label="Zoom"
        onClick={onZoomDropdownToggle}
        dropdownOpen={zoomDropdownOpen}
        onDropdownClose={onZoomDropdownClose}
        dropdownWidth={160}
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
                min={0.25}
                max={2}
                step={0.05}
                value={scale}
                onChange={(e) => onScaleChange(parseFloat(e.target.value))}
                className="accent-accent flex-1"
                title="Preview scale"
              />
              <span
                style={{
                  fontSize: 10,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--fg-muted)',
                  width: 32,
                  textAlign: 'right',
                }}
              >
                {Math.round(scale * 100)}%
              </span>
            </div>
          </div>
        }
      />
    </ToolbarGroup>
  );
}
