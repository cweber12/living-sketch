'use client';

import { useState } from 'react';
import type { FileEntry } from '@/lib/types';
import { ToolbarSection } from '@/components/shared/toolbar/toolbar-section';
import { SegmentedControl } from '@/components/shared/toolbar/segmented-control';
import { BrainIcon } from '@/components/shared/icons/brain';
import { PersonFrontIcon } from '@/components/shared/icons/person-view';
import { FilesIcon } from '@/components/console/icons/files-icon';
import FileList from '@/components/console/controls/file-list';

function formatFileTimestamp(name: string): string {
  // ISO-like: "2026-03-31T13-16-35-194Z" or "capture-2026-03-31T05-36-51-828Z.json"
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
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function CollectionSection({
  landmarkFile,
  onLandmarkSelect,
  onLandmarkDeselect,
  svgFile,
  onSvgSelect,
  onSvgDeselect,
  isOpen,
  onToggle,
  onClose,
}: CollectionSectionProps) {
  const [fileView, setFileView] = useState<'activity' | 'creations'>(
    'activity',
  );

  return (
    <ToolbarSection
      icon={<FilesIcon />}
      label="Collection"
      onClick={onToggle}
      dropdownOpen={isOpen}
      onDropdownClose={onClose}
      dropdownWidth={300}
      dropdownContent={
        <div className="flex flex-col gap-2 w-full">
          <SegmentedControl
            options={['activity', 'creations'] as const}
            value={fileView}
            onChange={setFileView}
            labels={{
              activity: (
                <span className="flex items-center justify-center gap-1">
                  <BrainIcon />
                  Extractions
                </span>
              ),
              creations: (
                <span className="flex items-center justify-center gap-1">
                  <PersonFrontIcon size={10} />
                  Creations
                </span>
              ),
            }}
          />
          <div className="overflow-y-auto max-h-[40vh]">
            {fileView === 'activity' ? (
              <FileList
                bucket="landmarks"
                selected={landmarkFile}
                onSelect={onLandmarkSelect}
                formatLabel={(name) => formatFileTimestamp(name)}
                onDelete={(f) => {
                  if (landmarkFile === f.key) onLandmarkDeselect();
                }}
              />
            ) : (
              <FileList
                bucket="svgs"
                selected={svgFile}
                onSelect={onSvgSelect}
                formatLabel={(name) => formatFileTimestamp(name)}
                onDelete={(f) => {
                  if (svgFile === f.key) onSvgDeselect();
                }}
              />
            )}
          </div>
        </div>
      }
    />
  );
}
