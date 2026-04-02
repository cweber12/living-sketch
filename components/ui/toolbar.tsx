'use client';

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useId,
  type ReactNode,
} from 'react';

/* ── Accordion context: ensures only one section is open at a time ── */
interface AccordionCtx {
  openId: string | null;
  setOpenId: (id: string | null) => void;
}
const AccordionContext = createContext<AccordionCtx | null>(null);

const MOBILE_BP = 1024;

export type ToolbarMode = 'side' | 'top';

interface ToolbarProps {
  children: ReactNode;
  /** Width in px when in side mode (default 224) */
  sideWidth?: number;
  /** Called whenever the toolbar switches between side / top modes */
  onModeChange?: (mode: ToolbarMode) => void;
}

/**
 * Responsive toolbar: left sidebar on desktop, collapsible top bar on mobile.
 * Desktop can toggle between side and top mode via a small icon.
 */
export function Toolbar({
  children,
  sideWidth = 224,
  onModeChange,
}: ToolbarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [preferSide, setPreferSide] = useState(true);
  const [open, setOpen] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BP - 1}px)`);
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const mode: ToolbarMode = isMobile ? 'top' : preferSide ? 'side' : 'top';

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  const toggleMode = useCallback(() => setPreferSide((p) => !p), []);
  const toggleOpen = useCallback(() => setOpen((o) => !o), []);

  /* ── Top bar mode (mobile always, desktop optional) ─────────────── */
  if (mode === 'top') {
    return (
      <AccordionContext.Provider value={{ openId, setOpenId }}>
        <div
          className="w-full flex flex-col shrink-0"
          style={{
            borderBottom: '2px solid var(--border-strong)',
            backgroundColor: 'var(--surface)',
          }}
        >
          {/* Collapsible content area */}
          <div
            className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
            style={{
              maxHeight: open ? 2000 : 0,
            }}
          >
            <div className="flex flex-wrap items-start gap-x-5 gap-y-3 px-4 py-3">
              {children}
            </div>
          </div>

          {/* Toggle strip */}
          <div
            className="flex items-center justify-between h-7 px-3"
            style={{
              borderTop: open ? '1px solid var(--border)' : 'none',
            }}
          >
            <button
              className="flex items-center gap-1.5 h-full transition-opacity hover:opacity-70 focus-visible:outline-none"
              style={{ color: 'var(--fg-muted)' }}
              onClick={toggleOpen}
              aria-label={open ? 'Collapse toolbar' : 'Expand toolbar'}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
                className="transition-transform duration-200"
                style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <path
                  d="M2 4l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[10px] uppercase tracking-widest select-none">
                {open ? 'Collapse' : 'Toolbar'}
              </span>
            </button>

            {!isMobile && (
              <button
                className="flex items-center gap-1 h-full transition-opacity hover:opacity-70 focus-visible:outline-none"
                style={{ color: 'var(--fg-muted)' }}
                onClick={toggleMode}
                title="Switch to sidebar"
                aria-label="Switch to sidebar"
              >
                <span className="text-[10px] uppercase tracking-widest select-none">
                  Sidebar
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="1"
                    y="1"
                    width="10"
                    height="10"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <rect
                    x="1"
                    y="1"
                    width="4"
                    height="10"
                    rx="1.5"
                    fill="currentColor"
                    opacity="0.4"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </AccordionContext.Provider>
    );
  }

  /* ── Side bar mode (desktop default) ────────────────────────────── */
  return (
    <AccordionContext.Provider value={{ openId, setOpenId }}>
      <div
        className="flex flex-row shrink-0 self-stretch"
        style={{
          borderRight: '2px solid var(--border-strong)',
          backgroundColor: 'var(--surface)',
        }}
      >
        {/* Sidebar content */}
        <div
          className="overflow-hidden transition-[width] duration-300 ease-in-out self-stretch"
          style={{ width: open ? sideWidth : 0 }}
        >
          <div
            className="flex flex-col gap-2 py-3 overflow-y-auto overflow-x-hidden h-full"
            style={{
              width: sideWidth,
              paddingLeft: '12px',
              paddingRight: '12px',
            }}
          >
            {children}
          </div>
        </div>

        {/* Collapse handle strip */}
        <div
          className="w-6 shrink-0 flex flex-col items-center pt-3 pb-3 gap-3"
          style={{
            borderLeft: open ? '1px solid var(--border)' : 'none',
          }}
        >
          {/* Collapse/expand toggle */}
          <button
            className="w-5 h-5 flex items-center justify-center rounded transition-colors hover:opacity-70 focus-visible:outline-none"
            style={{ color: 'var(--fg-muted)' }}
            onClick={toggleOpen}
            aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              aria-hidden="true"
              className="transition-transform duration-300"
              style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}
            >
              <path
                d="M7 2L3 5l4 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Mode toggle (bottom) */}
          <button
            className="mt-auto w-5 h-5 flex items-center justify-center rounded transition-opacity hover:opacity-70 focus-visible:outline-none"
            style={{ color: 'var(--fg-muted)' }}
            onClick={toggleMode}
            title="Switch to top toolbar"
            aria-label="Switch to top toolbar"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="0.5"
                y="0.5"
                width="9"
                height="9"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1"
              />
              <rect
                x="0.5"
                y="0.5"
                width="9"
                height="3.5"
                rx="1.5"
                fill="currentColor"
                opacity="0.4"
              />
            </svg>
          </button>
        </div>
      </div>
    </AccordionContext.Provider>
  );
}
export function ToolbarSection({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  const accordion = useContext(AccordionContext);

  // When inside a Toolbar, participate in the accordion (single-open).
  // Otherwise fall back to independent local state.
  const [localOpen, setLocalOpen] = useState(false);
  const open = accordion ? accordion.openId === id : localOpen;

  const toggle = useCallback(() => {
    if (accordion) {
      accordion.setOpenId(accordion.openId === id ? null : id);
    } else {
      setLocalOpen((o) => !o);
    }
  }, [accordion, id]);

  return (
    <div
      className="flex flex-col rounded-md overflow-hidden"
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface-raised)',
      }}
    >
      {/* Section header — click to expand / collapse */}
      <button
        className="flex items-center gap-2 w-full text-left px-2.5 py-1.5 transition-colors hover:brightness-110 focus-visible:outline-none"
        style={{ backgroundColor: 'var(--surface-raised)' }}
        onClick={toggle}
        aria-expanded={open}
      >
        {icon && (
          <span
            className="shrink-0"
            style={{ color: 'var(--accent)' }}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <span
          className="flex-1 text-[10px] font-semibold uppercase tracking-[0.14em] whitespace-nowrap select-none"
          style={{ color: 'var(--fg-muted)' }}
        >
          {label}
        </span>
        {/* Chevron */}
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          aria-hidden="true"
          className="shrink-0 transition-transform duration-200"
          style={{
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            color: 'var(--fg-muted)',
          }}
        >
          <path
            d="M1.5 2.5l2.5 3 2.5-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Content — always in DOM, collapsed via max-height transition */}
      <div
        className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
        style={{ maxHeight: open ? 2000 : 0 }}
      >
        <div
          className="flex flex-col gap-1.5 px-2.5 pb-2.5 pt-1"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/** Pill-shaped segmented control for 2–4 mutually exclusive options */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labels,
  dangerValue,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
  dangerValue?: T;
}) {
  return (
    <div
      className="flex rounded-md overflow-hidden"
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--surface-raised)',
      }}
    >
      {options.map((o, i) => {
        const active = o === value;
        const isDanger = dangerValue === o && active;
        const isLast = i === options.length - 1;
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            className="flex-1 py-2 text-[11px] font-semibold uppercase tracking-widest transition-all duration-150 focus-visible:outline-none"
            style={{
              ...(isDanger
                ? { backgroundColor: 'var(--danger)', color: '#fff' }
                : active
                  ? {
                      backgroundColor: 'var(--accent)',
                      color: 'var(--bg)',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
                    }
                  : {
                      color: 'var(--fg-muted)',
                      backgroundColor: 'transparent',
                    }),
              borderRight: !isLast ? '1px solid var(--border)' : 'none',
            }}
          >
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}
