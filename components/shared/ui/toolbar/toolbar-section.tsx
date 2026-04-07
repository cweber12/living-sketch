'use client';

import { useState, useRef, useContext } from 'react';
import { ToolbarCtx } from './toolbar';
import { DropdownPanel } from './dropdown-panel';
import { ToolbarSectionProps } from './types';

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
          {hasDropdown && !isMobile && (
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
