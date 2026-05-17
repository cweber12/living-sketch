'use client';

/* ── Console status strip ─────────────────────────────────────────────
   28 px bar pinned to the bottom of the canvas stage. Shows frame
   count, truncated file names, and a live/paused indicator. Desktop
   only — hidden on mobile to avoid stacking under the bottom tool rail.
   ────────────────────────────────────────────────────────────────────── */

/* ── Helpers ─────────────────────────────────────────────────────── */
function shortName(key: string | null): string {
  if (!key) return '—';
  const base = key.split('/').pop() ?? key;
  return base.length > 20 ? base.slice(0, 20) + '…' : base;
}

/* ── Sub-components ──────────────────────────────────────────────── */
interface ReadoutProps {
  label: string;
  value: string;
  valueColor?: string;
}

function Readout({ label, value, valueColor }: ReadoutProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: 'var(--font-geist-mono), monospace',
        fontSize: 10,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      <span style={{ color: 'var(--fg-muted)' }}>{label}</span>
      <span style={{ color: valueColor ?? 'var(--fg)' }}>{value}</span>
    </div>
  );
}

function Divider() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 1,
        height: 14,
        backgroundColor: 'var(--border)',
        flexShrink: 0,
        margin: '0 4px',
      }}
    />
  );
}

/* ── Props ───────────────────────────────────────────────────────── */
interface ConsoleStatusStripProps {
  isMobile: boolean;
  landmarkFile: string | null;
  svgFile: string | null;
  frameCount: number;
  playing: boolean;
}

/* ── Component ───────────────────────────────────────────────────── */
export function ConsoleStatusStrip({
  isMobile,
  landmarkFile,
  svgFile,
  frameCount,
  playing,
}: ConsoleStatusStripProps) {
  if (isMobile) return null;

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        height: 28,
        padding: '0 14px',
        backgroundColor: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      <Readout
        label="Frames"
        value={frameCount > 0 ? String(frameCount) : '—'}
      />
      <Divider />
      <Readout label="Activity" value={shortName(landmarkFile)} />
      <Divider />
      <Readout label="Creation" value={shortName(svgFile)} />

      {/* Right-aligned playback indicator */}
      <div style={{ flex: 1 }} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: playing ? 'var(--accent)' : 'var(--fg-muted)',
        }}
      >
        {playing && (
          <span
            aria-hidden="true"
            className="glow-pulse"
            style={{
              display: 'inline-block',
              width: 5,
              height: 5,
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
            }}
          />
        )}
        {playing ? 'Live' : 'Paused'}
      </div>
    </div>
  );
}
