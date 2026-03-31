'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';

const MOBILE_BP = 1024;

export type ToolbarMode = 'side' | 'top';

interface ToolbarProps {
  children: ReactNode;
  /** Width in px when in side mode (default 200) */
  sideWidth?: number;
}

/**
 * Responsive toolbar: left column on large screens, top row on small.
 * Large screens can toggle between side and top via a button.
 * Small screens always show top bar (no toggle).
 */
export function Toolbar({ children, sideWidth = 200 }: ToolbarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [preferSide, setPreferSide] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BP - 1}px)`);
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const mode: ToolbarMode = isMobile ? 'top' : preferSide ? 'side' : 'top';

  const toggleMode = useCallback(() => setPreferSide((p) => !p), []);
  const toggleOpen = useCallback(() => setOpen((o) => !o), []);

  if (mode === 'top') {
    return (
      <div className="flex flex-col shrink-0">
        {/* Top bar */}
        <div
          className="w-full border-b overflow-hidden transition-[max-height] duration-200 ease-in-out"
          style={{
            borderColor: 'var(--border)',
            backgroundColor: 'var(--surface)',
            maxHeight: open ? 600 : 0,
          }}
        >
          <div className="flex items-start justify-between gap-2 px-3 py-2 flex-wrap overflow-x-auto w-full">
            {children}
          </div>
        </div>
        {/* Toggle strip (thin bottom bar) */}
        <div
          className="flex items-center h-5"
          style={{
            backgroundColor: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            className="h-full px-2 flex items-center transition-opacity hover:opacity-80"
            style={{ color: 'var(--fg-muted)' }}
            onClick={toggleOpen}
            aria-label={open ? 'Collapse toolbar' : 'Expand toolbar'}
          >
            <span className="text-[10px] select-none">{open ? '▲' : '▼'}</span>
          </button>
          {!isMobile && (
            <button
              className="h-full px-2 flex items-center transition-opacity hover:opacity-80 ml-auto"
              style={{ color: 'var(--fg-muted)' }}
              onClick={toggleMode}
              title="Switch to side toolbar"
              aria-label="Switch to side toolbar"
            >
              <span className="text-[10px] select-none">◧</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Side mode ──
  return (
    <div
      className="flex flex-row shrink-0"
      style={{ borderRight: '1px solid var(--border)' }}
    >
      {/* Sidebar content */}
      <div
        className="overflow-hidden transition-[width] duration-200 ease-in-out"
        style={{ width: open ? sideWidth : 0 }}
      >
        <div
          className="h-full flex flex-col py-3 px-3 gap-4 overflow-y-auto overflow-x-hidden"
          style={{
            width: sideWidth,
            backgroundColor: 'var(--surface)',
          }}
        >
          {children}
        </div>
      </div>
      {/* Toggle strip */}
      <div
        className="w-5 shrink-0 flex flex-col items-center py-2 gap-2"
        style={{
          backgroundColor: 'var(--surface)',
          borderRight: '1px solid var(--border)',
        }}
      >
        <button
          className="flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ color: 'var(--fg-muted)' }}
          onClick={toggleOpen}
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <span className="text-[10px] select-none">{open ? '‹' : '›'}</span>
        </button>
        <button
          className="flex items-center justify-center transition-opacity hover:opacity-80 mt-auto"
          style={{ color: 'var(--fg-muted)' }}
          onClick={toggleMode}
          title="Switch to top toolbar"
          aria-label="Switch to top toolbar"
        >
          <span className="text-[10px] select-none">▭</span>
        </button>
      </div>
    </div>
  );
}

/** Section label used inside the toolbar */
export function ToolbarSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p
        className="text-[9px] uppercase tracking-widest"
        style={{ color: 'var(--fg-muted)' }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

/** Segmented toggle (2+ options in a row) */
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
  labels?: Partial<Record<T, string>>;
  dangerValue?: T;
}) {
  return (
    <div
      className="flex rounded overflow-hidden"
      style={{ border: '1px solid var(--border)' }}
    >
      {options.map((o) => {
        const active = o === value;
        const isDanger = dangerValue === o && active;
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            className="flex-1 px-2 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors"
            style={
              isDanger
                ? { backgroundColor: 'var(--danger)', color: '#fff' }
                : active
                  ? { backgroundColor: 'var(--accent)', color: 'var(--bg)' }
                  : { color: 'var(--fg-muted)' }
            }
          >
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}
