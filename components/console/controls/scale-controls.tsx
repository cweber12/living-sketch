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
    <div className="flex flex-col gap-3 rounded-lg p-3">
      <div className="flex flex-row gap-1 overflow-x-auto pb-1">
        {PARTS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className="text-2xs shrink-0 rounded px-2 py-1 font-semibold tracking-wide uppercase transition-colors"
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

      <label className="text-2xs text-muted flex items-center gap-2">
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
      </label>

      <label className="text-2xs text-muted flex items-center gap-2">
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
      </label>
    </div>
  );
}
