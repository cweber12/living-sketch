'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/sketch', label: 'Sketch' },
  { href: '/extract', label: 'Extract' },
  { href: '/console', label: 'Re-Animate' },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav
      className="flex items-center w-full rounded-md overflow-hidden"
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface-raised)',
      }}
    >
      {TABS.map(({ href, label }, i) => {
        const active = pathname.startsWith(href);
        const isLast = i === TABS.length - 1;
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 text-center py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors"
            style={{
              color: active ? 'var(--bg)' : 'var(--fg-muted)',
              backgroundColor: active ? 'var(--accent)' : 'transparent',
              borderRight: !isLast ? '1px solid var(--border)' : 'none',
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
