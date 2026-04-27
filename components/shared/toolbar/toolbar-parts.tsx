'use client';

import {
  useState,
  useRef,
  useEffect,
  useContext,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { ToolbarCtx } from './toolbar-main';
import { DropdownPanel } from './dropdown-panel';
import {
  ACTION_ICON_MIN,
  ACTION_ICON_MIN_MOBILE,
  ACTION_ICON_LABELED_FONT,
  SECTION_LABEL_SIZE,
  SECTION_LABEL_SIZE_MOBILE,
  SECTION_SIDE_PADDING,
  SECTION_SIDE_LABEL_SIZE,
  TOOLBAR_W,
} from './constants';

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
    borderRight: isSide ? 'none' : '1px solid var(--border)',
    background: 'none',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    padding: isMobile ? '6px 12px' : labeledButton ? '4px 12px' : '4px 12px',
    minWidth: isMobile
      ? ACTION_ICON_MIN_MOBILE
      : labeledButton
        ? 'auto'
        : ACTION_ICON_MIN,
    minHeight: isMobile ? ACTION_ICON_MIN_MOBILE : ACTION_ICON_MIN,
    //borderRadius: 3,
    position: 'relative' as const,
    transition:
      'background-color 100ms ease, color 100ms ease, box-shadow 120ms ease, transform 100ms ease',
    ...(danger && active
      ? {
          backgroundColor: 'var(--danger)',
          color: '#fff',
        }
      : active || isOpen
        ? {
            backgroundColor: 'var(--accent)',
            color: 'var(--overlay)',
          }
        : hovered && !disabled
          ? {
              color: danger ? 'var(--danger)' : 'var(--accent)',
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
        className="toolbar-action-btn"
        style={style}
      >
        <span className="shrink-0 leading-none" aria-hidden="true">
          {icon}
        </span>
        {labeledButton && (
          <span
            style={{
              fontSize: ACTION_ICON_LABELED_FONT,
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
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
    color: 'var(--accent)',
    ...(isSide
      ? {
          top: rect.top + rect.height / 2 - 12,
          left: TOOLBAR_W + 6,
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
  const isTopExpanded = !isSide && !isMobile && expanded;

  const style: CSSProperties = {
    justifyContent: isTopExpanded
      ? 'space-between'
      : isSide
        ? 'flex-start'
        : 'center',
    gap: isSide ? 4 : 3,
    padding: isSide ? SECTION_SIDE_PADDING : isMobile ? '4px 10px' : '4px 8px',
    minWidth: isMobile ? ACTION_ICON_MIN_MOBILE : 'auto',
    minHeight: isMobile ? ACTION_ICON_MIN_MOBILE : 'auto',
    width: isTopExpanded || isSide ? '100%' : 'auto',
    background: expanded || hovered ? 'var(--surface-raised)' : 'transparent',
    color: expanded || hovered ? 'var(--fg)' : 'var(--fg-muted)',
    borderBottom: isTopExpanded ? '1px solid var(--border)' : 'none',
  };

  return (
    <button
      onClick={onToggle}
      title={expanded ? `Collapse ${label}` : `Expand ${label}`}
      aria-label={`${label} section`}
      aria-expanded={expanded}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="toolbar-label focus-visible:outline-none"
      style={style}
    >
      {isMobile ? (
        // Mobile: text label only, no icon
        <span style={{ fontSize: SECTION_LABEL_SIZE_MOBILE }}>{label}</span>
      ) : isSide ? (
        <span style={{ fontSize: SECTION_SIDE_LABEL_SIZE }}>{label}</span>
      ) : (
        // Top not expanded: text label
        <span style={{ fontSize: SECTION_LABEL_SIZE }}>{label}</span>
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
      style={
        isSide
          ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }
          : {
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
            }
      }
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
  const { mode, isMobile, mobileExpandSlot } = useContext(ToolbarCtx);
  const isSide = mode === 'side';
  // In mobile: stay row (expanded icons go to portal above toolbar)
  const isColumn = !isMobile && (isSide || expanded);

  return (
    <div
      data-toolbar-group
      style={{
        display: 'flex',
        flexDirection: isColumn ? 'column' : 'row',
        alignItems: 'stretch',
        borderRight: '1px solid var(--border)',
      }}
    >
      <SectionLabel
        icon={icon}
        label={label}
        expanded={expanded}
        onToggle={onToggle}
      />
      {/* Desktop: inline action icons */}
      {!isMobile && (
        <ActionIconsRow expanded={expanded}>{children}</ActionIconsRow>
      )}
      {/* Mobile: portal action icons into the slot above the toolbar */}
      {isMobile &&
        expanded &&
        mobileExpandSlot != null &&
        createPortal(
          <div
            style={{
              width: '100%',
              backgroundColor: 'var(--surface-inset)',
              borderTop: '2px solid var(--border)',
              boxShadow: '0 -4px 24px rgba(0,0,0,0.28)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Minimize tab on the upper edge */}
            <button
              onClick={onToggle}
              aria-label="Collapse section"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: 28,
                border: 'none',
                borderBottom: '1px solid var(--border)',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--fg-muted)',
                flexShrink: 0,
              }}
            >
              <svg
                width="20"
                height="12"
                viewBox="0 0 20 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M2 2l8 8 8-8"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            {/* Action icons */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'stretch',
                padding: '4px',
              }}
            >
              {children}
            </div>
          </div>,
          mobileExpandSlot,
        )}
    </div>
  );
}
