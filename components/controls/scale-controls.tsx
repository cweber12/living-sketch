'use client';

import { useState } from 'react';
import { useScaleFactorsStore } from '@/lib/stores/scale-factors-store';
import type { ScaleFactors } from '@/lib/types';

const PARTS: { id: keyof ScaleFactors; label: string }[] = [
  { id: 'headScale', label: 'Head' },
  { id: 'armScale', label: 'Arms' },
  { id: 'handScale', label: 'Hands' },
  { id: 'legScale', label: 'Legs' },
  { id: 'footScale', label: 'Feet' },
];

export default function ScaleControls() {
  const store = useScaleFactorsStore();
  const [selected, setSelected] = useState<keyof ScaleFactors>(PARTS[0].id);
  const current = store[selected];

  function setAxis(axis: 'x' | 'y', raw: string) {
    const val = Number(raw);
    store.setScale(selected, {
      ...current,
      [axis]: val,
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg bg-neutral-100 p-3 dark:bg-neutral-900">
      <h3 className="text-sm font-semibold uppercase tracking-wide">
        Scale Parts
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
          min={0}
          max={10}
          step={0.01}
          value={current.x}
          onChange={(e) => setAxis('x', e.target.value)}
          className="flex-1"
        />
        <span className="w-10 text-right tabular-nums">
          {current.x.toFixed(2)}
        </span>
      </label>

      <label className="flex items-center gap-2 text-xs">
        <span className="w-4">Y</span>
        <input
          type="range"
          min={0}
          max={10}
          step={0.01}
          value={current.y}
          onChange={(e) => setAxis('y', e.target.value)}
          className="flex-1"
        />
        <span className="w-10 text-right tabular-nums">
          {current.y.toFixed(2)}
        </span>
      </label>
    </div>
  );
}
