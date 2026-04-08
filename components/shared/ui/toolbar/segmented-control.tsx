import { useState } from 'react';
import type { ReactNode } from 'react';

/* ── SegmentedControl ──────────────────────────────────────────────── */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labels,
  dangerValue,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, ReactNode>>;
  dangerValue?: T;
}) {
  const [hoveredOption, setHoveredOption] = useState<T | null>(null);
  const [flashOption, setFlashOption] = useState<T | null>(null);

  function handleClick(o: T) {
    onChange(o);
    setFlashOption(o);
    setTimeout(() => setFlashOption(null), 520);
  }

  return (
    <div
      className="flex rounded overflow-hidden"
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface-raised)',
      }}
    >
      {options.map((o, i) => {
        const active = o === value;
        const isDanger = dangerValue === o && active;
        const isLast = i === options.length - 1;
        const isHovered = hoveredOption === o && !active && !isDanger;
        const isFlash = flashOption === o;
        return (
          <button
            key={o}
            onClick={() => handleClick(o)}
            onMouseEnter={() => setHoveredOption(o)}
            onMouseLeave={() => setHoveredOption(null)}
            className={`flex-1 py-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest transition-all duration-150 focus-visible:outline-none${isFlash ? ' seg-click-glow' : ''}`}
            style={{
              cursor: 'pointer',
              ...(isDanger
                ? { backgroundColor: 'var(--danger)', color: '#fff' }
                : active
                  ? {
                      backgroundColor: 'var(--accent)',
                      color: 'var(--bg)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
                    }
                  : isHovered
                    ? {
                        backgroundColor: 'var(--surface-hover)',
                        color: 'var(--fg)',
                      }
                    : {
                        color: 'var(--fg-muted)',
                        backgroundColor: 'transparent',
                      }),
              borderRight: !isLast ? '1px solid var(--border)' : 'none',
            }}
          >
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}
