'use client';

import { forwardRef, useState, type ReactNode } from 'react';

interface RailButtonProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  shortcut?: string;
  size?: number;
  badge?: ReactNode;
}

/**
 * Square icon button used by the tool rail and the operating header.
 * Active state fills with the theme accent (or danger when `danger` set).
 * No portals, no dropdowns — keep this primitive dumb. Anchor a Popover
 * separately when an inline panel is needed.
 */
export const RailButton = forwardRef<HTMLButtonElement, RailButtonProps>(
  function RailButton(
    {
      icon,
      label,
      active = false,
      danger = false,
      disabled = false,
      onClick,
      shortcut,
      size = 40,
      badge,
    },
    ref,
  ) {
    const [hovered, setHovered] = useState(false);

    const bg = active
      ? danger
        ? 'var(--danger)'
        : 'var(--accent)'
      : hovered && !disabled
        ? 'var(--surface-hover)'
        : 'transparent';

    const color = active
      ? danger
        ? '#fff'
        : 'var(--bg)'
      : hovered && !disabled
        ? danger
          ? 'var(--danger)'
          : 'var(--fg)'
        : 'var(--fg-muted)';

    return (
      <button
        ref={ref}
        onClick={onClick}
        disabled={disabled}
        title={shortcut ? `${label}  (${shortcut})` : label}
        aria-label={label}
        aria-pressed={active}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: bg,
          color,
          cursor: disabled ? 'not-allowed' : 'pointer',
          borderRadius: 6,
          opacity: disabled ? 0.4 : 1,
          position: 'relative',
          transition:
            'background-color 120ms var(--ease-ui), color 120ms var(--ease-ui)',
          flexShrink: 0,
        }}
      >
        <span className="leading-none" aria-hidden="true">
          {icon}
        </span>
        {badge != null && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: 3,
              bottom: 2,
              fontSize: 9,
              fontFamily: 'var(--font-geist-mono), monospace',
              fontVariantNumeric: 'tabular-nums',
              color: active
                ? danger
                  ? '#fff'
                  : 'var(--bg)'
                : 'var(--fg-muted)',
              pointerEvents: 'none',
            }}
          >
            {badge}
          </span>
        )}
      </button>
    );
  },
);
