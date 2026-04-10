import { useState, useCallback, useEffect, useRef } from 'react';
import { MOBILE_BP } from './constants';

/**
 * Manages which ToolbarGroup sections are expanded.
 * - Desktop (≥ MOBILE_BP): all sections expanded by default.
 * - Mobile (< MOBILE_BP): only one section expanded at a time.
 */
export function useSectionExpand(sectionIds: string[]) {
  const isMobileRef = useRef(false);
  const [expandedSet, setExpandedSet] = useState<Set<string>>(
    () => new Set(sectionIds),
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BP - 1}px)`);
    const handle = (e: MediaQueryListEvent | MediaQueryList) => {
      isMobileRef.current = e.matches;
      if (e.matches) {
        // On mobile, collapse all but the first
        setExpandedSet(new Set());
      } else {
        // On desktop, expand all
        setExpandedSet(new Set(sectionIds));
      }
    };
    handle(mq);
    mq.addEventListener('change', handle as (e: MediaQueryListEvent) => void);
    return () =>
      mq.removeEventListener(
        'change',
        handle as (e: MediaQueryListEvent) => void,
      );
    // sectionIds should be stable; avoid re-running
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isExpanded = useCallback(
    (id: string) => expandedSet.has(id),
    [expandedSet],
  );

  const toggle = useCallback((id: string) => {
    setExpandedSet((prev) => {
      if (prev.has(id)) {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      if (isMobileRef.current) {
        // Mobile: only one at a time
        return new Set([id]);
      }
      // Desktop: toggle on
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  return { isExpanded, toggle };
}
