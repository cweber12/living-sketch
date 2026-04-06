'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

/* ── Types ─────────────────────────────────────────────────────────── */

/* ── useDropdown hook ──────────────────────────────────────────────── */

export function useDropdown() {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = useCallback(
    (id: string) => setOpenId((prev) => (prev === id ? null : id)),
    [],
  );
  const close = useCallback(() => setOpenId(null), []);
  return { openId, toggle, close, setOpenId };
}

/* ── DropdownPanel ─────────────────────────────────────────────────── */

interface DropdownPanelProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'left' | 'right';
  width?: number | string;
}

export function DropdownPanel({
  anchorRef,
  open,
  onClose,
  children,
  align = 'left',
  width,
}: DropdownPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ display: 'none' });
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const measure = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const left =
      align === 'right'
        ? Math.max(0, rect.right - (typeof width === 'number' ? width : 280))
        : Math.min(rect.left, window.innerWidth - 280);
    setStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: Math.max(4, left),
      minWidth: 220,
      maxWidth: typeof width === 'number' ? width : 360,
      width: width ?? undefined,
      zIndex: 60,
      maxHeight: '70vh',
      overflowY: 'auto',
    });
  }, [anchorRef, align, width]);

  useEffect(() => {
    if (!open) return;
    measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, measure]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!mounted || !open) return null;
  return createPortal(
    <div
      ref={panelRef}
      style={{
        ...style,
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: 6,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      <div className="p-3 flex flex-col gap-2">{children}</div>
    </div>,
    document.body,
  );
}

/* ── PageToolbar ───────────────────────────────────────────────────── */

export function PageToolbar({ children }: { children: ReactNode }) {
  return (
    <div
      className="w-full shrink-0 flex flex-row items-stretch overflow-x-auto"
      style={{
        backgroundColor: 'var(--surface)',
        borderBottom: '2px solid var(--border-strong)',
        minHeight: 44,
      }}
    >
      {children}
    </div>
  );
}

/* ── ToolbarSection ────────────────────────────────────────────────── */

interface ToolbarSectionProps {
  icon?: ReactNode;
  label?: string;
  active?: boolean;
  onClick?: () => void;
  /** Inline content shown on large screens beside the section trigger */
  inlineContent?: ReactNode;
  /** Dropdown content */
  dropdownContent?: ReactNode;
  dropdownOpen?: boolean;
  dropdownAlign?: 'left' | 'right';
  dropdownWidth?: number | string;
  onDropdownClose?: () => void;
  /** Additional style for the section wrapper */
  className?: string;
  /** Tooltip/title */
  title?: string;
  /** Danger styling */
  danger?: boolean;
  /** Primary styling (green bg) */
  primary?: boolean;
  /** Disable the button */
  disabled?: boolean;
  /** ARIA label */
  ariaLabel?: string;
  /** Glow animation class */
  glow?: boolean;
}

export function ToolbarSection({
  icon,
  label,
  active,
  onClick,
  inlineContent,
  dropdownContent,
  dropdownOpen,
  dropdownAlign = 'left',
  dropdownWidth,
  onDropdownClose,
  className = '',
  title,
  danger,
  primary,
  disabled,
  ariaLabel,
  glow,
}: ToolbarSectionProps) {
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <div className={`flex items-stretch ${className}`}>
      <button
        ref={btnRef}
        onClick={onClick}
        disabled={disabled}
        title={title ?? label}
        aria-label={ariaLabel ?? label}
        aria-pressed={dropdownContent ? (dropdownOpen ?? false) : undefined}
        aria-expanded={dropdownContent ? (dropdownOpen ?? false) : undefined}
        className={`flex flex-col items-center justify-center gap-0.5 transition-all duration-150 focus-visible:outline-none${glow ? ' glow-pulse' : ''}`}
        style={{
          padding: '4px 10px',
          minWidth: 44,
          minHeight: 44,
          border: 'none',
          borderRight: '1px solid var(--border)',
          borderRadius: 0,
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          ...(primary
            ? {
                backgroundColor: 'var(--accent)',
                color: 'var(--bg)',
              }
            : danger
              ? {
                  backgroundColor: 'transparent',
                  color: 'var(--danger)',
                }
              : active || dropdownOpen
                ? {
                    backgroundColor: 'var(--surface-raised)',
                    color: 'var(--accent)',
                    borderTop: '2px solid var(--accent)',
                  }
                : {
                    backgroundColor: 'transparent',
                    color: 'var(--fg-muted)',
                  }),
        }}
      >
        {icon && (
          <span className="leading-none shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        {label && (
          <span className="text-[8px] font-bold uppercase tracking-widest leading-tight hidden sm:block whitespace-nowrap">
            {label}
          </span>
        )}
      </button>

      {/* Inline content (large screen only) */}
      {inlineContent && (
        <div
          className="hidden md:flex items-center gap-1.5 px-2 shrink-0"
          style={{ borderRight: '1px solid var(--border)' }}
        >
          {inlineContent}
        </div>
      )}

      {/* Dropdown */}
      {dropdownContent && onDropdownClose && (
        <DropdownPanel
          anchorRef={btnRef}
          open={dropdownOpen ?? false}
          onClose={onDropdownClose}
          align={dropdownAlign}
          width={dropdownWidth}
        >
          {dropdownContent}
        </DropdownPanel>
      )}
    </div>
  );
}

/* ── ToolbarSpacer ─────────────────────────────────────────────────── */

export function ToolbarSpacer() {
  return <div className="flex-1" />;
}

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
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            className="flex-1 py-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest transition-all duration-150 focus-visible:outline-none"
            style={{
              ...(isDanger
                ? { backgroundColor: 'var(--danger)', color: '#fff' }
                : active
                  ? {
                      backgroundColor: 'var(--accent)',
                      color: 'var(--bg)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
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
