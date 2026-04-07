import { useState, useCallback } from 'react';

/* ── useDropdown hook ──────────────────────────────────────────────── */
export function useDropdown() {
  const [openId, setOpenId] = useState<string | null>(null);
  const toggle = useCallback(
    (id: string) => setOpenId((prev) => (prev === id ? null : id)),
    [],
  );
  const close = useCallback(() => setOpenId(null), []);
  return { openId, toggle, close, setOpenId };
}
