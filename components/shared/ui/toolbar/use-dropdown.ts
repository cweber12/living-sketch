import { useState, useCallback, useEffect, useRef } from 'react';

const MOBILE_BP = 1024;

/**
 * Multi-dropdown manager.
 * - Mobile (< 1024 px): only one dropdown open at a time (oldest evicted on overflow)
 * - Desktop: multiple dropdowns can be open simultaneously
 */
export function useDropdown() {
  const [openQueue, setOpenQueue] = useState<string[]>([]);
  const isMobileRef = useRef(false);

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

  /** Returns true if the dropdown with the given id is currently open. */
  const isOpen = useCallback(
    (id: string) => openQueue.includes(id),
    [openQueue],
  );

  const toggle = useCallback((id: string) => {
    setOpenQueue((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (isMobileRef.current) {
        // Mobile: only one open at a time
        return [id];
      }
      // Desktop: allow all open simultaneously
      return [...prev, id];
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
