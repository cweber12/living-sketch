'use client';

import { ToolbarSection } from '@/components/shared/toolbar/toolbar-section';
import { UndoIcon } from '@/components/shared/icons/undo';
import { TrashIcon } from '@/components/shared/icons/trash';

interface HistorySectionProps {
  onUndo: () => void;
  onClearAll: () => void;
  isClearOpen: boolean;
  onClearToggle: () => void;
  onClearClose: () => void;
}

export function HistorySection({
  onUndo,
  onClearAll,
  isClearOpen,
  onClearToggle,
  onClearClose,
}: HistorySectionProps) {
  return (
    <div className="flex items-stretch">
      {/* Undo */}
      <ToolbarSection
        icon={<UndoIcon />}
        onClick={onUndo}
        title="Undo last stroke"
      />
      {/* Clear All */}
      <ToolbarSection
        icon={<TrashIcon />}
        danger
        onClick={onClearToggle}
        dropdownOpen={isClearOpen}
        onDropdownClose={onClearClose}
        dropdownContent={
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                onClearAll();
                onClearClose();
              }}
              className="btn-danger w-full rounded py-1.5 text-xs uppercase tracking-widest font-bold"
              style={{
                backgroundColor: 'var(--danger)',
                color: '#fff',
              }}
            >
              Clear All
            </button>
          </div>
        }
      />
    </div>
  );
}
