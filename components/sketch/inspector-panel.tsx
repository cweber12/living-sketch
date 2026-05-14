'use client';

import type { CSSProperties } from 'react';
import type { Side, BodyPartName } from '@/hooks/use-sketch-canvas-rig';
import type { ShapeTool } from '@/components/sketch/canvas/sketch-canvas';
import {
  PART_LABEL,
  PART_CODE,
  PART_PROPORTIONS,
} from '@/components/sketch/sketch-constants';

/**
 * Right-hand inspector panel for the sketch page.
 *
 * Restrained lab-instrument aesthetic — three stacked sections:
 *   1. Color   — preset palette + recent swatches, always visible
 *   2. Specimen — current focused part: label, code, side, dimensions
 *   3. State    — current tool, brush size (visual disc), color hex
 *
 * Collapsible to a 24-px chrome strip that just shows a chevron to expand.
 * Desktop-only; renders nothing on mobile to avoid layout pile-up with the
 * bottom tool rail. Mobile inspector is deferred to Phase 6 (swipe-up sheet).
 */

const PANEL_W = 240;
const COLLAPSED_W = 24;

/** Curated lab-themed default palette — shown when usedColors is empty too. */
const PRESET_COLORS: readonly string[] = [
  '#000000',
  '#ffffff',
  '#b33a30',
  '#4ade80',
  '#fbbf24',
  '#60a8dc',
  '#9b5de5',
  '#8b5a2b',
];

const TOOL_LABEL: Record<ShapeTool, string> = {
  pen: 'Pen',
  line: 'Line',
  rect: 'Rect',
  circle: 'Circle',
  ellipse: 'Ellipse',
};

interface InspectorPanelProps {
  isMobile: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  color: string;
  onColorChange: (c: string) => void;
  onEraserOff: () => void;
  usedColors: string[];
  brushSize: number;
  tool: ShapeTool;
  isEraser: boolean;
  side: Side;
  focusPart: BodyPartName;
}

export function InspectorPanel({
  isMobile,
  collapsed,
  onToggleCollapsed,
  color,
  onColorChange,
  onEraserOff,
  usedColors,
  brushSize,
  tool,
  isEraser,
  side,
  focusPart,
}: InspectorPanelProps) {
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
            width: 18,
            height: 18,
            border: 'none',
            background: 'transparent',
            color: 'var(--fg-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <ChevronRight size={10} />
        </button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        <ColorSection
          color={color}
          onColorChange={onColorChange}
          onEraserOff={onEraserOff}
          usedColors={usedColors}
        />
        <SpecimenSection side={side} focusPart={focusPart} />
        <StateSection
          tool={tool}
          isEraser={isEraser}
          brushSize={brushSize}
          color={color}
        />
      </div>
    </aside>
  );
}

/* ── Sections ──────────────────────────────────────────────────────── */

function ColorSection({
  color,
  onColorChange,
  onEraserOff,
  usedColors,
}: {
  color: string;
  onColorChange: (c: string) => void;
  onEraserOff: () => void;
  usedColors: string[];
}) {
  const pick = (c: string) => {
    onColorChange(c);
    onEraserOff();
  };
  return (
    <section style={sectionStyle}>
      <SectionHeader label="Color" />
      <SwatchGrid
        colors={PRESET_COLORS}
        active={color}
        onPick={pick}
        cols={4}
      />
      {usedColors.length > 0 && (
        <>
          <SubLabel label="Recent" />
          <SwatchGrid
            colors={usedColors}
            active={color}
            onPick={pick}
            cols={6}
          />
        </>
      )}
    </section>
  );
}

function SpecimenSection({
  side,
  focusPart,
}: {
  side: Side;
  focusPart: BodyPartName;
}) {
  const sideLabel = side === 'front' ? 'Anterior' : 'Posterior';
  const { w, h } = PART_PROPORTIONS[focusPart];
  return (
    <section style={sectionStyle}>
      <SectionHeader label="Specimen" />
      <Field label="Side" value={sideLabel} />
      <Field
        label="Part"
        value={PART_LABEL[focusPart]}
        valueColor="var(--accent)"
      />
      <Field label="Code" value={PART_CODE[focusPart]} mono />
      <Field label="Ratio" value={`${w.toFixed(2)} × ${h.toFixed(2)}`} mono />
    </section>
  );
}

function StateSection({
  tool,
  isEraser,
  brushSize,
  color,
}: {
  tool: ShapeTool;
  isEraser: boolean;
  brushSize: number;
  color: string;
}) {
  const toolName = isEraser ? 'Erase' : TOOL_LABEL[tool];
  return (
    <section style={sectionStyle}>
      <SectionHeader label="State" />
      <Field
        label="Tool"
        value={toolName}
        valueColor={isEraser ? 'var(--danger)' : 'var(--accent)'}
      />
      <Field
        label="Brush"
        renderValue={
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: Math.min(Math.max(brushSize, 4), 18),
                height: Math.min(Math.max(brushSize, 4), 18),
                borderRadius: '50%',
                backgroundColor: isEraser ? 'var(--danger)' : 'var(--accent)',
                opacity: isEraser ? 0.5 : 0.9,
                border: '1px solid var(--border-strong)',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 11,
                color: 'var(--fg)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {brushSize}px
            </span>
          </span>
        }
      />
      <Field
        label="Color"
        renderValue={
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                backgroundColor: color,
                border: '1px solid var(--border-strong)',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-geist-mono), monospace',
                fontSize: 11,
                color: 'var(--fg)',
              }}
            >
              {color.toUpperCase()}
            </span>
          </span>
        }
      />
    </section>
  );
}

/* ── Primitives ────────────────────────────────────────────────────── */

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '10px 12px 14px',
  borderBottom: '1px solid var(--border)',
};

const sectionTitleStyle: CSSProperties = {
  fontFamily: 'var(--font-geist-mono), monospace',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'var(--fg-muted)',
};

function SectionHeader({ label }: { label: string }) {
  return <div style={sectionTitleStyle}>{label}</div>;
}

function SubLabel({ label }: { label: string }) {
  return (
    <div
      style={{
        ...sectionTitleStyle,
        fontSize: 8,
        opacity: 0.7,
        marginTop: 4,
      }}
    >
      {label}
    </div>
  );
}

function Field({
  label,
  value,
  renderValue,
  mono,
  valueColor,
}: {
  label: string;
  value?: string;
  renderValue?: React.ReactNode;
  mono?: boolean;
  valueColor?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        minHeight: 18,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: 9,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--fg-muted)',
        }}
      >
        {label}
      </span>
      {renderValue ? (
        renderValue
      ) : (
        <span
          style={{
            fontFamily: mono ? 'var(--font-geist-mono), monospace' : 'inherit',
            fontSize: mono ? 11 : 12,
            color: valueColor ?? 'var(--fg)',
            fontVariantNumeric: 'tabular-nums',
            textAlign: 'right',
          }}
        >
          {value}
        </span>
      )}
    </div>
  );
}

function SwatchGrid({
  colors,
  active,
  onPick,
  cols,
}: {
  colors: readonly string[];
  active: string;
  onPick: (c: string) => void;
  cols: number;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 4,
      }}
    >
      {colors.map((c) => {
        const isActive = c.toLowerCase() === active.toLowerCase();
        return (
          <button
            key={c}
            onClick={() => onPick(c)}
            title={c}
            aria-label={`Use color ${c}`}
            aria-pressed={isActive}
            style={{
              width: '100%',
              aspectRatio: '1 / 1',
              backgroundColor: c,
              border: isActive
                ? '2px solid var(--accent)'
                : '1px solid var(--border)',
              borderRadius: 3,
              padding: 0,
              cursor: 'pointer',
              boxShadow: isActive
                ? '0 0 0 1px var(--accent-faint), 0 0 8px var(--accent-glow)'
                : 'none',
              transition: 'box-shadow 120ms var(--ease-ui)',
            }}
          />
        );
      })}
    </div>
  );
}

function ChevronLeft({ size = 10 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 1L3 5l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight({ size = 10 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 1l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
