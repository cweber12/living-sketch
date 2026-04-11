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
import { OptionsIcon } from '@/components/shared/icons/options';
import { UndoIcon } from '@/components/shared/icons/undo';
import { TrashIcon } from '@/components/shared/icons/trash';
import { DropdownPanel } from './dropdown-panel';
import {
  NAVBAR_H,
  TOOLBAR_H,
  TOOLBAR_W,
  TOOLBAR_H_MOBILE,
  MOBILE_BP,
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
  mobileExpandSlot: null,
  setMobileExpandSlot: () => {},
});

/* Ã¢â€â‚¬Ã¢â€â‚¬ ToolbarLayout Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
/**
 * Wrap PageToolbar + page content inside ToolbarLayout.
 * PageToolbar is position:fixed; ToolbarLayout pads the content area to
 * account for the toolbar's occupied space.
 * On mobile (< 768 px) the toolbar is always bottom-anchored.
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
  const [mobileExpandSlot, setMobileExpandSlot] =
    useState<HTMLDivElement | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BP - 1}px)`);
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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
        mobileExpandSlot,
        setMobileExpandSlot,
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
  onUndo,
  onClearAll,
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
    setMobileExpandSlot,
  } = useContext(ToolbarCtx);

  const optionsBtnRef = useRef<HTMLButtonElement>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const mobileSlotRef = useRef<HTMLDivElement>(null);

  // Register the mobile expand slot div in context when in mobile mode
  useEffect(() => {
    if (!isMobile) {
      setMobileExpandSlot(null);
      return;
    }
    setMobileExpandSlot(mobileSlotRef.current);
    return () => setMobileExpandSlot(null);
  }, [isMobile, setMobileExpandSlot]);

  // Drag-down on the bottom toolbar collapses it (mobile only)
  useEffect(() => {
    if (!isMobile || disableAutoCollapse) return;
    const el = toolbarRef.current;
    if (!el) return;
    let startY = 0;
    let dragging = false;
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      dragging = true;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging) return;
      if (e.touches[0].clientY - startY > 40) {
        setCollapsed(true);
        dragging = false;
      }
    };
    const onTouchEnd = () => {
      dragging = false;
    };
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [isMobile, disableAutoCollapse, setCollapsed]);

  /* ── Side mode ── */
  if (mode === 'side') {
    return (
      <>
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
            borderRight: '2px solid var(--accent)',
            //boxShadow: '4px 0 24px var(--accent-glow)',
          }}
        >
          {!collapsed && (
            <div className="flex flex-col h-full">
              {/* Options button — top of sidebar */}
              <button
                ref={optionsBtnRef}
                onClick={() => setOptionsOpen((v) => !v)}
                title="Options"
                aria-label="Options"
                aria-expanded={optionsOpen}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  padding: '6px 4px',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  width: '100%',
                  backgroundColor: optionsOpen
                    ? 'var(--surface-raised)'
                    : 'transparent',
                  color: optionsOpen ? 'var(--fg)' : 'var(--fg-muted)',
                  transition: 'background-color 100ms ease',
                }}
              >
                <OptionsIcon size={16} />
              </button>
              <DropdownPanel
                anchorRef={optionsBtnRef}
                open={optionsOpen}
                onClose={() => setOptionsOpen(false)}
                width={160}
              >
                <OptionsMenu
                  onSave={onSave}
                  saveStatus={saveStatus}
                  saveDisabled={saveDisabled}
                  onUndo={onUndo}
                  onClearAll={onClearAll}
                  onClose={() => setOptionsOpen(false)}
                />
              </DropdownPanel>
              <div className="flex flex-col flex-1 overflow-y-auto">
                {children}
              </div>
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
      </>
    );
  }

  /* Ã¢â€â‚¬Ã¢â€â‚¬ Top / bottom mode (mobile = fixed bottom, desktop = fixed top) Ã¢â€â‚¬Ã¢â€â‚¬ */
  const isBottom = isMobile;
  const toolbarH = isBottom ? TOOLBAR_H_MOBILE : TOOLBAR_H;

  return (
    <>
      {/* Mobile expand slot — portaled action-icon panels render here, above the toolbar */}
      {isBottom && (
        <div
          ref={mobileSlotRef}
          style={{
            position: 'fixed',
            bottom: TOOLBAR_H_MOBILE,
            left: 0,
            right: 0,
            zIndex: 41,
          }}
        />
      )}
      <div
        ref={toolbarRef}
        data-toolbar
        style={{
          position: 'fixed',
          ...(isBottom ? { bottom: 0 } : { top: NAVBAR_H }),
          left: 0,
          right: 0,
          ...(isBottom
            ? { height: collapsed ? 0 : toolbarH }
            : {
                maxHeight: collapsed ? 0 : '60vh',
                minHeight: collapsed ? 0 : toolbarH,
              }),
          zIndex: 40,
          overflow: 'hidden',
          transition: isBottom ? 'height 200ms ease' : 'max-height 200ms ease',
          backgroundColor: 'var(--surface-inset)',
          borderBottom: isBottom ? undefined : '2px solid var(--border)',
          borderTop: isBottom ? '2px solid var(--border)' : undefined,
          //boxShadow: isBottom
          //  ? '0 -4px 24px var(--accent-glow)'
          //  : '0 4px 24px var(--accent-glow)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
        }}
      >
        {/* Options button — pinned left, outside scrollable sections */}
        <button
          ref={optionsBtnRef}
          onClick={() => setOptionsOpen((v) => !v)}
          title="Options"
          aria-label="Options"
          aria-expanded={optionsOpen}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: isMobile ? '4px 18px' : '4px 14px',
            border: 'none',
            borderRight: '1px solid var(--border)',
            cursor: 'pointer',
            flexShrink: 0,
            backgroundColor: optionsOpen
              ? 'var(--surface-raised)'
              : 'transparent',
            color: optionsOpen ? 'var(--fg)' : 'var(--fg-muted)',
            transition: 'background-color 100ms ease',
          }}
        >
          <OptionsIcon size={16} />
        </button>
        <DropdownPanel
          anchorRef={optionsBtnRef}
          open={optionsOpen}
          onClose={() => setOptionsOpen(false)}
          width={160}
        >
          <OptionsMenu
            onSave={onSave}
            saveStatus={saveStatus}
            saveDisabled={saveDisabled}
            onUndo={onUndo}
            onClearAll={onClearAll}
            onClose={() => setOptionsOpen(false)}
          />
        </DropdownPanel>
        {/* Toolbar sections */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {children}
        </div>

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
    </>
  );
}

/* ── OptionsMenu (used inside the Options DropdownPanel) ──────────── */

function OptionsMenu({
  onSave,
  saveStatus,
  saveDisabled,
  onUndo,
  onClearAll,
  onClose,
}: {
  onSave?: () => void;
  saveStatus: string;
  saveDisabled?: boolean;
  onUndo?: () => void;
  onClearAll?: () => void;
  onClose: () => void;
}) {
  const [clearPending, setClearPending] = useState(false);

  useEffect(() => {
    if (!clearPending) return;
    const t = setTimeout(() => setClearPending(false), 3000);
    return () => clearTimeout(t);
  }, [clearPending]);

  const statusLabel =
    saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'saved'
        ? 'Saved'
        : saveStatus === 'error'
          ? 'Error'
          : 'Save';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        padding: '4px 0',
      }}
    >
      {/* Save */}
      {onSave && (
        <button
          onClick={() => {
            onSave();
            onClose();
          }}
          disabled={saveDisabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            border: 'none',
            background: 'none',
            cursor: saveDisabled ? 'default' : 'pointer',
            color: saveDisabled ? 'var(--fg-muted)' : 'var(--fg)',
            opacity: saveDisabled ? 0.5 : 1,
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            width: '100%',
            borderRadius: 3,
            transition: 'background-color 100ms ease',
          }}
          onMouseEnter={(e) => {
            if (!saveDisabled)
              e.currentTarget.style.backgroundColor = 'var(--surface-raised)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Save"
          aria-label="Save"
        >
          <FridgeIcon size="14" />
          {statusLabel}
        </button>
      )}

      {/* Undo */}
      {onUndo && (
        <button
          onClick={() => {
            onUndo();
            onClose();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: 'var(--fg)',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            width: '100%',
            borderRadius: 3,
            transition: 'background-color 100ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-raised)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Undo"
          aria-label="Undo"
        >
          <UndoIcon size="14" />
          Undo
        </button>
      )}

      {/* Clear All — two-step confirmation */}
      {onClearAll && (
        <button
          onClick={() => {
            if (clearPending) {
              onClearAll();
              setClearPending(false);
              onClose();
            } else {
              setClearPending(true);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            border: 'none',
            background: clearPending ? 'var(--danger)' : 'none',
            cursor: 'pointer',
            color: clearPending ? 'var(--fg)' : 'var(--danger)',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            width: '100%',
            borderRadius: 3,
            transition: 'background-color 100ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--surface-raised)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title={clearPending ? 'Confirm Clear?' : 'Clear All'}
          aria-label={clearPending ? 'Confirm Clear?' : 'Clear All'}
        >
          <TrashIcon size={14} />
          {clearPending ? 'Confirm' : 'Clear All'}
        </button>
      )}
    </div>
  );
}
