'use client';

import { useRef, useState } from 'react';
import type { FileEntry } from '@/lib/types';
import { FilesIcon } from '@/components/console/icons/files-icon';
import { PreviewIcon } from '@/components/console/icons/preview-icon';
import { PulseIcon } from '@/components/extract/icons/pulse';
import { PersonArmsDownIcon } from '@/components/shared/icons/person';
import FileList from '@/components/console/controls/file-list';
import { Popover } from '@/components/sketch/toolbar/popover';

/* ── Section label style ─────────────────────────────────────────── */
const monoLabel: React.CSSProperties = {
  fontFamily: 'var(--font-geist-mono), monospace',
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--fg-muted)',
};

/* ── Rail icon button ────────────────────────────────────────────── */
interface RailBtnProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  btnRef: React.RefObject<HTMLButtonElement | null>;
  size?: number;
}

function RailBtn({
  icon,
  label,
  active,
  onClick,
  btnRef,
  size = 40,
}: RailBtnProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      ref={btnRef}
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
  const collectionRef = useRef<HTMLButtonElement>(null);
  const displayRef = useRef<HTMLButtonElement>(null);
  const popoverAnchor = isMobile ? 'top' : 'right';

  const containerStyle: React.CSSProperties = isMobile
    ? {
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
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '10px 6px',
        backgroundColor: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        width: 56,
        flexShrink: 0,
      };

  const dividerStyle: React.CSSProperties = isMobile
    ? {
        width: 1,
        height: 28,
        backgroundColor: 'var(--border)',
        margin: '0 4px',
        flexShrink: 0,
      }
    : {
        width: 28,
        height: 1,
        backgroundColor: 'var(--border)',
        margin: '4px 0',
        flexShrink: 0,
      };

  return (
    <nav aria-label="Console tools" style={containerStyle}>
      {/* Collection */}
      <RailBtn
        btnRef={collectionRef}
        icon={<FilesIcon size={18} />}
        label="Collection"
        active={collectionOpen}
        onClick={() => {
          setDisplayOpen(false);
          setCollectionOpen((v) => !v);
        }}
      />

      <Popover
        anchorRef={collectionRef}
        open={collectionOpen}
        onClose={() => setCollectionOpen(false)}
        anchor={popoverAnchor}
        width={280}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: '10px 12px',
          }}
        >
          {/* Activity section */}
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
            <div style={{ maxHeight: '25vh', overflowY: 'auto' }}>
              <FileList
                bucket="landmarks"
                selected={landmarkFile}
                onSelect={(f) => {
                  onLandmarkSelect(f);
                  setCollectionOpen(false);
                }}
                onDelete={(f) => {
                  if (f.key === landmarkFile) onLandmarkDeselect();
                }}
              />
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, backgroundColor: 'var(--border)' }} />

          {/* Creations section */}
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
            <div style={{ maxHeight: '25vh', overflowY: 'auto' }}>
              <FileList
                bucket="svgs"
                selected={svgFile}
                onSelect={(f) => {
                  onSvgSelect(f);
                  setCollectionOpen(false);
                }}
                onDelete={(f) => {
                  if (f.key === svgFile) onSvgDeselect();
                }}
              />
            </div>
          </div>
        </div>
      </Popover>

      <div style={dividerStyle} />

      {/* Display */}
      <RailBtn
        btnRef={displayRef}
        icon={<PreviewIcon size={18} />}
        label="Display"
        active={displayOpen}
        onClick={() => {
          setCollectionOpen(false);
          setDisplayOpen((v) => !v);
        }}
      />

      <Popover
        anchorRef={displayRef}
        open={displayOpen}
        onClose={() => setDisplayOpen(false)}
        anchor={popoverAnchor}
        width={220}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            padding: '10px 14px',
          }}
        >
          {/* Background */}
          <div>
            <span style={{ ...monoLabel, display: 'block', marginBottom: 6 }}>
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

          {/* Zoom */}
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

          {/* Show anchors */}
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
      </Popover>
    </nav>
  );
}
