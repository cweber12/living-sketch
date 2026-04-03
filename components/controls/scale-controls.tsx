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
    <div
      className="flex flex-col gap-3 rounded-lg p-3"
      style={{
        backgroundColor: 'var(--surface-raised)',
        border: '1px solid var(--border)',
      }}
    >
      <h3
        className="text-[10px] font-bold uppercase tracking-[0.18em]"
        style={{ color: 'var(--fg-muted)' }}
      >
        Scale Parts
      </h3>

      <div className="flex flex-wrap gap-1">
        {PARTS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className="rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors"
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
          min={0}
          max={10}
          step={0.01}
          value={current.x}
          onChange={(e) => setAxis('x', e.target.value)}
          className="flex-1"
        />
        <span
          className="w-10 text-right font-data"
          style={{ color: 'var(--fg)' }}
        >
          {current.x.toFixed(2)}
        </span>
      </label>

      <label
        className="flex items-center gap-2 text-[11px]"
        style={{ color: 'var(--fg-muted)' }}
      >
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
        <span
          className="w-10 text-right font-data"
          style={{ color: 'var(--fg)' }}
        >
          {current.y.toFixed(2)}
        </span>
      </label>
    </div>
  );
}
