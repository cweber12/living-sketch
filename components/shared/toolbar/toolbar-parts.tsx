'use client';

import {
  useState,
  useRef,
  useEffect,
  useContext,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { ToolbarCtx } from './toolbar-main';
import { DropdownPanel } from './dropdown-panel';

/* ── ActionIcon ─────────────────────────────────────────────────────── */

export interface ActionIconProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  /** Open a ControlDropdown when clicked */
  dropdownContent?: ReactNode;
  dropdownOpen?: boolean;
  onDropdownClose?: () => void;
  dropdownAlign?: 'left' | 'right';
  dropdownWidth?: number | string;
  /** Replace icon-only button with a labeled button (e.g. Collection section) */
  labeledButton?: boolean;
}

export function ActionIcon({
  icon,
  label,
  onClick,
  active,
  danger,
  disabled,
  dropdownContent,
  dropdownOpen,
  onDropdownClose,
  dropdownAlign = 'left',
  dropdownWidth,
  labeledButton,
}: ActionIconProps) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const { isMobile, mode } = useContext(ToolbarCtx);
  const isSide = mode === 'side';
  const isOpen = dropdownOpen ?? false;

  const style: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: labeledButton ? 4 : 0,
    border: 'none',
    background: 'none',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    padding: isMobile ? '6px 8px' : labeledButton ? '4px 8px' : '4px 6px',
    minWidth: isMobile ? 44 : labeledButton ? 'auto' : 28,
    minHeight: isMobile ? 44 : 28,
    borderRadius: 3,
    position: 'relative' as const,
    transition:
      'background-color 100ms ease, color 100ms ease, box-shadow 120ms ease',
    ...(danger && active
      ? {
          backgroundColor: 'var(--danger)',
          color: '#fff',
          boxShadow: '0 0 12px rgba(138,43,36,0.5)',
        }
      : active || isOpen
        ? {
            backgroundColor: 'var(--surface-inset)',
            color: 'var(--accent)',

            borderBottom: isSide ? 'none' : '2px solid var(--accent)',
            borderRight: isSide ? '1px solid var(--accent)' : 'none',
          }
        : hovered && !disabled
          ? {
              backgroundColor: 'var(--surface-raised)',
              color: danger ? 'var(--danger)' : 'var(--fg)',
              boxShadow: danger
                ? '0 0 8px rgba(138,43,36,0.3)'
                : '0 0 8px var(--accent-glow)',
            }
          : {
              color: danger ? 'var(--fg-muted)' : 'var(--fg-muted)',
            }),
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={onClick}
        disabled={disabled}
        title={label}
        aria-label={label}
        aria-pressed={active}
        aria-expanded={dropdownContent ? isOpen : undefined}
        onMouseEnter={() => {
          if (!disabled) setHovered(true);
          if (!isMobile) setShowTooltip(true);
        }}
        onMouseLeave={() => {
          setHovered(false);
          setShowTooltip(false);
        }}
        className="focus-visible:outline-none"
        style={style}
      >
        <span className="leading-none shrink-0" aria-hidden="true">
          {icon}
        </span>
        {labeledButton && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        )}
      </button>

      {/* Tooltip — fixed position, no layout shift */}
      {showTooltip && !isOpen && !labeledButton && (
        <Tooltip anchorRef={btnRef} label={label} isSide={isSide} />
      )}

      {/* ControlDropdown */}
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
    </>
  );
}

/* ── Tooltip ────────────────────────────────────────────────────────── */

function Tooltip({
  anchorRef,
  label,
  isSide,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  label: string;
  isSide: boolean;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const el = anchorRef.current;
    if (el) setRect(el.getBoundingClientRect());
  }, [anchorRef]);

  if (!rect) return null;

  const tooltipStyle: CSSProperties = {
    position: 'fixed',
    zIndex: 70,
    pointerEvents: 'none',
    padding: '3px 7px',
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
    color: 'var(--fg)',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
    ...(isSide
      ? {
          top: rect.top + rect.height / 2 - 12,
          left: rect.right + 6,
        }
      : {
          top: rect.bottom + 4,
          left: rect.left + rect.width / 2,
          transform: 'translateX(-50%)',
        }),
  };

  return <div style={tooltipStyle}>{label}</div>;
}

/* ── SectionLabel ───────────────────────────────────────────────────── */

export interface SectionLabelProps {
  icon: ReactNode;
  label: string;
  expanded: boolean;
  onToggle: () => void;
}

export function SectionLabel({
  icon,
  label,
  expanded,
  onToggle,
}: SectionLabelProps) {
  const [hovered, setHovered] = useState(false);
  const { mode, isMobile } = useContext(ToolbarCtx);
  const isSide = mode === 'side';

  const style: CSSProperties = {
    display: 'flex',
    alignItems: isSide ? 'center' : 'center',
    justifyContent: 'center',
    flexDirection: isSide ? 'column' : 'row',
    gap: 3,
    border: 'none',
    cursor: 'pointer',
    padding: isSide ? '6px 4px' : isMobile ? '4px 10px' : '4px 8px',
    minWidth: isMobile ? 44 : 'auto',
    minHeight: isMobile ? 44 : 'auto',
    borderRadius: 0,
    transition:
      'background-color 100ms ease, color 100ms ease, box-shadow 120ms ease',
    ...(expanded
      ? {
          backgroundColor: 'var(--surface-raised)',
          color: 'var(--accent)',
          boxShadow: 'inset 0 -2px 0 var(--accent)',
        }
      : hovered
        ? {
            backgroundColor: 'var(--surface-raised)',
            color: 'var(--accent)',
          }
        : hovered
          ? {
              backgroundColor: 'var(--surface-raised)',
              color: 'var(--accent)',
            }
          : {
              backgroundColor: 'transparent',
              color: 'var(--fg)',
            }),
  };

  return (
    <button
      onClick={onToggle}
      title={expanded ? `Collapse ${label}` : `Expand ${label}`}
      aria-label={`${label} section`}
      aria-expanded={expanded}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="focus-visible:outline-none shrink-0"
      style={style}
    >
      {isMobile ? (
        <span className="leading-none shrink-0" aria-hidden="true">
          {icon}
        </span>
      ) : (
        <span
          style={{
            fontSize: isSide ? 7 : isMobile ? 9 : 8,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap',
            ...(isSide
              ? {
                  writingMode: 'vertical-lr',
                  textOrientation: 'mixed',
                }
              : {}),
          }}
        >
          {label}
        </span>
      )}
    </button>
  );
}

/* ── ActionIconsRow ─────────────────────────────────────────────────── */

export interface ActionIconsRowProps {
  expanded: boolean;
  children: ReactNode;
}

export function ActionIconsRow({ expanded, children }: ActionIconsRowProps) {
  const { mode, isMobile } = useContext(ToolbarCtx);
  const isSide = mode === 'side';

  if (!expanded) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isSide ? 'column' : 'row',
        alignItems: 'stretch',
        gap: isMobile ? 2 : 1,
      }}
    >
      {children}
    </div>
  );
}

/* ── ToolbarGroup ───────────────────────────────────────────────────── */

export interface ToolbarGroupProps {
  icon: ReactNode;
  label: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * Composes SectionLabel + ActionIconsRow.
 * In side mode: label on top, icons column below.
 * In top/mobile mode: label left, icons row right.
 */
export function ToolbarGroup({
  icon,
  label,
  expanded,
  onToggle,
  children,
}: ToolbarGroupProps) {
  const { mode } = useContext(ToolbarCtx);
  const isSide = mode === 'side';

  return (
    <div
      data-toolbar-group
      style={{
        display: 'flex',
        flexDirection: isSide ? 'column' : 'row',
        alignItems: 'stretch',
        borderBottom: isSide ? 'none' : '1px solid var(--border)',
        borderRight: isSide ? '1px solid var(--border)' : 'none',
      }}
    >
      <SectionLabel
        icon={icon}
        label={label}
        expanded={expanded}
        onToggle={onToggle}
      />
      <ActionIconsRow expanded={expanded}>{children}</ActionIconsRow>
    </div>
  );
}
