'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDownIcon } from '@/components/shared/icons/chevron';

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
        className="text-muted hover:text-foreground focus-visible:ring-accent flex items-center gap-1.5 rounded px-3 py-2 text-xs font-semibold tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none sm:px-2 sm:py-1.5"
        style={{
          backgroundColor: open ? 'var(--surface-raised)' : 'transparent',
        }}
      >
        <span className="hidden text-xs font-semibold tracking-widest uppercase sm:inline">
          {currentLabel}
        </span>
        <ChevronDownIcon size={12} color="currentColor" />
      </button>

      {/* Always rendered — animated with opacity + translateY */}
      <div
        role="menu"
        aria-hidden={!open}
        style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: open
            ? 'translateX(-50%) translateY(0)'
            : 'translateX(-50%) translateY(-6px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 160ms ease, transform 160ms ease',
          minWidth: '180px',
          zIndex: 50,
          backgroundColor: 'var(--surface)',
          borderRadius: '0 0 6px 6px',
          border: '1px solid var(--border-strong)',
          borderTop: 'none',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          paddingBlock: '4px',
        }}
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
              tabIndex={open ? 0 : -1}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold tracking-widest uppercase transition-colors"
              style={{
                color: active ? 'var(--accent)' : 'var(--fg)',
                backgroundColor: active ? 'var(--accent-faint)' : 'transparent',
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
    </div>
  );
}
