'use client';

import { FridgeIcon } from '@/components/shared/icons/fridge';
import { PulseIcon } from '@/components/extract/icons/pulse';
import { PersonArmsDownIcon } from '@/components/shared/icons/person';

/* ── Inline transport icons ──────────────────────────────────────── */
const PlayIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 13 13"
    fill="currentColor"
    aria-hidden="true"
  >
    <polygon points="2.5,1.5 11.5,6.5 2.5,11.5" />
  </svg>
);

const PauseIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 13 13"
    fill="currentColor"
    aria-hidden="true"
  >
    <rect x="2" y="1.5" width="3.5" height="10" rx="1" />
    <rect x="7.5" y="1.5" width="3.5" height="10" rx="1" />
  </svg>
);

/* ── Helpers ─────────────────────────────────────────────────────── */
function shortName(key: string | null): string {
  if (!key) return '—';
  const base = key.split('/').pop() ?? key;
  return base.length > 26 ? base.slice(0, 26) + '…' : base;
}

/* ── Props ───────────────────────────────────────────────────────── */
interface ConsoleHeaderProps {
  landmarkFile: string | null;
  svgFile: string | null;
  playing: boolean;
  onPlayPause: () => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveDisabled: boolean;
  onSave: () => void;
}

/* ── Component ───────────────────────────────────────────────────── */
export function ConsoleHeader({
  landmarkFile,
  svgFile,
  playing,
  onPlayPause,
  saveStatus,
  saveDisabled,
  onSave,
}: ConsoleHeaderProps) {
  const statusLabel =
    saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'saved'
        ? 'Saved'
        : saveStatus === 'error'
          ? 'Error'
          : 'Save';

  const saveColor =
    saveStatus === 'error'
      ? 'var(--danger)'
      : saveStatus === 'saved'
        ? 'var(--accent)'
        : saveDisabled
          ? 'var(--fg-muted)'
          : 'var(--fg)';

  const monoStyle = {
    fontFamily: 'var(--font-geist-mono), monospace',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
  };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: 52,
        padding: '0 14px',
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      {/* Page label */}
      <span
        style={{
          ...monoStyle,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: 'var(--fg-muted)',
          flexShrink: 0,
        }}
      >
        Console
      </span>

      {/* Vertical rule */}
      <span
        aria-hidden="true"
        style={{
          width: 1,
          height: 20,
          backgroundColor: 'var(--border)',
          flexShrink: 0,
        }}
      />

      {/* File context */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {/* Activity */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            minWidth: 0,
          }}
        >
          <span
            style={{
              color: landmarkFile ? 'var(--accent)' : 'var(--fg-muted)',
              flexShrink: 0,
              display: 'flex',
            }}
          >
            <PulseIcon size={12} />
          </span>
          <span
            style={{
              ...monoStyle,
              fontSize: 9,
              color: landmarkFile ? 'var(--fg)' : 'var(--fg-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {shortName(landmarkFile)}
          </span>
        </div>

        {/* Mid dot */}
        <span
          aria-hidden="true"
          style={{ color: 'var(--border-strong)', fontSize: 9, flexShrink: 0 }}
        >
          ·
        </span>

        {/* Creation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            minWidth: 0,
          }}
        >
          <span
            style={{
              color: svgFile ? 'var(--accent)' : 'var(--fg-muted)',
              flexShrink: 0,
              display: 'flex',
            }}
          >
            <PersonArmsDownIcon size={12} />
          </span>
          <span
            style={{
              ...monoStyle,
              fontSize: 9,
              color: svgFile ? 'var(--fg)' : 'var(--fg-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {shortName(svgFile)}
          </span>
        </div>
      </div>

      {/* Transport + save */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
      >
        <button
          onClick={onPlayPause}
          title={playing ? 'Pause' : 'Play'}
          aria-label={playing ? 'Pause' : 'Play'}
          aria-pressed={playing}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 6,
            border: '1px solid var(--border-strong)',
            backgroundColor: playing
              ? 'var(--accent-faint)'
              : 'var(--surface-raised)',
            color: playing ? 'var(--accent)' : 'var(--fg-muted)',
            cursor: 'pointer',
            transition:
              'background-color 150ms var(--ease-ui), color 150ms var(--ease-ui)',
          }}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          onClick={onSave}
          disabled={saveDisabled}
          title={statusLabel}
          aria-label={statusLabel}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            height: 30,
            padding: '0 12px',
            borderRadius: 6,
            border: '1px solid var(--border-strong)',
            backgroundColor:
              saveStatus === 'saving' || saveStatus === 'saved'
                ? 'var(--accent-faint)'
                : 'var(--surface-raised)',
            color: saveColor,
            cursor: saveDisabled ? 'default' : 'pointer',
            opacity: saveDisabled ? 0.6 : 1,
            fontSize: 10,
            ...monoStyle,
            fontWeight: 700,
            transition:
              'background-color 150ms var(--ease-ui), color 150ms var(--ease-ui)',
          }}
        >
          <FridgeIcon size={14} />
          {statusLabel}
        </button>
      </div>
    </header>
  );
}
