import { type ReactNode } from 'react';

export type ToolbarMode = 'top' | 'side';

export interface ToolbarCtxValue {
  mode: ToolbarMode;
  collapsed: boolean;
  isMobile: boolean;
  disableAutoCollapse: boolean;
  setPreferSide: (v: boolean) => void;
  setCollapsed: (v: boolean) => void;
  /** DOM node above the bottom toolbar for portaling mobile expanded content */
  mobileExpandSlot: HTMLDivElement | null;
  setMobileExpandSlot: (el: HTMLDivElement | null) => void;
}

export interface DropdownPanelProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'left' | 'right';
  width?: number | string;
}

export interface PageToolbarProps {
  children: ReactNode;
  onSave?: () => void;
  onUndo?: () => void;
  onClearAll?: () => void;
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
