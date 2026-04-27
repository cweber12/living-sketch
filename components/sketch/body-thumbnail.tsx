'use client';

import { BODY_PARTS } from '@/lib/constants/anchor-descriptors';
import type { BodyPartName } from '@/hooks/use-sketch-canvas-rig';
import {
  GRID_ARMS_DOWN,
  GRID_AREA,
  PART_LABEL,
} from '@/components/sketch/sketch-constants';

interface BodyThumbnailProps {
  focusPart: BodyPartName;
  onSelect: (part: BodyPartName) => void;
}

export function BodyThumbnail({ focusPart, onSelect }: BodyThumbnailProps) {
  const t = 10;
  const ac = t;
  const lc = Math.round(t * 1.15);
  return (
    <div className="border-edge bg-surface/90 fixed right-4 bottom-[76px] z-30 rounded-lg border p-1.5 backdrop-blur-sm md:bottom-4">
      <div
        style={{
          display: 'grid',
          gridTemplateAreas: GRID_ARMS_DOWN,
          gridTemplateColumns: `${ac}px ${lc}px ${lc}px ${ac}px`,
          gridTemplateRows: [
            t * 2.3,
            t * 1.3,
            t * 1.3,
            t * 1.75,
            t * 1.6,
            t * 1.6,
          ]
            .map((v) => `${Math.round(v)}px`)
            .join(' '),
          gap: '1px',
        }}
      >
        {BODY_PARTS.map((part) => (
          <button
            key={`thumb-${part}`}
            onClick={() => onSelect(part)}
            title={PART_LABEL[part]}
            style={{
              gridArea: GRID_AREA[part],
              backgroundColor:
                part === focusPart ? 'var(--accent)' : 'var(--fg-muted)',
              opacity: part === focusPart ? 1 : 0.3,
              borderRadius: '1px',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'opacity 0.15s',
            }}
          />
        ))}
      </div>
    </div>
  );
}
