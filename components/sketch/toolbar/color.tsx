'use client';

import { useContext } from 'react';
import { ToolbarGroup, ActionIcon } from '@/components/shared/toolbar';
import { ToolbarCtx } from '@/components/shared/toolbar/toolbar-main';
import { Flask2Icon } from '@/components/sketch/icons/flask-2';

export const DEFAULT_COLOR_LIGHT = '#000000';
export const DEFAULT_COLOR_DARK = '#ffffff';

/* Chevron icon for overflow */
const ChevronDownIcon = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 6"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
  >
    <path d="M1 1l4 4 4-4" />
  </svg>
);

const MAX_VISIBLE_SWATCHES = 6;

interface ColorSectionProps {
  color: string;
  onColorChange: (c: string) => void;
  onEraserOff: () => void;
  usedColors: string[];
  expanded: boolean;
  onToggle: () => void;
  pickerDropdownOpen: boolean;
  onPickerDropdownToggle: () => void;
  onPickerDropdownClose: () => void;
  overflowDropdownOpen: boolean;
  onOverflowDropdownToggle: () => void;
  onOverflowDropdownClose: () => void;
}

export function ColorSection({
  color,
  onColorChange,
  onEraserOff,
  usedColors,
  expanded,
  onToggle,
  pickerDropdownOpen,
  onPickerDropdownToggle,
  onPickerDropdownClose,
  overflowDropdownOpen,
  onOverflowDropdownToggle,
  onOverflowDropdownClose,
}: ColorSectionProps) {
  const { isMobile } = useContext(ToolbarCtx);
  const visibleSwatches = usedColors.slice(0, MAX_VISIBLE_SWATCHES);
  const overflowSwatches = usedColors.slice(MAX_VISIBLE_SWATCHES);

  return (
    <ToolbarGroup
      icon={<Flask2Icon size={14} />}
      label="Color"
      expanded={expanded}
      onToggle={onToggle}
    >
      <ActionIcon
        icon={<Flask2Icon color={color} />}
        label="Color Picker"
        onClick={onPickerDropdownToggle}
        dropdownOpen={pickerDropdownOpen}
        onDropdownClose={onPickerDropdownClose}
        dropdownWidth={160}
        dropdownContent={
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '4px 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    onColorChange(e.target.value);
                    onEraserOff();
                  }}
                  style={{
                    width: 48,
                    height: 32,
                    cursor: 'pointer',
                    borderRadius: 8,
                    backgroundColor: 'transparent',
                    padding: 0,
                    border: 'none',
                  }}
                  aria-label="Stroke color"
                />
                <span
                  style={{
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--fg)',
                  }}
                >
                  {color}
                </span>
              </div>
            </div>
            {/* Recently used colors */}
            <span
              style={{
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--fg)',
                borderBottom: '1px solid var(--border)',
              }}
            >
              Recent
            </span>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
                marginTop: 4,
              }}
            >
              {visibleSwatches.map((c) => (
                <ActionIcon
                  key={c}
                  icon={
                    <Flask2Icon size={isMobile ? 16 : 14} secondaryColor={c} />
                  }
                  label={c}
                  onClick={() => {
                    onColorChange(c);
                    onEraserOff();
                  }}
                />
              ))}
            </div>
            {/* Overflow chevron */}
            {overflowSwatches.length > 0 && (
              <ActionIcon
                icon={<ChevronDownIcon />}
                label="More colors"
                onClick={onOverflowDropdownToggle}
                dropdownOpen={overflowDropdownOpen}
                onDropdownClose={onOverflowDropdownClose}
                dropdownWidth={140}
                dropdownContent={
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 4,
                      padding: '4px 0',
                    }}
                  >
                    {overflowSwatches.map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          onColorChange(c);
                          onEraserOff();
                          onOverflowDropdownClose();
                        }}
                        title={c}
                        style={{
                          width: 24,
                          height: 24,
                          padding: 0,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        aria-label={c}
                      >
                        <Flask2Icon size={20} secondaryColor={c} />
                      </button>
                    ))}
                  </div>
                }
              />
            )}
          </>
        }
      />
    </ToolbarGroup>
  );
}
