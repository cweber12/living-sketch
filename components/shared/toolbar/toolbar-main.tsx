'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import { ToolbarMode, ToolbarCtxValue, PageToolbarProps } from './types';
import { FridgeIcon } from '@/components/shared/icons/fridge';
import {
  NAVBAR_H,
  TOOLBAR_H,
  TOOLBAR_W,
  TOOLBAR_H_MOBILE,
  EXPAND_TAB_W,
  EXPAND_TAB_H,
  EXPAND_TAB_SIDE_W,
  EXPAND_TAB_SIDE_H,
} from './constants';

/* Re-export constants for backward compatibility */
export { NAVBAR_H, TOOLBAR_H, TOOLBAR_W, TOOLBAR_H_MOBILE } from './constants';

/* Ã¢â€â‚¬Ã¢â€â‚¬ Toolbar Context Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
export const ToolbarCtx = createContext<ToolbarCtxValue>({
  mode: 'top',
  collapsed: false,
  isMobile: false,
  disableAutoCollapse: false,
  setPreferSide: () => {},
  setCollapsed: () => {},
});

/**
 * The shared dropdown row DOM element rendered by PageToolbar in `<div>` rendered by PageToolbar in
 * desktop top mode.  DropdownPanel portals into this element so that
 * multiple open panels share a single horizontal strip.
 */
export const DropdownRowCtx = createContext<HTMLDivElement | null>(null);

/**
 * Render-order counter used by ToolbarSection to assign a stable CSS
 * `order` value to each portalled panel inside the shared dropdown row.
 * PageToolbar resets the counter to 0 at the start of every render;
 * each ToolbarSection increments it during render and passes its index
 * to DropdownPanel.
 */
export const SectionOrderCtx = createContext<{ current: number }>({
  current: 0,
});

/* Ã¢â€â‚¬Ã¢â€â‚¬ ToolbarLayout Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
/**
 * Wrap PageToolbar + page content inside ToolbarLayout.
 * PageToolbar is position:fixed; ToolbarLayout pads the content area to
 * account for the toolbar's occupied space.
 * On mobile (< 1024 px) the toolbar is always bottom-anchored.
 */
export function ToolbarLayout({
  children,
  className = '',
  disableAutoCollapse = false,
  noToolbar = false,
}: {
  children: ReactNode;
  className?: string;
  /** Disable touch-scroll auto-collapse (e.g. for pages where that scroll gesture
   *  should not affect the toolbar). */
  disableAutoCollapse?: boolean;
  /** When true, apply zero padding (the page controls whether PageToolbar renders). */
  noToolbar?: boolean;
}) {
  const [preferSide, setPreferSide] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const touchStartY = useRef(0);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Mobile scroll Ã¢â€ â€™ auto-collapse/expand the bottom toolbar
  useEffect(() => {
    if (!isMobile || disableAutoCollapse) return;
    const THRESHOLD = 40;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > THRESHOLD) {
        // Finger moving DOWN (content scrolling toward top) Ã¢â€ â€™ collapse toolbar
        setCollapsed(true);
        touchStartY.current = e.touches[0].clientY;
      } else if (dy < -THRESHOLD) {
        // Finger moving UP (content scrolling toward bottom) Ã¢â€ â€™ expand toolbar
        setCollapsed(false);
        touchStartY.current = e.touches[0].clientY;
      }
    };
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, [isMobile, disableAutoCollapse]);

  const mode: ToolbarMode =
    !mounted || isMobile ? 'top' : preferSide ? 'side' : 'top';

  // Padding applied to the content area to offset the fixed toolbar
  const contentStyle: React.CSSProperties = noToolbar
    ? {}
    : isMobile
      ? {
          paddingBottom: collapsed
            ? disableAutoCollapse
              ? 0
              : 20
            : TOOLBAR_H_MOBILE,
        }
      : mode === 'side'
        ? { paddingLeft: collapsed ? 0 : TOOLBAR_W }
        : { paddingTop: collapsed ? 0 : TOOLBAR_H };

  return (
    <ToolbarCtx.Provider
      value={{
        mode,
        collapsed,
        isMobile,
        disableAutoCollapse,
        setPreferSide,
        setCollapsed,
      }}
    >
      {/* Content area Ã¢â‚¬â€ padded to avoid being covered by fixed toolbar */}
      <div
        className={`flex flex-col flex-1 w-full overflow-hidden transition-all duration-200 ${className}`}
        style={contentStyle}
      >
        {/* Filter out PageToolbar children so they can be portalled */}
        {children}
      </div>
    </ToolbarCtx.Provider>
  );
}

/* Ã¢â€â‚¬Ã¢â€â‚¬ PageToolbar Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
export function PageToolbar({
  children,
  onSave,
  saveStatus = 'idle',
  saveDisabled,
}: PageToolbarProps) {
  const {
    mode,
    collapsed,
    isMobile,
    disableAutoCollapse,
    setPreferSide,
    setCollapsed,
  } = useContext(ToolbarCtx);

  const [dropdownRowEl, setDropdownRowEl] = useState<HTMLDivElement | null>(
    null,
  );
  const dropdownRowCallback = useCallback(
    (el: HTMLDivElement | null) => setDropdownRowEl(el),
    [],
  );
  const sectionOrder = useMemo(() => ({ current: 0 }), []);

  // eslint-disable-next-line react-hooks/immutability
  sectionOrder.current = 0; // Reset each render so children get stable indices

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Side mode Ã¢â€â‚¬Ã¢â€â‚¬ */
  if (mode === 'side') {
    return (
      <DropdownRowCtx.Provider value={dropdownRowEl}>
        <SectionOrderCtx.Provider value={sectionOrder}>
          {/* Collapsible sidebar */}
          <div
            data-toolbar
            style={{
              position: 'fixed',
              top: NAVBAR_H,
              left: 0,
              bottom: 0,
              width: collapsed ? 0 : TOOLBAR_W,
              zIndex: 40,
              overflow: 'hidden',
              transition: 'width 200ms ease',
              backgroundColor: 'var(--surface)',
              borderRight: '2px solid var(--border-strong)',
            }}
          >
            {!collapsed && (
              <div className="flex flex-col h-full">
                <div className="flex flex-col flex-1 overflow-y-auto">
                  {children}
                </div>
                {onSave && (
                  <button
                    onClick={onSave}
                    disabled={saveDisabled}
                    title="Save"
                    aria-label="Save"
                    style={{
                      height: 44,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      color: 'var(--bg)',
                      backgroundColor:
                        saveStatus === 'error'
                          ? 'var(--danger)'
                          : 'var(--accent)',
                      border: 'none',
                      borderTop: '2px solid var(--border-strong)',
                      cursor: saveDisabled ? 'not-allowed' : 'pointer',
                      opacity: saveDisabled ? 0.5 : 1,
                      width: '100%',
                      fontSize: 11,
                      fontWeight: 600,
                      flexDirection: 'column',
                    }}
                  >
                    <FridgeIcon size="18px" />
                    <span style={{ fontSize: 9, lineHeight: 1 }}>
                      {saveStatus === 'saving'
                        ? 'Saving'
                        : saveStatus === 'saved'
                          ? 'Saved'
                          : saveStatus === 'error'
                            ? 'Error'
                            : 'Save'}
                    </span>
                  </button>
                )}
                <button
                  onClick={() => setCollapsed(true)}
                  title="Collapse toolbar"
                  aria-label="Collapse toolbar"
                  style={{
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--fg-muted)',
                    background: 'transparent',
                    border: 'none',
                    borderTop: '1px solid var(--border)',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M8 2L4 6l4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setPreferSide(false)}
                  title="Switch to top toolbar"
                  aria-label="Switch to top toolbar"
                  style={{
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--fg-muted)',
                    background: 'transparent',
                    border: 'none',
                    borderTop: '1px solid var(--border)',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
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
                      strokeWidth="1"
                    />
                    <rect
                      x="1"
                      y="1"
                      width="10"
                      height="4"
                      rx="1.5"
                      fill="currentColor"
                      opacity="0.5"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Side expand tab Ã¢â‚¬â€ visible when collapsed, outside the collapsible div */}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              title="Expand toolbar"
              aria-label="Expand toolbar"
              style={{
                position: 'fixed',
                top: NAVBAR_H,
                left: 0,
                zIndex: 41,
                height: EXPAND_TAB_SIDE_H,
                width: EXPAND_TAB_SIDE_W,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <div
                style={{
                  width: EXPAND_TAB_SIDE_W,
                  height: EXPAND_TAB_SIDE_H,
                  backgroundColor: 'var(--accent)',
                  borderRadius: '0 5px 5px 0',
                  opacity: 0.8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="10"
                  height="5"
                  viewBox="0 0 10 5"
                  fill="none"
                  aria-hidden="true"
                  style={{ transform: 'rotate(-90deg)' }}
                >
                  <path
                    d="M1 1l4 3 4-3"
                    stroke="var(--bg)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </button>
          )}
        </SectionOrderCtx.Provider>
      </DropdownRowCtx.Provider>
    );
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Top / bottom mode (mobile = fixed bottom, desktop = fixed top) Ã¢â€â‚¬Ã¢â€â‚¬ */
  const isBottom = isMobile;
  const toolbarH = isBottom ? TOOLBAR_H_MOBILE : TOOLBAR_H;

  return (
    <DropdownRowCtx.Provider value={dropdownRowEl}>
      <SectionOrderCtx.Provider value={sectionOrder}>
        <div
          data-toolbar
          style={{
            position: 'fixed',
            ...(isBottom ? { bottom: 0 } : { top: NAVBAR_H }),
            left: 0,
            right: 0,
            height: collapsed ? 0 : toolbarH,
            zIndex: 40,
            overflow: 'hidden',
            transition: 'height 200ms ease',
            backgroundColor: 'var(--surface-inset)',
            borderBottom: isBottom
              ? undefined
              : '2px solid var(--border-strong)',
            borderTop: isBottom ? '2px solid var(--border-strong)' : undefined,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            overflowX: isBottom ? 'auto' : 'hidden',
            paddingBottom: isBottom
              ? 'env(safe-area-inset-bottom, 0px)'
              : undefined,
          }}
        >
          {/* Sections Ã¢â‚¬â€ compact flex-start row on desktop, scrollable on mobile */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'stretch',
              overflow: isBottom ? undefined : 'hidden',
              overflowX: isBottom ? 'auto' : undefined,
            }}
          >
            {children}
          </div>

          {/* Save button */}
          {onSave && (
            <button
              onClick={onSave}
              disabled={saveDisabled}
              title="Save"
              aria-label="Save"
              style={{
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                color: 'var(--bg)',
                backgroundColor:
                  saveStatus === 'error' ? 'var(--danger)' : 'var(--accent)',
                border: 'none',
                borderLeft: '2px solid var(--border-strong)',
                cursor: saveDisabled ? 'not-allowed' : 'pointer',
                opacity: saveDisabled ? 0.5 : 1,
                flexShrink: 0,
              }}
            >
              <FridgeIcon size="16px" />
              <span style={{ fontSize: 11, fontWeight: 600 }}>
                {saveStatus === 'saving'
                  ? 'SavingÃ¢â‚¬Â¦'
                  : saveStatus === 'saved'
                    ? 'Saved'
                    : saveStatus === 'error'
                      ? 'Error'
                      : 'Save'}
              </span>
            </button>
          )}

          {/* Desktop-only: collapse + sidebar controls */}
          {!isBottom && (
            <div className="flex items-stretch ml-auto shrink-0">
              <button
                onClick={() => setPreferSide(true)}
                title="Switch to sidebar"
                aria-label="Switch to sidebar"
                style={{
                  padding: '0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--fg-muted)',
                  background: 'transparent',
                  border: 'none',
                  borderLeft: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
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
                    strokeWidth="1"
                  />
                  <rect
                    x="1"
                    y="1"
                    width="4"
                    height="10"
                    rx="1.5"
                    fill="currentColor"
                    opacity="0.5"
                  />
                </svg>
              </button>
              <button
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? 'Expand toolbar' : 'Collapse toolbar'}
                aria-label={collapsed ? 'Expand toolbar' : 'Collapse toolbar'}
                style={{
                  padding: '0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: collapsed ? 'var(--accent)' : 'var(--fg-muted)',
                  background: collapsed
                    ? 'var(--surface-raised)'
                    : 'transparent',
                  border: 'none',
                  borderLeft: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  aria-hidden="true"
                >
                  {collapsed ? (
                    <path d="M5 8L1 3h8L5 8z" fill="currentColor" />
                  ) : (
                    <path d="M5 2l4 5H1l4-5z" fill="currentColor" />
                  )}
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Shared dropdown row Ã¢â‚¬â€ desktop top mode only.
            DropdownPanel portals into this div so multiple panels render
            in a single horizontal strip below the toolbar bar. */}
        {!isBottom && (
          <div
            ref={dropdownRowCallback}
            data-toolbar
            className="toolbar-dropdown-row"
            style={{ top: NAVBAR_H + TOOLBAR_H }}
          />
        )}

        {/* Desktop expand tab Ã¢â‚¬â€ always visible strip below navbar when toolbar is collapsed */}
        {!isBottom && collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            title="Expand toolbar"
            aria-label="Expand toolbar"
            style={{
              position: 'fixed',
              top: NAVBAR_H,
              right: 0,
              left: 0,
              zIndex: 41,
              height: EXPAND_TAB_H,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <div
              style={{
                width: EXPAND_TAB_W,
                height: EXPAND_TAB_H,
                backgroundColor: 'var(--accent)',
                borderRadius: '0 0 5px 5px',
                opacity: 0.8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="10"
                height="5"
                viewBox="0 0 10 5"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M1 1l4 3 4-3"
                  stroke="var(--bg)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </button>
        )}

        {/* Mobile expand handle Ã¢â‚¬â€ visible at bottom when toolbar is collapsed */}
        {isBottom && collapsed && !disableAutoCollapse && (
          <button
            onClick={() => setCollapsed(false)}
            title="Expand toolbar"
            aria-label="Expand toolbar"
            style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 41,
              paddingTop: 6,
              paddingBottom: 'env(safe-area-inset-bottom, 6px)',
              paddingLeft: 28,
              paddingRight: 28,
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border-strong)',
              borderBottom: 'none',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <div
              style={{
                width: 36,
                height: 4,
                backgroundColor: 'var(--border-strong)',
                borderRadius: 2,
              }}
            />
            <svg
              width="12"
              height="6"
              viewBox="0 0 12 6"
              fill="none"
              aria-hidden="true"
              style={{ color: 'var(--fg-muted)' }}
            >
              <path
                d="M1 5l5-4 5 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </SectionOrderCtx.Provider>
    </DropdownRowCtx.Provider>
  );
}
