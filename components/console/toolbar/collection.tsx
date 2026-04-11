'use client';

import type { FileEntry } from '@/lib/types';
import { ToolbarGroup, ActionIcon } from '@/components/shared/toolbar';
import { BrainIcon } from '@/components/shared/icons/brain';
import { PersonArmsDownIcon } from '@/components/shared/icons/person';
import { FilesIcon } from '@/components/console/icons/files-icon';
import FileList from '@/components/console/controls/file-list';

function formatFileTimestamp(name: string): string {
  const isoFixed = name
    .replace(/^capture-/, '')
    .replace(/\.json$/, '')
    .replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, 'T$1:$2:$3.$4Z');
  const d = new Date(isoFixed);
  if (!isNaN(d.getTime())) {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return name;
}

interface CollectionSectionProps {
  landmarkFile: string | null;
  onLandmarkSelect: (f: FileEntry) => void;
  onLandmarkDeselect: () => void;
  svgFile: string | null;
  onSvgSelect: (f: FileEntry) => void;
  onSvgDeselect: () => void;
  expanded: boolean;
  onToggle: () => void;
  activityDropdownOpen: boolean;
  onActivityDropdownToggle: () => void;
  onActivityDropdownClose: () => void;
  creationsDropdownOpen: boolean;
  onCreationsDropdownToggle: () => void;
  onCreationsDropdownClose: () => void;
}

export function CollectionSection({
  landmarkFile,
  onLandmarkSelect,
  onLandmarkDeselect,
  svgFile,
  onSvgSelect,
  onSvgDeselect,
  expanded,
  onToggle,
  activityDropdownOpen,
  onActivityDropdownToggle,
  onActivityDropdownClose,
  creationsDropdownOpen,
  onCreationsDropdownToggle,
  onCreationsDropdownClose,
}: CollectionSectionProps) {
  return (
    <ToolbarGroup
      icon={<FilesIcon size={14} />}
      label="Collection"
      expanded={expanded}
      onToggle={onToggle}
    >
      <ActionIcon
        icon={<BrainIcon />}
        label="Activity"
        labeledButton
        onClick={onActivityDropdownToggle}
        active={activityDropdownOpen}
        dropdownOpen={activityDropdownOpen}
        onDropdownClose={onActivityDropdownClose}
        dropdownWidth={280}
        dropdownContent={
          <div className="max-h-[40vh] overflow-y-auto">
            <FileList
              bucket="landmarks"
              selected={landmarkFile}
              onSelect={onLandmarkSelect}
              formatLabel={(name) => formatFileTimestamp(name)}
              onDelete={(f) => {
                if (landmarkFile === f.key) onLandmarkDeselect();
              }}
            />
          </div>
        }
      />
      <ActionIcon
        icon={<PersonArmsDownIcon size={10} />}
        label="Creations"
        labeledButton
        onClick={onCreationsDropdownToggle}
        active={creationsDropdownOpen}
        dropdownOpen={creationsDropdownOpen}
        onDropdownClose={onCreationsDropdownClose}
        dropdownWidth={280}
        dropdownContent={
          <div className="max-h-[40vh] overflow-y-auto">
            <FileList
              bucket="svgs"
              selected={svgFile}
              onSelect={onSvgSelect}
              formatLabel={(name) => formatFileTimestamp(name)}
              onDelete={(f) => {
                if (svgFile === f.key) onSvgDeselect();
              }}
            />
          </div>
        }
      />
    </ToolbarGroup>
  );
}
