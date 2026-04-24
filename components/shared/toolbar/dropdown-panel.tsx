'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useContext,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';
import { DropdownPanelProps } from './types';
import { ToolbarCtx } from './toolbar-main';
import {
  NAVBAR_H,
  TOOLBAR_H,
  TOOLBAR_W,
  TOOLBAR_H_MOBILE,
  DROPDOWN_MIN_W,
  DROPDOWN_MAX_W,
  DROPDOWN_MIN_W_SIDE,
} from './constants';

/* ── DropdownPanel ─────────────────────────────────────────────────── */
export function DropdownPanel({
  anchorRef,
  open,
  onClose,
  children,
  align = 'left',
  width,
}: DropdownPanelProps) {
  const { mode, isMobile } = useContext(ToolbarCtx);
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ display: 'none' });
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const measure = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const panelWidth = typeof width === 'number' ? width : DROPDOWN_MIN_W;

    if (isMobile) {
      /* ── Mobile: full-width panel flush with top of bottom toolbar ── */
      setStyle({
        position: 'fixed',
        bottom: TOOLBAR_H_MOBILE,
        left: 0,
        right: 0,
        maxHeight: '65vh',
        zIndex: 60,
        overflowY: 'auto',
      });
    } else if (mode === 'side') {
      /* ── Side mode: panel flush with the right edge of the sidebar ── */
      const top = Math.max(NAVBAR_H, rect.top);
      setStyle({
        position: 'fixed',
        top,
        left: TOOLBAR_W,
        minWidth: DROPDOWN_MIN_W_SIDE,
        maxWidth: typeof width === 'number' ? width : DROPDOWN_MAX_W,
        width: width ?? undefined,
        maxHeight: `calc(100vh - ${top + 8}px)`,
        zIndex: 60,
        overflowY: 'auto',
      });
    } else {
      /* ── Top mode: panel flush with the bottom edge of the toolbar ── */
      const toolbarBottom = NAVBAR_H + TOOLBAR_H;
      const left =
        align === 'right' ? Math.max(0, rect.right - panelWidth) : rect.left;
      setStyle({
        position: 'fixed',
        top: toolbarBottom,
        left: Math.min(Math.max(0, left), window.innerWidth - panelWidth - 4),
        minWidth: DROPDOWN_MIN_W,
        maxWidth: typeof width === 'number' ? width : DROPDOWN_MAX_W,
        width: width ?? undefined,
        maxHeight: `calc(100vh - ${toolbarBottom + 8}px)`,
        zIndex: 60,
        overflowY: 'auto',
      });
    }
  }, [anchorRef, align, width, mode, isMobile]);

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
      const el = t instanceof Element ? t : t.parentElement;
      if (el?.closest?.('[data-toolbar]')) return;
      if (el?.closest?.('[data-toolbar-panel]')) return;
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

  const isMobilePanel = isMobile;
  const isSidePanel = !isMobile && mode === 'side';
  // Top-mode panel: appears BELOW the toolbar — no top border (flush with toolbar bottom)
  // Side-mode panel: appears RIGHT of sidebar — no left border (flush with sidebar right edge)
  // Mobile panel: appears ABOVE the bottom toolbar — no bottom border (flush with toolbar top)
  const borderTop = isSidePanel ? '1px solid var(--border-strong)' : 'none';
  const borderLeft = isSidePanel ? 'none' : '1px solid var(--border-strong)';
  const borderRight = '1px solid var(--border-strong)';
  const borderBottom = isMobilePanel
    ? 'none'
    : '1px solid var(--border-strong)';

  return createPortal(
    <div
      ref={panelRef}
      data-toolbar-panel
      style={{
        ...style,
        backgroundColor: 'var(--surface-raised)',
        borderTop,
        borderLeft,
        borderRight,
        borderBottom,
        borderRadius: isMobilePanel
          ? 0
          : isSidePanel
            ? '0 6px 6px 0'
            : '0 0 6px 6px',
      }}
    >
      <div
        className="flex flex-col gap-2 p-3"
        style={{
          overflowY: 'auto',
          maxHeight: style.maxHeight,
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
