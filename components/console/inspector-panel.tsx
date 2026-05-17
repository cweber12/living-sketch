'use client';

import ShiftControls from '@/components/console/controls/shift-controls';
import ScaleControls from '@/components/console/controls/scale-controls';

/* ── Layout constants ────────────────────────────────────────────── */
const PANEL_W = 220;
const COLLAPSED_W = 24;

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-geist-mono), monospace',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--fg-muted)',
};

/* ── Chevron icons ───────────────────────────────────────────────── */
const ChevronRight = ({ size = 10 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 10 10"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="3,2 7,5 3,8" />
  </svg>
);

const ChevronLeft = ({ size = 10 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 10 10"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="7,2 3,5 7,8" />
  </svg>
);

/* ── Props ───────────────────────────────────────────────────────── */
interface ConsoleInspectorPanelProps {
  isMobile: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/* ── Component ───────────────────────────────────────────────────── */
export function ConsoleInspectorPanel({
  isMobile,
  collapsed,
  onToggleCollapsed,
}: ConsoleInspectorPanelProps) {
  if (isMobile) return null;

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapsed}
        title="Expand inspector"
        aria-label="Expand inspector"
        style={{
          width: COLLAPSED_W,
          height: '100%',
          backgroundColor: 'var(--surface)',
          borderTop: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          borderLeft: '1px solid var(--border)',
          color: 'var(--fg-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          flexShrink: 0,
        }}
      >
        <ChevronLeft size={10} />
      </button>
    );
  }

  return (
    <aside
      aria-label="Inspector"
      style={{
        width: PANEL_W,
        backgroundColor: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        <span style={sectionTitleStyle}>Inspector</span>
        <button
          onClick={onToggleCollapsed}
          title="Collapse inspector"
          aria-label="Collapse inspector"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            border: 'none',
            background: 'none',
            color: 'var(--fg-muted)',
            cursor: 'pointer',
            borderRadius: 3,
            padding: 0,
          }}
        >
          <ChevronRight size={10} />
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Shift section */}
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <div
            style={{
              padding: '6px 12px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--surface-inset)',
            }}
          >
            <span style={sectionTitleStyle}>Shift</span>
          </div>
          <ShiftControls />
        </div>

        {/* Scale section */}
        <div>
          <div
            style={{
              padding: '6px 12px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--surface-inset)',
            }}
          >
            <span style={sectionTitleStyle}>Scale</span>
          </div>
          <ScaleControls />
        </div>
      </div>
    </aside>
  );
}
