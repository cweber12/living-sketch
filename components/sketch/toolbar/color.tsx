'use client';

import { ToolbarSection } from '@/components/shared/ui/toolbar/toolbar-section';
import { Flask2Icon } from '@/components/sketch/icons/flask-2';

export const DEFAULT_COLOR_LIGHT = '#000000';
export const DEFAULT_COLOR_DARK = '#ffffff';

interface ColorSectionProps {
  color: string;
  onColorChange: (c: string) => void;
  onEraserOff: () => void;
  usedColors: string[];
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function ColorSection({
  color,
  onColorChange,
  onEraserOff,
  usedColors,
  isOpen,
  onToggle,
  onClose,
}: ColorSectionProps) {
  return (
    <ToolbarSection
      icon={<Flask2Icon />}
      label="Color"
      onClick={onToggle}
      dropdownOpen={isOpen}
      onDropdownClose={onClose}
      dropdownContent={
        <div className="flex flex-col gap-2 w-full">
          <span
            className="text-[9px] uppercase tracking-widest"
            style={{ color: 'var(--fg-muted)' }}
          >
            Color
          </span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => {
                onColorChange(e.target.value);
                onEraserOff();
              }}
              style={{
                width: 48,
                height: 28,
                cursor: 'pointer',
                border: '1px solid var(--border)',
                borderRadius: 4,
                backgroundColor: 'transparent',
                padding: 0,
              }}
              aria-label="Stroke color"
            />
            <span
              className="text-[10px] font-mono"
              style={{ color: 'var(--fg-muted)' }}
            >
              {color}
            </span>
          </div>
          {usedColors.length > 0 && (
            <>
              <span
                className="text-[9px] uppercase tracking-widest"
                style={{ color: 'var(--fg-muted)' }}
              >
                Recent
              </span>
              <div className="flex flex-wrap gap-1.5">
                {usedColors.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      onColorChange(c);
                      onEraserOff();
                    }}
                    title={c}
                    className="rounded transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    style={{
                      width: 20,
                      height: 20,
                      padding: 0,
                      background: 'none',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--fg-muted)',
                    }}
                  >
                    <Flask2Icon size={18} secondaryColor={c} />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      }
    />
  );
}
