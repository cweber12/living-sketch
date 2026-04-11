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
      /* ── Mobile: full-width panel above bottom toolbar ── */
      setStyle({
        position: 'fixed',
        bottom: TOOLBAR_H_MOBILE + 2,
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
        left: TOOLBAR_W + 2,
        minWidth: DROPDOWN_MIN_W_SIDE,
        maxWidth: typeof width === 'number' ? width : DROPDOWN_MAX_W,
        width: width ?? undefined,
        maxHeight: `calc(100vh - ${top + 8}px)`,
        zIndex: 60,
        overflowY: 'auto',
      });
    } else {
      /* ── Top mode: placed below the anchor button ── */
      const topOffset = rect.bottom + 2;
      const left =
        align === 'right' ? Math.max(0, rect.right - panelWidth) : rect.left;
      setStyle({
        position: 'fixed',
        top: topOffset,
        left: Math.min(Math.max(0, left), window.innerWidth - panelWidth - 4),
        minWidth: DROPDOWN_MIN_W,
        maxWidth: typeof width === 'number' ? width : DROPDOWN_MAX_W,
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

  return createPortal(
    <div
      ref={panelRef}
      data-toolbar-panel
      style={{
        ...style,
        backgroundColor: 'var(--surface)',
        borderBottom: `1px solid var(--border-strong)`,
        borderLeft: isMobilePanel ? 'none' : '1px solid var(--border-strong)',
        borderRight: isMobilePanel ? 'none' : '1px solid var(--border-strong)',
        borderRadius: isMobilePanel
          ? 0
          : isSidePanel
            ? '0 6px 6px 0'
            : '0 0 6px 6px',
        boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 20px var(--accent-glow)',
        // Don't use overflow:hidden — it clips range input thumbs.
        // Let the inner scroll container handle vertical overflow.
      }}
    >
      <div
        className="p-3 flex flex-col gap-2"
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
