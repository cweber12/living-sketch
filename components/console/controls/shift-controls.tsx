'use client';

import { useState } from 'react';
import { useShiftFactorsStore } from '@/lib/stores/shift-factors-store';
import type { ShiftFactors } from '@/lib/types';

const PARTS: { id: keyof ShiftFactors; label: string }[] = [
  { id: 'torsoShift', label: 'Torso' },
  { id: 'headShift', label: 'Head' },
  { id: 'shoulderShift', label: 'Shoulders' },
  { id: 'elbowShift', label: 'Elbows' },
  { id: 'wristShift', label: 'Hands' },
  { id: 'hipShift', label: 'Hips' },
  { id: 'kneeShift', label: 'Knees' },
  { id: 'ankleShift', label: 'Ankles' },
  { id: 'footShift', label: 'Feet' },
];

export default function ShiftControls() {
  const store = useShiftFactorsStore();
  const [selected, setSelected] = useState<keyof ShiftFactors>(PARTS[0].id);
  const current = store[selected];

  function setAxis(axis: 'x' | 'y', raw: string) {
    const val = Number(raw);
    store.setShift(selected, {
      ...current,
      [axis]: val,
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg p-3">
      <div className="flex flex-row overflow-x-auto gap-1 pb-1">
        {PARTS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className="rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors shrink-0"
            style={{
              backgroundColor:
                selected === p.id ? 'var(--accent)' : 'var(--surface-inset)',
              color: selected === p.id ? 'var(--bg)' : 'var(--fg-muted)',
              border: '1px solid var(--border)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label
        className="flex items-center gap-2 text-[11px]"
        style={{ color: 'var(--fg-muted)' }}
      >
        <span className="w-4">X</span>
        <input
          type="range"
          min={-10}
          max={10}
          step={0.1}
          value={current.x}
          onChange={(e) => setAxis('x', e.target.value)}
          className="flex-1"
        />
      </label>

      <label
        className="flex items-center gap-2 text-[11px]"
        style={{ color: 'var(--fg-muted)' }}
      >
        <span className="w-4">Y</span>
        <input
          type="range"
          min={-10}
          max={10}
          step={0.1}
          value={current.y}
          onChange={(e) => setAxis('y', e.target.value)}
          className="flex-1"
        />
      </label>
    </div>
  );
}
