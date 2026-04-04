'use client';

import {
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  Children,
  isValidElement,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

/* ── Types ─────────────────────────────────────────────────────────── */

export type ToolbarMode = 'side' | 'top';

interface ToolbarCtx {
  isMobile: boolean;
  responsiveDefaults: boolean;
  mode: ToolbarMode;
}
const ToolbarContext = createContext<ToolbarCtx | null>(null);

export const useToolbarContext = () => useContext(ToolbarContext);

const MOBILE_BP = 1024;

/* ── ToolbarDropdown ───────────────────────────────────────────────── */

export interface ToolbarDropdownProps {
  id: string;
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}

export function ToolbarDropdown(_props: ToolbarDropdownProps): null {
  return null;
}

/* ── Toolbar ───────────────────────────────────────────────────────── */

export interface ToolbarProps {
  children: ReactNode;
  sideWidth?: number;
  onModeChange?: (mode: ToolbarMode) => void;
  responsiveDefaults?: boolean;
  /** Controlled active panel id. Pass null to close, undefined for uncontrolled. */
  openId?: string | null;
  onOpenIdChange?: (id: string | null) => void;
}

export function Toolbar({
  children,
  sideWidth = 48,
  onModeChange,
  responsiveDefaults = false,
  openId,
  onOpenIdChange,
}: ToolbarProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [preferSide, setPreferSide] = useState(true);
  const [internalActiveId, setInternalActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [toolbarRect, setToolbarRect] = useState<DOMRect | null>(null);
  const [activeButtonRect, setActiveButtonRect] = useState<DOMRect | null>(
    null,
  );

  const isControlled = openId !== undefined;
  const activeId = isControlled ? (openId ?? null) : internalActiveId;

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BP - 1}px)`);
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const mode: ToolbarMode = isMobile ? 'top' : preferSide ? 'side' : 'top';

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  const measureToolbar = useCallback(() => {
    if (toolbarRef.current) {
      setToolbarRect(toolbarRef.current.getBoundingClientRect());
    }
  }, []);

  // Track active-button position so we can align the panel below it (top mode)
  // Re-measure when viewport changes too
  const measureActiveButton = useCallback(() => {
    if (!activeId) {
      setActiveButtonRect(null);
      return;
    }
    const el = buttonRefs.current.get(activeId);
    if (el) setActiveButtonRect(el.getBoundingClientRect());
  }, [activeId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  // DOM measurement — reads external system (getBoundingClientRect)
  useLayoutEffect(() => {
    measureActiveButton();
  }, [activeId, measureActiveButton]);

  const applyActiveId = useCallback(
    (id: string | null) => {
      if (!isControlled) setInternalActiveId(id);
      onOpenIdChange?.(id);
    },
    [isControlled, onOpenIdChange],
  );

  useEffect(() => {
    if (!activeId) {
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect */
    // DOM measurements — syncing with external layout system
    measureToolbar();
    measureActiveButton();
    const ro = new ResizeObserver(() => {
      measureToolbar();
      measureActiveButton();
    });
    /* eslint-enable react-hooks/set-state-in-effect */
    if (toolbarRef.current) ro.observe(toolbarRef.current);
    const onViewChange = () => {
      measureToolbar();
      measureActiveButton();
    };
    window.addEventListener('resize', onViewChange);
    window.addEventListener('scroll', onViewChange, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onViewChange);
      window.removeEventListener('scroll', onViewChange, true);
    };
  }, [activeId, measureToolbar, measureActiveButton]);

  useEffect(() => {
    if (!activeId) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (toolbarRef.current?.contains(target)) return;
      const panelEl = document.getElementById('toolbar-panel-overlay');
      if (panelEl?.contains(target)) return;
      applyActiveId(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [activeId, applyActiveId]);

  /* ── Extract ToolbarDropdown children ── */
  const dropdowns: ToolbarDropdownProps[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === ToolbarDropdown) {
      dropdowns.push(child.props as ToolbarDropdownProps);
    }
  });

  const activeDropdown = dropdowns.find((d) => d.id === activeId) ?? null;
  const ctxValue: ToolbarCtx = { isMobile, responsiveDefaults, mode };

  const togglePanel = useCallback(
    (id: string) => {
      applyActiveId(activeId === id ? null : id);
    },
    [activeId, applyActiveId],
  );

  /* ── Panel positioning (fit-content) ── */
  const getPanelStyle = (): CSSProperties => {
    if (!toolbarRect) return { display: 'none' };
    if (mode === 'side') {
      return {
        position: 'fixed',
        left: toolbarRect.right,
        top: toolbarRect.top,
        maxHeight: `calc(100vh - ${toolbarRect.top}px - 8px)`,
        minWidth: 220,
        maxWidth: 320,
        zIndex: 50,
        overflowY: 'auto',
      };
    }
    // Top mode: align below the active button
    const bLeft = activeButtonRect ? activeButtonRect.left : toolbarRect.left;
    const safeLeft = Math.min(Math.max(bLeft, 0), window.innerWidth - 260);
    return {
      position: 'fixed',
      top: toolbarRect.bottom,
      left: safeLeft,
      minWidth: 240,
      maxWidth: 360,
      zIndex: 50,
      maxHeight: '55vh',
      overflowY: 'auto',
    };
  };

  /* ── Mode-toggle icons ── */
  const iconToTop = (
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
  );
  const iconToSide = (
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
        width="4"
        height="9"
        rx="1.5"
        fill="currentColor"
        opacity="0.4"
      />
    </svg>
  );

  /* ── Overlay panel (portal to document.body) ── */
  const overlayPanel =
    mounted && activeDropdown && toolbarRect
      ? createPortal(
          <div
            id="toolbar-panel-overlay"
            style={{
              ...getPanelStyle(),
              backgroundColor: 'var(--surface)',
              borderRight:
                mode === 'side' ? '1px solid var(--border-strong)' : undefined,
              borderBottom:
                mode === 'top' ? '1px solid var(--border-strong)' : undefined,
            }}
          >
            {/* Panel content */}
            <div
              style={{
                padding: '10px 12px',
                display: 'flex',
                flexDirection: mode === 'top' ? 'row' : 'column',
                flexWrap: mode === 'top' ? 'wrap' : undefined,
                gap: mode === 'top' ? 6 : 6,
                alignItems: 'flex-start',
              }}
            >
              {activeDropdown.children}
            </div>
          </div>,
          document.body,
        )
      : null;

  /* ── Side mode ─────────────────────────────────────────────────── */
  if (mode === 'side') {
    return (
      <ToolbarContext.Provider value={ctxValue}>
        <div
          ref={toolbarRef}
          className="shrink-0 flex flex-col self-stretch"
          style={{
            width: sideWidth,
            backgroundColor: 'var(--surface)',
            borderRight: '2px solid var(--border-strong)',
          }}
        >
          <div className="flex flex-col flex-1">
            {dropdowns.map((d) => {
              const isActive = activeId === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => togglePanel(d.id)}
                  aria-pressed={isActive}
                  title={d.label}
                  style={{
                    width: '100%',
                    padding: '10px 4px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5,
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                    borderRadius: 0,
                    backgroundColor: isActive
                      ? 'var(--surface-raised)'
                      : 'transparent',
                    color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {d.icon && (
                    <span
                      style={{
                        color: isActive ? 'var(--accent)' : 'inherit',
                        lineHeight: 0,
                        flexShrink: 0,
                      }}
                      aria-hidden="true"
                    >
                      {d.icon}
                    </span>
                  )}
                  <span
                    style={{
                      writingMode: 'vertical-lr',
                      textOrientation: 'mixed',
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {d.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mode toggle */}
          <button
            style={{
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--fg-muted)',
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              borderTop: '1px solid var(--border)',
              width: '100%',
            }}
            onClick={() => setPreferSide(false)}
            title="Switch to top toolbar"
            aria-label="Switch to top toolbar"
          >
            {iconToTop}
          </button>
        </div>
        {overlayPanel}
      </ToolbarContext.Provider>
    );
  }

  /* ── Top mode ──────────────────────────────────────────────────── */
  return (
    <ToolbarContext.Provider value={ctxValue}>
      <div
        ref={toolbarRef}
        className="w-full shrink-0 flex flex-row items-stretch"
        style={{
          backgroundColor: 'var(--surface)',
          borderBottom: '2px solid var(--border-strong)',
          minHeight: 36,
        }}
      >
        {dropdowns.map((d) => {
          const isActive = activeId === d.id;
          return (
            <button
              key={d.id}
              ref={(el) => {
                if (el) buttonRefs.current.set(d.id, el);
                else buttonRefs.current.delete(d.id);
              }}
              onClick={() => togglePanel(d.id)}
              aria-pressed={isActive}
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                padding: '0 12px',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                border: 'none',
                borderRight: '1px solid var(--border)',
                borderTop: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                borderRadius: 0,
                backgroundColor: isActive
                  ? 'var(--surface-raised)'
                  : 'transparent',
                color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {d.icon && (
                <span
                  style={{
                    color: isActive ? 'var(--accent)' : 'inherit',
                    lineHeight: 0,
                  }}
                  aria-hidden="true"
                >
                  {d.icon}
                </span>
              )}
              <span>{d.label}</span>
            </button>
          );
        })}

        {!isMobile && (
          <button
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 12px',
              color: 'var(--fg-muted)',
              background: 'transparent',
              border: 'none',
              borderLeft: '1px solid var(--border)',
              cursor: 'pointer',
            }}
            onClick={() => setPreferSide(true)}
            title="Switch to sidebar"
            aria-label="Switch to sidebar"
          >
            {iconToSide}
          </button>
        )}
      </div>
      {overlayPanel}
    </ToolbarContext.Provider>
  );
}

/* ── SegmentedControl ──────────────────────────────────────────────── */

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
  labels?: Partial<Record<T, ReactNode>>;
  dangerValue?: T;
}) {
  return (
    <div
      className="flex rounded overflow-hidden"
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
            className="flex-1 py-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest transition-all duration-150 focus-visible:outline-none"
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
