'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

/* ── Types ─────────────────────────────────────────────────────────── */

type ToolbarMode = 'top' | 'side';

interface ToolbarCtxValue {
  mode: ToolbarMode;
  collapsed: boolean;
  isMobile: boolean;
  setPreferSide: (v: boolean) => void;
  setCollapsed: (v: boolean) => void;
}

const ToolbarCtx = createContext<ToolbarCtxValue>({
  mode: 'top',
  collapsed: false,
  isMobile: false,
  setPreferSide: () => {},
  setCollapsed: () => {},
});

interface DropdownPanelProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'left' | 'right';
  width?: number | string;
}

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

/* ── Constants ─────────────────────────────────────────────────────── */
/** Approximate height of the sticky NavBar (px) — toolbar must sit below it */
const NAVBAR_H = 44;
/** Height of the top toolbar in desktop mode (px) */
const TOOLBAR_H = 48;
/** Width of the side toolbar (px) */
const TOOLBAR_W = 56;
/** Height of the mobile bottom toolbar (px) */
const TOOLBAR_H_MOBILE = 56;

/* ── ToolbarLayout ─────────────────────────────────────────────────── */
/**
 * Wrap your PageToolbar + page content inside ToolbarLayout.
 * PageToolbar is position:fixed; ToolbarLayout pads the content area to
 * account for the toolbar's occupied space.
 * On mobile (< 1024 px) the toolbar is always bottom-anchored.
 */
export function ToolbarLayout({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const [preferSide, setPreferSide] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const mode: ToolbarMode =
    !mounted || isMobile ? 'top' : preferSide ? 'side' : 'top';

  // Padding applied to the content area to offset the fixed toolbar
  const contentStyle: React.CSSProperties = isMobile
    ? { paddingBottom: TOOLBAR_H_MOBILE }
    : mode === 'side'
      ? { paddingLeft: collapsed ? 0 : TOOLBAR_W }
      : { paddingTop: collapsed ? 0 : TOOLBAR_H };

  return (
    <ToolbarCtx.Provider
      value={{ mode, collapsed, isMobile, setPreferSide, setCollapsed }}
    >
      {/* Content area — padded to avoid being covered by fixed toolbar */}
      <div
        className={`flex flex-col flex-1 w-full overflow-hidden transition-all duration-200 ${className}`}
        style={contentStyle}
      >
        {/* Filter out PageToolbar children so they can be portalled */}
        {children}
      </div>
    </ToolbarCtx.Provider>
  );
}

/* ── PageToolbar ───────────────────────────────────────────────────── */
export function PageToolbar({ children }: { children: ReactNode }) {
  const { mode, collapsed, isMobile, setPreferSide, setCollapsed } =
    useContext(ToolbarCtx);

  /* ── Side mode ── */
  if (mode === 'side') {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: collapsed ? 0 : TOOLBAR_W,
          zIndex: 40,
          overflow: 'hidden',
          transition: 'width 200ms ease',
          backgroundColor: 'var(--surface)',
          borderRight: '2px solid var(--border-strong)',
        }}
      >
        <div className="flex flex-col h-full">
          {/* Expand button shown when collapsed (side mode) */}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              title="Expand toolbar"
              aria-label="Expand toolbar"
              style={{
                width: TOOLBAR_W,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                background: 'var(--surface-raised)',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              {/* Right arrow — expand sidebar */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 2l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          {!collapsed && (
            <>
              <div className="flex flex-col flex-1 overflow-y-auto">
                {children}
              </div>
              {/* Bottom controls */}
              <button
                onClick={() => setCollapsed(true)}
                title="Collapse toolbar"
                aria-label="Collapse toolbar"
                style={{
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--fg-muted)',
                  background: 'transparent',
                  border: 'none',
                  borderTop: '1px solid var(--border)',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                {/* Left arrow — collapse sidebar */}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M8 2L4 6l4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                onClick={() => setPreferSide(false)}
                title="Switch to top toolbar"
                aria-label="Switch to top toolbar"
                style={{
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--fg-muted)',
                  background: 'transparent',
                  border: 'none',
                  borderTop: '1px solid var(--border)',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="1"
                    y="1"
                    width="10"
                    height="10"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1"
                  />
                  <rect
                    x="1"
                    y="1"
                    width="10"
                    height="4"
                    rx="1.5"
                    fill="currentColor"
                    opacity="0.5"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── Top / bottom mode (mobile = fixed bottom, desktop = fixed top) ── */
  const isBottom = isMobile;
  const toolbarH = isBottom ? TOOLBAR_H_MOBILE : TOOLBAR_H;

  return (
    <div
      style={{
        position: 'fixed',
        ...(isBottom ? { bottom: 0 } : { top: NAVBAR_H }),
        left: 0,
        right: 0,
        height: collapsed && !isBottom ? 0 : toolbarH,
        zIndex: 40,
        overflow: 'hidden',
        transition: isBottom ? 'none' : 'height 200ms ease',
        backgroundColor: 'var(--surface)',
        borderBottom: isBottom ? undefined : '2px solid var(--border-strong)',
        borderTop: isBottom ? '2px solid var(--border-strong)' : undefined,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        overflowX: isBottom ? 'auto' : 'hidden',
        // Safe area for phones with home bar
        paddingBottom: isBottom
          ? 'env(safe-area-inset-bottom, 0px)'
          : undefined,
      }}
    >
      {children}

      {/* Desktop-only: collapse + sidebar controls */}
      {!isBottom && (
        <div className="flex items-stretch ml-auto shrink-0">
          {/* Sidebar toggle */}
          <button
            onClick={() => setPreferSide(true)}
            title="Switch to sidebar"
            aria-label="Switch to sidebar"
            style={{
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--fg-muted)',
              background: 'transparent',
              border: 'none',
              borderLeft: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="1"
                y="1"
                width="10"
                height="10"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1"
              />
              <rect
                x="1"
                y="1"
                width="4"
                height="10"
                rx="1.5"
                fill="currentColor"
                opacity="0.5"
              />
            </svg>
          </button>
          {/* Collapse toggle — up arrow when expanded, down arrow when collapsed */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand toolbar' : 'Collapse toolbar'}
            aria-label={collapsed ? 'Expand toolbar' : 'Collapse toolbar'}
            style={{
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: collapsed ? 'var(--accent)' : 'var(--fg-muted)',
              background: collapsed ? 'var(--surface-raised)' : 'transparent',
              border: 'none',
              borderLeft: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            {/* ↑ when expanded (collapse up), ↓ when collapsed (expand down) */}
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              aria-hidden="true"
            >
              {collapsed ? (
                <path d="M5 8L1 3h8L5 8z" fill="currentColor" />
              ) : (
                <path d="M5 2l4 5H1l4-5z" fill="currentColor" />
              )}
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/* ── DropdownPanel ─────────────────────────────────────────────────── */
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
    const panelWidth = typeof width === 'number' ? width : 280;
    const left =
      align === 'right'
        ? Math.max(0, rect.right - panelWidth)
        : Math.min(rect.left, window.innerWidth - panelWidth);
    // Open upward when anchor is in the bottom half (e.g. mobile bottom bar)
    const openUpward = rect.top > window.innerHeight / 2;
    setStyle({
      position: 'fixed',
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

/* ── ToolbarSection ────────────────────────────────────────────────── */
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
  const [hovered, setHovered] = useState(false);
  const { mode, isMobile } = useContext(ToolbarCtx);
  const isSide = mode === 'side';
  const isOpen = dropdownOpen ?? false;
  const hasDropdown = !!dropdownContent;

  // Accent color for chevron + label on hover or when open
  const accentLabel =
    !primary && !danger && (isOpen || active || hovered)
      ? 'var(--accent)'
      : !primary && !danger
        ? 'var(--fg-muted)'
        : undefined;

  /* ── Side-mode button ── */
  if (isSide) {
    return (
      <div className={`flex items-stretch w-full ${className}`}>
        <button
          ref={btnRef}
          onClick={onClick}
          disabled={disabled}
          title={title ?? label}
          aria-label={ariaLabel ?? label}
          aria-pressed={hasDropdown ? isOpen : undefined}
          aria-expanded={hasDropdown ? isOpen : undefined}
          className={`flex flex-col items-center justify-center gap-1 w-full transition-all duration-150 focus-visible:outline-none${glow ? ' glow-pulse' : ''}`}
          style={{
            padding: '10px 4px 8px',
            border: 'none',
            borderLeft: `2px solid ${isOpen || active ? 'var(--accent)' : 'transparent'}`,
            borderBottom: '1px solid var(--border)',
            borderRadius: 0,
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.4 : 1,
            backgroundColor:
              isOpen || active ? 'var(--surface-raised)' : 'transparent',
            color: primary
              ? 'var(--bg)'
              : isOpen || active
                ? 'var(--accent)'
                : 'var(--fg-muted)',
            ...(primary ? { backgroundColor: 'var(--accent)' } : {}),
            ...(danger ? { color: 'var(--danger)' } : {}),
          }}
        >
          {icon && (
            <span className="leading-none shrink-0" aria-hidden="true">
              {icon}
            </span>
          )}
          {label && (
            <span
              className="font-bold uppercase leading-tight whitespace-nowrap"
              style={{
                writingMode: 'vertical-lr',
                textOrientation: 'mixed',
                fontSize: 8,
                letterSpacing: '0.1em',
              }}
            >
              {label}
            </span>
          )}
        </button>
        {/* No inline content in side mode */}
        {dropdownContent && onDropdownClose && (
          <DropdownPanel
            anchorRef={btnRef}
            open={isOpen}
            onClose={onDropdownClose}
            align="left"
            width={dropdownWidth}
          >
            {dropdownContent}
          </DropdownPanel>
        )}
      </div>
    );
  }

  /* ── Top mode button ── */
  return (
    <div
      className={`flex items-stretch ${!isMobile ? 'flex-1' : ''} ${className}`}
    >
      <button
        ref={btnRef}
        onClick={onClick}
        disabled={disabled}
        title={title ?? label}
        aria-label={ariaLabel ?? label}
        aria-pressed={hasDropdown ? isOpen : undefined}
        aria-expanded={hasDropdown ? isOpen : undefined}
        onMouseEnter={() => !disabled && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`flex flex-col items-center justify-center transition-all duration-150 focus-visible:outline-none${glow ? ' glow-pulse' : ''}`}
        style={{
          padding: isMobile ? '4px 12px' : '4px 10px',
          minWidth: isMobile ? 52 : 44,
          minHeight: isMobile ? 52 : 44,
          gap: label ? 2 : 0,
          border: 'none',
          borderLeft: '1px solid var(--border)',
          borderTop:
            primary || danger
              ? '2px solid transparent'
              : isOpen || active
                ? '2px solid var(--accent)'
                : '2px solid transparent',
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
              : isOpen || active
                ? {
                    backgroundColor: 'var(--surface-raised)',
                    color: 'var(--fg)',
                  }
                : {
                    backgroundColor: 'transparent',
                    color: 'var(--fg-muted)',
                  }),
        }}
      >
        {/* Row 1: chevron + icon side by side */}
        <div className="flex items-center justify-center gap-1">
          {icon && (
            <span
              className="leading-none shrink-0 transition-colors duration-150"
              aria-hidden="true"
              style={{ color: !primary && !danger ? accentLabel : undefined }}
            >
              {icon}
            </span>
          )}
        </div>
        {/* Row 2: label below */}
        <div className="flex flex-row items-center gap-1">
          {hasDropdown && (
            <span
              className="leading-none shrink-0 transition-colors duration-150"
              aria-hidden="true"
              style={{
                fontSize: 7,
                color: accentLabel,
              }}
            >
              {isOpen ? '▲' : '▼'}
            </span>
          )}
          {label && (
            <span
              className="font-bold uppercase tracking-widest leading-tight whitespace-nowrap transition-colors duration-150"
              style={{
                fontSize: isMobile ? 9 : 8,
                color: accentLabel,
              }}
            >
              {label}
            </span>
          )}
        </div>
      </button>

      {/* Inline content: visible on large screens when toolbar is not minimised */}
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
          open={isOpen}
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
