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
import {
  ToolbarCtx,
  NAVBAR_H,
  TOOLBAR_H,
  TOOLBAR_W,
  TOOLBAR_H_MOBILE,
} from './toolbar-main';

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
    const panelWidth = typeof width === 'number' ? width : 280;

    if (isMobile) {
      /* ── Mobile: full-width panel above bottom toolbar ── */
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
      /* ── Side mode: panel to the right of the sidebar ── */
      const top = Math.max(NAVBAR_H, rect.top);
      setStyle({
        position: 'fixed',
        top,
        left: TOOLBAR_W,
        minWidth: 260,
        maxWidth: typeof width === 'number' ? width : 360,
        width: width ?? undefined,
        maxHeight: `calc(100vh - ${top + 8}px)`,
        zIndex: 60,
        overflowY: 'auto',
      });
    } else {
      /* ── Top mode: panel below the toolbar row ── */
      const topOffset = NAVBAR_H + TOOLBAR_H;
      const left =
        align === 'right'
          ? Math.max(4, rect.right - panelWidth)
          : Math.min(
              rect.left,
              Math.max(4, window.innerWidth - panelWidth - 4),
            );
      setStyle({
        position: 'fixed',
        top: topOffset,
        left: Math.max(4, left),
        minWidth: 220,
        maxWidth: typeof width === 'number' ? width : 360,
        width: width ?? undefined,
        maxHeight: `calc(100vh - ${topOffset + 8}px)`,
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

  return createPortal(
    <div
      ref={panelRef}
      style={{
        ...style,
        backgroundColor: 'var(--overlay-faint)',
        border: '1px solid var(--border-strong)',
        borderRadius: isMobilePanel
          ? 0
          : isSidePanel
            ? '0 6px 6px 0'
            : '0 0 6px 6px',
        borderLeft: isMobilePanel ? 'none' : undefined,
        borderRight: isMobilePanel ? 'none' : undefined,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}
    >
      <div className="p-3 flex flex-col gap-2">{children}</div>
    </div>,
    document.body,
  );
}
