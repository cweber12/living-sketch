'use client';

import { ToolbarSection } from '@/components/shared/ui/toolbar/toolbar-section';
import { PreviewIcon } from '@/components/console/icons/preview-icon';

interface PreviewSectionProps {
  bgColor: string;
  onBgColorChange: (c: string) => void;
  scale: number;
  onScaleChange: (v: number) => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function PreviewSection({
  bgColor,
  onBgColorChange,
  scale,
  onScaleChange,
  isOpen,
  onToggle,
  onClose,
}: PreviewSectionProps) {
  return (
    <ToolbarSection
      icon={<PreviewIcon />}
      label="Preview"
      onClick={onToggle}
      dropdownOpen={isOpen}
      onDropdownClose={onClose}
      dropdownContent={
        <div className="flex flex-col gap-2 w-full">
          <label className="flex items-center justify-between gap-2 text-xs uppercase tracking-widest">
            <span>Background</span>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => onBgColorChange(e.target.value)}
              className="h-5 w-8 cursor-pointer rounded border border-neutral-300 bg-transparent p-0 dark:border-neutral-600"
              title="Canvas background colour"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs uppercase tracking-widest">
            <div className="flex items-center justify-between">
              <span>Size</span>
              <span className="font-mono text-[10px]">
                {Math.round(scale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.25"
              max="2"
              step="0.05"
              value={scale}
              onChange={(e) => onScaleChange(parseFloat(e.target.value))}
              className="w-full accent-accent"
            />
          </label>
        </div>
      }
    />
  );
}
