import { type ReactNode } from 'react';

export type ToolbarMode = 'top' | 'side';

export interface ToolbarCtxValue {
  mode: ToolbarMode;
  collapsed: boolean;
  isMobile: boolean;
  setPreferSide: (v: boolean) => void;
  setCollapsed: (v: boolean) => void;
}

export interface DropdownPanelProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'left' | 'right';
  width?: number | string;
}

export interface ToolbarSectionProps {
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
