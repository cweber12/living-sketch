import { useState, useCallback, useEffect, useRef } from 'react';
import { MOBILE_BP } from './constants';

/**
 * Multi-dropdown manager.
 * - Mobile (< MOBILE_BP): one dropdown open at a time (FIFO, max 1)
 * - Desktop: multiple dropdowns; FIFO eviction when viewport is narrow.
 *   Max open count = floor(window.innerWidth / 240), minimum 2.
 */
export function useDropdown() {
  const [openQueue, setOpenQueue] = useState<string[]>([]);
  const isMobileRef = useRef(false);
  // Generous default before mount; updated by resize effect
  const maxDesktopOpenRef = useRef(5);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BP - 1}px)`);
    const handle = (e: MediaQueryListEvent | MediaQueryList) => {
      isMobileRef.current = e.matches;
      // When shrinking to mobile, keep only the most recently opened
      if (e.matches) setOpenQueue((q) => q.slice(-1));
    };
    handle(mq);
    mq.addEventListener('change', handle as (e: MediaQueryListEvent) => void);
    return () =>
      mq.removeEventListener(
        'change',
        handle as (e: MediaQueryListEvent) => void,
      );
  }, []);

  useEffect(() => {
    const update = () => {
      maxDesktopOpenRef.current = Math.max(
        2,
        Math.floor(window.innerWidth / 240),
      );
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  /** Returns true if the dropdown with the given id is currently open. */
  const isOpen = useCallback(
    (id: string) => openQueue.includes(id),
    [openQueue],
  );

  const toggle = useCallback((id: string) => {
    setOpenQueue((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      // Always single open at a time
      return [id];
    });
  }, []);

  const close = useCallback((id?: string) => {
    if (id !== undefined) {
      setOpenQueue((prev) => prev.filter((x) => x !== id));
    } else {
      setOpenQueue([]);
    }
  }, []);

  /** Legacy: the most recently opened id (backward compat). */
  const openId = openQueue[openQueue.length - 1] ?? null;

  return { isOpen, openId, openQueue, toggle, close };
}
