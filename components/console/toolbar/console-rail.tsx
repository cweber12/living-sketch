'use client';

import { useEffect, useRef, useState } from 'react';
import type { FileEntry } from '@/lib/types';
import { FilesIcon } from '@/components/console/icons/files-icon';
import { PreviewIcon } from '@/components/console/icons/preview-icon';
import { PulseIcon } from '@/components/extract/icons/pulse';
import { PersonArmsDownIcon } from '@/components/shared/icons/person';
import FileList from '@/components/console/controls/file-list';

/* ── Layout constants (must match ConsoleHeader / status strip) ───── */
const HEADER_H = 52;
const RAIL_W = 56;
const PANEL_W = 260;

/* ── Shared styles ───────────────────────────────────────────────── */
const monoLabel: React.CSSProperties = {
  fontFamily: 'var(--font-geist-mono), monospace',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--fg-muted)',
};

/* ── Chevron ─────────────────────────────────────────────────────── */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{
        transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
        transition: 'transform 150ms var(--ease-ui)',
        flexShrink: 0,
      }}
    >
      <polyline points="2,3.5 5,6.5 8,3.5" />
    </svg>
  );
}

/* ── Section header inside compound panel ────────────────────────── */
interface SectionHeaderProps {
  icon: React.ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
  hasBorderTop?: boolean;
}

function SectionHeader({
  icon,
  label,
  open,
  onToggle,
  hasBorderTop = false,
}: SectionHeaderProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        width: '100%',
        padding: '7px 10px',
        border: 'none',
        borderTop: hasBorderTop ? '1px solid var(--border)' : undefined,
        borderBottom: '1px solid var(--border)',
        backgroundColor: hovered
          ? 'var(--surface-hover)'
          : open
            ? 'var(--surface-inset)'
            : 'var(--surface)',
        cursor: 'pointer',
        color: 'var(--fg-muted)',
        textAlign: 'left',
        transition: 'background-color 100ms var(--ease-ui)',
      }}
    >
      <span
        style={{
          display: 'flex',
          color: open ? 'var(--accent)' : 'var(--fg-muted)',
          transition: 'color 100ms var(--ease-ui)',
        }}
      >
        {icon}
      </span>
      <span
        style={{
          ...monoLabel,
          flex: 1,
          color: open ? 'var(--fg)' : 'var(--fg-muted)',
          transition: 'color 100ms var(--ease-ui)',
        }}
      >
        {label}
      </span>
      <Chevron open={open} />
    </button>
  );
}

/* ── Rail icon button ────────────────────────────────────────────── */
interface RailBtnProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  size?: number;
}

function RailBtn({ icon, label, active, onClick, size = 40 }: RailBtnProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        background: active
          ? 'var(--accent)'
          : hovered
            ? 'var(--surface-hover)'
            : 'transparent',
        color: active ? 'var(--bg)' : hovered ? 'var(--fg)' : 'var(--fg-muted)',
        cursor: 'pointer',
        borderRadius: 6,
        transition:
          'background 120ms var(--ease-ui), color 120ms var(--ease-ui)',
      }}
    >
      {icon}
    </button>
  );
}

/* ── Props ───────────────────────────────────────────────────────── */
interface ConsoleRailProps {
  isMobile: boolean;
  /* Collection */
  landmarkFile: string | null;
  onLandmarkSelect: (f: FileEntry) => void;
  onLandmarkDeselect: () => void;
  svgFile: string | null;
  onSvgSelect: (f: FileEntry) => void;
  onSvgDeselect: () => void;
  /* Display */
  bgColor: string;
  onBgColorChange: (c: string) => void;
  scale: number;
  onScaleChange: (v: number) => void;
  showAnchors: boolean;
  onShowAnchorsChange: (v: boolean) => void;
}

/* ── Component ───────────────────────────────────────────────────── */
export function ConsoleRail({
  isMobile,
  landmarkFile,
  onLandmarkSelect,
  onLandmarkDeselect,
  svgFile,
  onSvgSelect,
  onSvgDeselect,
  bgColor,
  onBgColorChange,
  scale,
  onScaleChange,
  showAnchors,
  onShowAnchorsChange,
}: ConsoleRailProps) {
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const panelOpen = collectionOpen || displayOpen;

  const railRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* Close on outside click / Escape */
  useEffect(() => {
    if (!panelOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (railRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setCollectionOpen(false);
      setDisplayOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCollectionOpen(false);
        setDisplayOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [panelOpen]);

  if (isMobile) {
    return (
      <nav
        aria-label="Console tools"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          padding: '6px 8px',
          backgroundColor: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          overflowX: 'auto',
          flexShrink: 0,
          height: 60,
        }}
      >
        <RailBtn
          icon={<FilesIcon size={18} />}
          label="Collection"
          active={collectionOpen}
          onClick={() => setCollectionOpen((v) => !v)}
        />
        <div
          style={{
            width: 1,
            height: 28,
            backgroundColor: 'var(--border)',
            margin: '0 4px',
            flexShrink: 0,
          }}
        />
        <RailBtn
          icon={<PreviewIcon size={18} />}
          label="Display"
          active={displayOpen}
          onClick={() => setDisplayOpen((v) => !v)}
        />
      </nav>
    );
  }

  return (
    <>
      {/* Vertical icon rail */}
      <nav
        ref={railRef}
        aria-label="Console tools"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          padding: '10px 6px',
          backgroundColor: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          width: RAIL_W,
          flexShrink: 0,
        }}
      >
        <RailBtn
          icon={<FilesIcon size={18} />}
          label="Collection"
          active={collectionOpen}
          onClick={() => setCollectionOpen((v) => !v)}
        />

        <div
          style={{
            width: 28,
            height: 1,
            backgroundColor: 'var(--border)',
            margin: '4px 0',
            flexShrink: 0,
          }}
        />

        <RailBtn
          icon={<PreviewIcon size={18} />}
          label="Display"
          active={displayOpen}
          onClick={() => setDisplayOpen((v) => !v)}
        />
      </nav>

      {/* Compound panel — fixed, flush with header bottom and rail right edge */}
      {panelOpen && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: HEADER_H,
            left: RAIL_W,
            width: PANEL_W,
            backgroundColor: 'var(--surface)',
            borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            zIndex: 50,
            overflowY: 'auto',
            maxHeight: `calc(100vh - ${HEADER_H}px)`,
          }}
        >
          {/* ── Collection section ─────────────────────────────── */}
          <SectionHeader
            icon={<FilesIcon size={12} />}
            label="Collection"
            open={collectionOpen}
            onToggle={() => setCollectionOpen((v) => !v)}
          />
          {collectionOpen && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                padding: '10px 12px',
              }}
            >
              <div>
                <div
                  style={{
                    ...monoLabel,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 6,
                  }}
                >
                  <PulseIcon size={11} />
                  <span>Activity</span>
                </div>
                <div style={{ maxHeight: '20vh', overflowY: 'auto' }}>
                  <FileList
                    bucket="landmarks"
                    selected={landmarkFile}
                    onSelect={onLandmarkSelect}
                    onDelete={(f) => {
                      if (f.key === landmarkFile) onLandmarkDeselect();
                    }}
                  />
                </div>
              </div>

              <div style={{ height: 1, backgroundColor: 'var(--border)' }} />

              <div>
                <div
                  style={{
                    ...monoLabel,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginBottom: 6,
                  }}
                >
                  <PersonArmsDownIcon size={11} />
                  <span>Creations</span>
                </div>
                <div style={{ maxHeight: '20vh', overflowY: 'auto' }}>
                  <FileList
                    bucket="svgs"
                    selected={svgFile}
                    onSelect={onSvgSelect}
                    onDelete={(f) => {
                      if (f.key === svgFile) onSvgDeselect();
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Display section ────────────────────────────────── */}
          <SectionHeader
            icon={<PreviewIcon size={12} />}
            label="Display"
            open={displayOpen}
            onToggle={() => setDisplayOpen((v) => !v)}
            hasBorderTop={collectionOpen}
          />
          {displayOpen && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                padding: '10px 14px',
              }}
            >
              <div>
                <span
                  style={{ ...monoLabel, display: 'block', marginBottom: 6 }}
                >
                  Background
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => onBgColorChange(e.target.value)}
                    style={{
                      width: 28,
                      height: 28,
                      cursor: 'pointer',
                      border: 'none',
                      padding: 0,
                      borderRadius: 3,
                    }}
                    aria-label="Preview background colour"
                  />
                  <span
                    style={{
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontSize: 10,
                      color: 'var(--fg-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                  >
                    {bgColor.toUpperCase()}
                  </span>
                </div>
              </div>

              <div>
                <div
                  style={{
                    ...monoLabel,
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}
                >
                  <span>Zoom</span>
                  <span style={{ color: 'var(--fg)' }}>
                    {Math.round(scale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.25}
                  max={2}
                  step={0.05}
                  value={scale}
                  onChange={(e) => onScaleChange(Number(e.target.value))}
                  style={{ width: '100%' }}
                  aria-label="Preview zoom"
                />
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={showAnchors}
                  onChange={(e) => onShowAnchorsChange(e.target.checked)}
                  style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
                  aria-label="Show anchors"
                />
                <span style={{ ...monoLabel, color: 'var(--fg)' }}>
                  Show Anchors
                </span>
              </label>
            </div>
          )}
        </div>
      )}
    </>
  );
}
