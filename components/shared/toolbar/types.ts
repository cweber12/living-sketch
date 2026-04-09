import { type ReactNode } from 'react';

export type ToolbarMode = 'top' | 'side';

export interface ToolbarCtxValue {
  mode: ToolbarMode;
  collapsed: boolean;
  isMobile: boolean;
  disableAutoCollapse: boolean;
  setPreferSide: (v: boolean) => void;
  setCollapsed: (v: boolean) => void;
}

export interface DropdownPanelProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  header?: string;
  align?: 'left' | 'right';
  width?: number | string;
  /** CSS flexbox order for shared dropdown row (desktop top mode) */
  order?: number;
}

export interface PageToolbarProps {
  children: ReactNode;
  onSave?: () => void;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  saveDisabled?: boolean;
}

export interface ToolbarSectionProps {
  icon?: ReactNode;
  label?: string;
  active?: boolean;
  onClick?: () => void;
  /** @deprecated inline content is no longer rendered; move content to dropdownContent */
  inlineContent?: ReactNode;
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
