'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { Side } from '@/hooks/use-sketch-canvas-rig';

/* ── Specimen plate ───────────────────────────────────────────────────
   Wraps the body grid with a microscope-reticle frame: 4 corner ticks
   in accent, a monospace caption ("PLATE · ANTERIOR") top-left, and a
   touch of inner padding. No outer border, no animation — restrained
   lab-instrument framing only.
   ────────────────────────────────────────────────────────────────────── */

interface SpecimenPlateProps {
  side: Side;
  isMobile: boolean;
  children: ReactNode;
}

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
      return { ...base, bottom: 0, right: 0, borderBottom: v, borderRight: v };
  }
}

export function SpecimenPlate({
  side,
  isMobile,
  children,
}: SpecimenPlateProps) {
  const padding = isMobile ? '22px 12px 12px' : '26px 16px 14px';

  return (
    <div
      style={{
        position: 'relative',
        padding,
        display: 'inline-block',
      }}
    >
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
        }}
      >
        Plate ·{' '}
        <span style={{ color: 'var(--fg)' }}>
          {side === 'front' ? 'Anterior' : 'Posterior'}
        </span>
      </span>

      <span aria-hidden="true" style={tickStyle('tl')} />
      <span aria-hidden="true" style={tickStyle('tr')} />
      <span aria-hidden="true" style={tickStyle('bl')} />
      <span aria-hidden="true" style={tickStyle('br')} />

      {children}
    </div>
  );
}

/* ── Specimen brackets ─────────────────────────────────────────────────
   Larger accent-colored corner L-shapes for the single-part canvas.
   Sits over the canvas corners, pointer-events: none so the canvas
   stays fully interactive.
   ────────────────────────────────────────────────────────────────────── */

const BRACKET_SIZE = 14;
const BRACKET_THICKNESS = 2;

function bracketStyle(pos: 'tl' | 'tr' | 'bl' | 'br'): CSSProperties {
  const base: CSSProperties = {
    position: 'absolute',
    width: BRACKET_SIZE,
    height: BRACKET_SIZE,
    color: 'var(--accent)',
    pointerEvents: 'none',
  };
  const v = `${BRACKET_THICKNESS}px solid currentColor`;
  switch (pos) {
    case 'tl':
      return { ...base, top: -1, left: -1, borderTop: v, borderLeft: v };
    case 'tr':
      return { ...base, top: -1, right: -1, borderTop: v, borderRight: v };
    case 'bl':
      return { ...base, bottom: -1, left: -1, borderBottom: v, borderLeft: v };
    case 'br':
      return {
        ...base,
        bottom: -1,
        right: -1,
        borderBottom: v,
        borderRight: v,
      };
  }
}

export function SpecimenBrackets() {
  return (
    <>
      <span aria-hidden="true" style={bracketStyle('tl')} />
      <span aria-hidden="true" style={bracketStyle('tr')} />
      <span aria-hidden="true" style={bracketStyle('bl')} />
      <span aria-hidden="true" style={bracketStyle('br')} />
    </>
  );
}
