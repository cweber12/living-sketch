'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

type Anchor = 'right' | 'bottom' | 'top';

interface PopoverProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  anchor?: Anchor;
  width?: number;
  children: ReactNode;
}

/**
 * Lightweight portalled popover used by the sketch tool rail / header.
 * Auto-positions next to its anchor, closes on outside click and Escape,
 * and re-measures on resize/scroll.
 */
export function Popover({
  anchorRef,
  open,
  onClose,
  anchor = 'right',
  width = 220,
  children,
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({ display: 'none' });
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (anchor === 'right') {
        const top = Math.min(Math.max(8, r.top), vh - 16);
        const left = Math.min(r.right + 8, vw - width - 8);
        setStyle({ position: 'fixed', top, left, width, zIndex: 60 });
      } else if (anchor === 'bottom') {
        const left = Math.min(Math.max(8, r.left), vw - width - 8);
        setStyle({
          position: 'fixed',
          top: r.bottom + 6,
          left,
          width,
          zIndex: 60,
        });
      } else {
        const left = Math.min(Math.max(8, r.left), vw - width - 8);
        setStyle({
          position: 'fixed',
          bottom: vh - r.top + 6,
          left,
          width,
          zIndex: 60,
        });
      }
    };
    measure();
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, anchorRef, anchor, width]);

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

  return createPortal(
    <div
      ref={panelRef}
      style={{
        ...style,
        backgroundColor: 'var(--surface-raised)',
        border: '1px solid var(--border-strong)',
        borderRadius: 6,
        boxShadow: '0 6px 20px rgba(0,0,0,0.18), 0 0 0 1px var(--accent-faint)',
        padding: 10,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
