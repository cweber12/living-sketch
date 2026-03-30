'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/sketch', label: 'Sketch' },
  { href: '/capture', label: 'Capture' },
  { href: '/console', label: 'Animate' },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 w-full">
      {TABS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 text-center py-1.5 rounded text-xs font-semibold uppercase tracking-widest transition-colors"
            style={{
              color: active ? 'var(--bg)' : 'var(--fg-muted)',
              backgroundColor: active ? 'var(--accent)' : 'transparent',
              borderBottom: active ? 'none' : '1px solid transparent',
            }}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
