'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { ToolbarMode, ToolbarCtxValue, PageToolbarProps } from './types';
import { FridgeIcon } from '@/components/shared/icons/fridge';

/* ── Toolbar Context ───────────────────────────────────────────────── */
/** Managing toolbar state and behavior */
export const ToolbarCtx = createContext<ToolbarCtxValue>({
  mode: 'top',
  collapsed: false,
  isMobile: false,
  disableAutoCollapse: false,
  setPreferSide: () => {},
  setCollapsed: () => {},
});

/* ── Constants (exported for use in dropdown-panel and other consumers) ──── */
/** Height of the sticky NavBar (px) */
export const NAVBAR_H = 48;
/** Height of the top toolbar in desktop mode (px) */
export const TOOLBAR_H = 38;
/** Width of the side toolbar (px) */
export const TOOLBAR_W = 56;
/** Height of the mobile bottom toolbar (px) */
export const TOOLBAR_H_MOBILE = 56;

/* ── ToolbarLayout ─────────────────────────────────────────────────── */
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

  // Mobile scroll → auto-collapse/expand the bottom toolbar
  useEffect(() => {
    if (!isMobile || disableAutoCollapse) return;
    const THRESHOLD = 40;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > THRESHOLD) {
        // Finger moving DOWN (content scrolling toward top) → collapse toolbar
        setCollapsed(true);
        touchStartY.current = e.touches[0].clientY;
      } else if (dy < -THRESHOLD) {
        // Finger moving UP (content scrolling toward bottom) → expand toolbar
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
      {/* Content area — padded to avoid being covered by fixed toolbar */}
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

/* ── PageToolbar ───────────────────────────────────────────────────── */
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

  /* ── Side mode ── */
  if (mode === 'side') {
    return (
      <div
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
        <div className="flex flex-col h-full">
          {/* Expand button shown when collapsed (side mode) */}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              title="Expand toolbar"
              aria-label="Expand toolbar"
              style={{
                width: TOOLBAR_W,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                background: 'var(--surface-raised)',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              {/* Right arrow — expand sidebar */}
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 2l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          {!collapsed && (
            <>
              <div className="flex flex-col flex-1 overflow-y-auto">
                {children}
              </div>
              {/* Save button — rendered above bottom controls when onSave is provided */}
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
              {/* Bottom controls */}
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
                {/* Left arrow — collapse sidebar */}
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
            </>
          )}
        </div>
      </div>
    );
  }

  /* ── Top / bottom mode (mobile = fixed bottom, desktop = fixed top) ── */
  const isBottom = isMobile;
  const toolbarH = isBottom ? TOOLBAR_H_MOBILE : TOOLBAR_H;

  return (
    <>
      <div
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
          borderBottom: isBottom ? undefined : '2px solid var(--border-strong)',
          borderTop: isBottom ? '2px solid var(--border-strong)' : undefined,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          justifyContent: 'center',
          overflowX: isBottom ? 'auto' : 'hidden',
          // Safe area for phones with home bar
          paddingBottom: isBottom
            ? 'env(safe-area-inset-bottom, 0px)'
            : undefined,
        }}
      >
        {/* Sections — flex-1 scrolls horizontally on mobile */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            flex: isBottom ? undefined : 1,
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
                ? 'Saving…'
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
            {/* Sidebar toggle */}
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
            {/* Collapse toggle */}
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
                background: collapsed ? 'var(--surface-raised)' : 'transparent',
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

      {/* Desktop expand tab — always visible strip below navbar when toolbar is collapsed */}
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
            height: 8,
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
              width: 56,
              height: 8,
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

      {/* Mobile expand handle — visible at bottom when toolbar is collapsed.
          Hidden when disableAutoCollapse is true (page manages collapsed state directly). */}
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
    </>
  );
}
