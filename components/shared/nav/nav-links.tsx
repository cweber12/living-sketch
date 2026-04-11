'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/sketch', label: 'Sketch' },
  { href: '/extract', label: 'Extract' },
  { href: '/console', label: 'Re-Animate' },
] as const;

export function NavDropdown() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const currentLabel =
    TABS.find((t) => pathname.startsWith(t.href))?.label ?? 'Navigate';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Navigation: ${currentLabel}`}
        className="text-muted flex items-center gap-1.5 rounded px-3 py-2 transition-colors sm:px-2 sm:py-1.5"
        style={{
          backgroundColor: open ? 'var(--surface-raised)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!open)
            (e.currentTarget as HTMLElement).style.borderColor =
              'var(--border)';
        }}
        onMouseLeave={(e) => {
          if (!open)
            (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
        }}
      >
        {/* Hamburger icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <rect
            x="2"
            y="3"
            width="12"
            height="1.5"
            rx="0.75"
            fill="currentColor"
          />
          <rect
            x="2"
            y="7.25"
            width="12"
            height="1.5"
            rx="0.75"
            fill="currentColor"
          />
          <rect
            x="2"
            y="11.5"
            width="12"
            height="1.5"
            rx="0.75"
            fill="currentColor"
          />
        </svg>
        <span className="text-3xs hidden font-semibold tracking-widest uppercase sm:inline">
          {currentLabel}
        </span>
        {/* Chevron */}
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
          className="hidden sm:inline"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="bg-surface border-edge-strong absolute top-full left-0 z-50 mt-1 min-w-45 rounded-md border py-1 shadow-lg"
        >
          <div className="text-4xs text-muted px-3 py-1.5 font-bold tracking-[0.2em] uppercase">
            Lab Stations
          </div>
          {TABS.map(({ href, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={close}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold tracking-widest uppercase transition-colors"
                style={{
                  color: active ? 'var(--accent)' : 'var(--fg)',
                  backgroundColor: active
                    ? 'var(--accent-faint)'
                    : 'transparent',
                  borderLeft: active
                    ? '2px solid var(--accent)'
                    : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      'var(--surface-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      'transparent';
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
