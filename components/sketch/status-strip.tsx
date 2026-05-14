'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { ShapeTool } from '@/components/sketch/canvas/sketch-canvas';

/**
 * Slim status strip pinned to the bottom of the canvas stage on desktop.
 *
 * Three mono readouts: TOOL · BRUSH · COLOR. Display-only — the rail owns
 * the inputs. Hidden on mobile to avoid stacking under the bottom tool rail.
 *
 * Phase 4 deliberately omits cursor coordinates (would require instrumenting
 * SketchCanvas with parent-bound pointer events) and keyboard shortcuts (wired
 * in Phase 6).
 */

const TOOL_LABEL: Record<ShapeTool, string> = {
  pen: 'Pen',
  line: 'Line',
  rect: 'Rect',
  circle: 'Circle',
  ellipse: 'Ellipse',
};

interface StatusStripProps {
  isMobile: boolean;
  tool: ShapeTool;
  isEraser: boolean;
  brushSize: number;
  color: string;
}

export function StatusStrip({
  isMobile,
  tool,
  isEraser,
  brushSize,
  color,
}: StatusStripProps) {
  if (isMobile) return null;

  const toolName = isEraser ? 'Erase' : TOOL_LABEL[tool];
  const toolAccent = isEraser ? 'var(--danger)' : 'var(--accent)';

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
      <Readout label="Tool" value={toolName} valueColor={toolAccent} />
      <Divider />
      <Readout label="Brush" value={`${brushSize}px`} mono />
      <Divider />
      <Readout
        label="Color"
        mono
        renderValue={
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: 10,
              color: 'var(--fg)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                backgroundColor: color,
                border: '1px solid var(--border-strong)',
              }}
            />
            {color.toUpperCase()}
          </span>
        }
      />
    </div>
  );
}

/* ── Primitives ──────────────────────────────────────────────────── */

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-geist-mono), monospace',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--fg-muted)',
};

function Readout({
  label,
  value,
  renderValue,
  valueColor,
  mono,
}: {
  label: string;
  value?: string;
  renderValue?: ReactNode;
  valueColor?: string;
  mono?: boolean;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={labelStyle}>{label}</span>
      {renderValue ?? (
        <span
          style={{
            fontFamily: mono ? 'var(--font-geist-mono), monospace' : 'inherit',
            fontSize: 10,
            color: valueColor ?? 'var(--fg)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {value}
        </span>
      )}
    </span>
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
      }}
    />
  );
}
