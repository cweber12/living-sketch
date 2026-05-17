'use client';

import type { CSSProperties, ReactNode } from 'react';

/* ── Viewport plate ───────────────────────────────────────────────────
   Wraps the AnimationCanvas with a microscope-reticle frame: 4 corner
   ticks in accent (matching SpecimenPlate on the sketch page), a
   monospace caption top-left reading "VIEWPORT · LIVE / PAUSED", and
   a pulsing accent dot when the animation is playing.
   ────────────────────────────────────────────────────────────────────── */

const TICK_SIZE = 10;
const TICK_THICKNESS = 1.5;
const TICK_OPACITY = 0.7;

function tickStyle(pos: 'tl' | 'tr' | 'bl' | 'br'): CSSProperties {
  const base: CSSProperties = {
    position: 'absolute',
    width: TICK_SIZE,
    height: TICK_SIZE,
    color: 'var(--accent)',
    opacity: TICK_OPACITY,
    pointerEvents: 'none',
  };
  const v = `${TICK_THICKNESS}px solid currentColor`;
  switch (pos) {
    case 'tl':
      return { ...base, top: 0, left: 0, borderTop: v, borderLeft: v };
    case 'tr':
      return { ...base, top: 0, right: 0, borderTop: v, borderRight: v };
    case 'bl':
      return { ...base, bottom: 0, left: 0, borderBottom: v, borderLeft: v };
    case 'br':
      return {
        ...base,
        bottom: 0,
        right: 0,
        borderBottom: v,
        borderRight: v,
      };
  }
}

interface ViewportPlateProps {
  playing: boolean;
  children: ReactNode;
}

export function ViewportPlate({ playing, children }: ViewportPlateProps) {
  return (
    <div
      style={{
        position: 'relative',
        padding: '26px 16px 14px',
        display: 'inline-block',
      }}
    >
      {/* Caption top-left */}
      <span
        style={{
          position: 'absolute',
          top: 7,
          left: 14,
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 9,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--fg-muted)',
          pointerEvents: 'none',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        Viewport ·{' '}
        <span style={{ color: playing ? 'var(--accent)' : 'var(--fg-muted)' }}>
          {playing ? 'Live' : 'Paused'}
        </span>
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
              flexShrink: 0,
            }}
          />
        )}
      </span>

      {/* Corner ticks */}
      <span aria-hidden="true" style={tickStyle('tl')} />
      <span aria-hidden="true" style={tickStyle('tr')} />
      <span aria-hidden="true" style={tickStyle('bl')} />
      <span aria-hidden="true" style={tickStyle('br')} />

      {children}
    </div>
  );
}
