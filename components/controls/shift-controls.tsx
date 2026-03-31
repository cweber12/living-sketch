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
    <div className="flex flex-col gap-3 rounded-lg bg-neutral-100 p-3 dark:bg-neutral-900">
      <h3 className="text-sm font-semibold uppercase tracking-wide">
        Shift Anchors
      </h3>

      <div className="flex flex-wrap gap-1">
        {PARTS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`rounded px-2 py-1 text-xs transition-colors ${
              selected === p.id
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2 text-xs">
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
        <span className="w-10 text-right tabular-nums">
          {current.x.toFixed(1)}
        </span>
      </label>

      <label className="flex items-center gap-2 text-xs">
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
        <span className="w-10 text-right tabular-nums">
          {current.y.toFixed(1)}
        </span>
      </label>
    </div>
  );
}
