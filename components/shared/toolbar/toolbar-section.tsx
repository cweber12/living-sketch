'use client';

import { useState, useRef, useContext } from 'react';
import { ToolbarCtx, SectionOrderCtx } from './toolbar-main';
import { DropdownPanel } from './dropdown-panel';
import { ToolbarSectionProps } from './types';

/* â”€â”€ Inline SVG chevrons (avoid broken JSX attrs in chevron.tsx) â”€â”€â”€ */
function ChevronDown() {
  return (
    <svg
      data-testid="toolbar-section-chevron"
      width="9"
      height="9"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 3.5L5 6.5L8 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronUp() {
  return (
    <svg
      data-testid="toolbar-section-chevron"
      width="9"
      height="9"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 6.5L5 3.5L2 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* â”€â”€ ToolbarSection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export function ToolbarSection({
  icon,
  label,
  active,
  onClick,
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
  const sectionOrderRef = useContext(SectionOrderCtx);
  const isSide = mode === 'side';
  const isOpen = dropdownOpen ?? false;
  const hasDropdown = !!dropdownContent;

  /* Capture render-order index for CSS `order` in the shared dropdown row.
     PageToolbar resets the counter each render; children increment in order. */
  // eslint-disable-next-line react-hooks/refs
  const dropdownOrder = sectionOrderRef.current++;

  /* Active = section open OR explicitly active OR primary */
  const isHighlighted = isOpen || active || primary;

  /* Compute button styles */
  const buttonStyle = (): React.CSSProperties => {
    if (primary) {
      return { backgroundColor: 'var(--accent)', color: 'var(--bg)' };
    }
    if (danger) {
      return {
        backgroundColor: hovered ? 'var(--surface-hover)' : 'transparent',
        color: 'var(--danger)',
      };
    }
    if (isHighlighted) {
      return { backgroundColor: 'var(--accent)', color: 'var(--bg)' };
    }
    if (hovered) {
      return { backgroundColor: 'var(--overlay-faint)', color: 'var(--fg)' };
    }
    return { backgroundColor: 'transparent', color: 'var(--fg-muted)' };
  };

  /* â”€â”€ Side-mode button â”€â”€ */
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
          onMouseEnter={() => !disabled && setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`flex flex-col items-center justify-center gap-1 w-full transition-all duration-150 focus-visible:outline-none${glow ? ' glow-pulse' : ''}`}
          style={{
            padding: '6px 4px 4px',
            border: 'none',
            borderBottom: '1px solid var(--border)',
            borderRadius: 0,
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.4 : 1,
            ...buttonStyle(),
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
        {dropdownContent && onDropdownClose && (
          <DropdownPanel
            anchorRef={btnRef}
            open={isOpen}
            onClose={onDropdownClose}
            align="left"
            width={dropdownWidth}
            order={dropdownOrder}
          >
            {dropdownContent}
          </DropdownPanel>
        )}
      </div>
    );
  }

  /* â”€â”€ Top / mobile mode button â”€â”€ */
  return (
    <div className={`flex items-stretch ${className}`}>
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
        className={`flex items-center justify-center transition-all duration-150 focus-visible:outline-none${glow ? ' glow-pulse' : ''}`}
        style={{
          padding: isMobile ? '4px 12px' : '4px 10px',
          minWidth: isMobile ? 52 : 'auto',
          minHeight: isMobile ? 52 : 'auto',
          gap: 4,
          border: 'none',
          borderLeft: '1px solid var(--border)',
          borderRadius: 0,
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          ...buttonStyle(),
        }}
      >
        {/* Layout: [chevron] [label] [icon] */}
        {hasDropdown && (
          <span className="leading-none shrink-0" aria-hidden="true">
            {isOpen ? <ChevronUp /> : <ChevronDown />}
          </span>
        )}
        {label && (
          <span
            className="font-bold uppercase tracking-widest leading-tight whitespace-nowrap transition-colors duration-150"
            style={{ fontSize: isMobile ? 9 : 8 }}
          >
            {label}
          </span>
        )}
        {icon && (
          <span className="leading-none shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {dropdownContent && onDropdownClose && (
        <DropdownPanel
          anchorRef={btnRef}
          open={isOpen}
          onClose={onDropdownClose}
          align={dropdownAlign}
          width={dropdownWidth}
          order={dropdownOrder}
        >
          {dropdownContent}
        </DropdownPanel>
      )}
    </div>
  );
}
