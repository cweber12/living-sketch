'use client';

import { useState, useRef, useContext } from 'react';
import { ToolbarCtx } from './toolbar-main';
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
  const isSide = mode === 'side';
  const isOpen = dropdownOpen ?? false;
  const hasDropdown = !!dropdownContent;

  /* Active = section open OR explicitly active OR primary */
  const isHighlighted = isOpen || active || primary;

  /* Compute button styles */
  const buttonStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      transition:
        'background-color 100ms ease, color 100ms ease, box-shadow 120ms ease',
    };
    if (primary) {
      return {
        ...base,
        backgroundColor: 'var(--accent)',
        color: 'var(--bg)',
        boxShadow:
          'inset 0 2px 8px rgba(0,0,0,0.3), 0 0 20px var(--accent-glow)',
      };
    }
    if (danger) {
      return {
        ...base,
        color: hovered ? 'var(--danger)' : 'var(--fg-muted)',
        boxShadow: hovered
          ? '0 0 10px rgba(239,68,68,0.35), inset 0 1px 0 rgba(255,255,255,0.04)'
          : '',
      };
    }
    if (isHighlighted) {
      return {
        ...base,
        backgroundColor: 'var(--accent)',
        color: 'var(--bg)',
        boxShadow:
          'inset 0 2px 8px rgba(0,0,0,0.3), 0 0 20px var(--accent-glow)',
      };
    }
    if (hovered) {
      return {
        ...base,
        backgroundColor: 'var(--surface-raised)',
        color: 'var(--fg)',
        boxShadow:
          '0 0 10px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.06)',
      };
    }
    return {
      ...base,
      backgroundColor: 'var(--surface)',
      color: 'var(--fg-muted)',
      boxShadow:
        'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.2)',
    };
  };

  /* Side-mode button */
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
          >
            {dropdownContent}
          </DropdownPanel>
        )}
      </div>
    );
  }

  /* Top / mobile mode button */
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
        >
          {dropdownContent}
        </DropdownPanel>
      )}
    </div>
  );
}
