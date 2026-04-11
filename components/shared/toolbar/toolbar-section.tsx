'use client';

import { useState, useRef, useContext } from 'react';
import { ToolbarCtx } from './toolbar-main';
import { DropdownPanel } from './dropdown-panel';
import { ToolbarSectionProps } from './types';
import { cn } from '@/lib/cn';
import {
  SECTION_PADDING,
  SECTION_PADDING_MOBILE,
  SECTION_MIN_W_MOBILE,
  SECTION_MIN_H_MOBILE,
} from './constants';

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
      <div className={cn('flex w-full items-stretch', className)}>
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
          className={cn(
            'flex w-full flex-col items-center justify-center gap-1 transition-all duration-150 focus-visible:outline-none',
            glow && 'glow-pulse',
          )}
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
            <span className="shrink-0 leading-none" aria-hidden="true">
              {icon}
            </span>
          )}
          {label && (
            <span
              className="leading-tight font-bold whitespace-nowrap uppercase"
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
    <div className={cn('flex w-full items-stretch', className)}>
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
        className={cn(
          'flex items-center justify-center transition-all duration-150 focus-visible:outline-none',
          glow && 'glow-pulse',
        )}
        style={{
          padding: isMobile ? SECTION_PADDING_MOBILE : SECTION_PADDING,
          minWidth: isMobile ? SECTION_MIN_W_MOBILE : 'auto',
          minHeight: isMobile ? SECTION_MIN_H_MOBILE : 'auto',
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
            className="leading-tight font-bold tracking-widest whitespace-nowrap uppercase transition-colors duration-150"
            style={{ fontSize: isMobile ? 9 : 8 }}
          >
            {label}
          </span>
        )}
        {icon && (
          <span className="shrink-0 leading-none" aria-hidden="true">
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
