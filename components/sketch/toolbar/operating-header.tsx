'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Side } from '@/hooks/use-sketch-canvas-rig';
import { RailButton } from './rail-button';
import { Popover } from './popover';
import { PARTS_ORDER, PART_LABEL } from '@/components/sketch/sketch-constants';
import type { BodyPartName } from '@/hooks/use-sketch-canvas-rig';
import { FridgeIcon } from '@/components/shared/icons/fridge';
import { UndoIcon } from '@/components/shared/icons/undo';
import { TrashIcon } from '@/components/shared/icons/trash';
import { CloseIcon } from '@/components/shared/icons/close';

export type ArmPose = 'up' | 'down';
export type ViewMode = 'body' | 'single';

interface TabOption<T extends string> {
  value: T;
  label: string;
  shortLabel?: string;
}

interface TabGroupProps<T extends string> {
  options: readonly TabOption<T>[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  compact?: boolean;
  ariaLabel: string;
}

function TabGroup<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  compact = false,
  ariaLabel,
}: TabGroupProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        backgroundColor: 'var(--surface-inset)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        padding: 2,
        gap: 1,
        opacity: disabled ? 0.45 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            style={{
              padding: compact ? '3px 8px' : '4px 12px',
              border: 'none',
              borderRadius: 4,
              backgroundColor: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--bg)' : 'var(--fg-muted)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontFamily: 'var(--font-geist-mono), monospace',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition:
                'background-color 120ms var(--ease-ui), color 120ms var(--ease-ui)',
              whiteSpace: 'nowrap',
            }}
          >
            {compact && opt.shortLabel ? opt.shortLabel : opt.label}
          </button>
        );
      })}
    </div>
  );
}

const SIDE_OPTIONS: readonly TabOption<Side>[] = [
  { value: 'front', label: 'Anterior', shortLabel: 'Ant' },
  { value: 'back', label: 'Posterior', shortLabel: 'Post' },
] as const;

const POSE_OPTIONS: readonly TabOption<ArmPose>[] = [
  { value: 'up', label: 'T-Pose', shortLabel: 'T' },
  { value: 'down', label: 'Hanging', shortLabel: 'Hang' },
] as const;

const VIEW_OPTIONS: readonly TabOption<ViewMode>[] = [
  { value: 'body', label: 'Whole', shortLabel: 'Whole' },
  { value: 'single', label: 'Detail', shortLabel: 'Detail' },
] as const;

interface OperatingHeaderProps {
  isMobile: boolean;
  side: Side;
  onSideChange: (s: Side) => void;
  armPose: ArmPose;
  onArmPoseChange: (p: ArmPose) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  focusIdx: number;
  onFocusIdxChange: (i: number) => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveDisabled: boolean;
  onSave: () => void;
  onUndo: () => void;
  onClearAll: () => void;
  showCopyFront: boolean;
  onCopyFront: () => void;
  onDismissCopyFront: () => void;
  partsDropdownOpen: boolean;
  onPartsDropdownToggle: () => void;
  onPartsDropdownClose: () => void;
}

function formatSpecimenId(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `SP-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

export function OperatingHeader({
  isMobile,
  side,
  onSideChange,
  armPose,
  onArmPoseChange,
  viewMode,
  onViewModeChange,
  focusIdx,
  onFocusIdxChange,
  saveStatus,
  saveDisabled,
  onSave,
  onUndo,
  onClearAll,
  showCopyFront,
  onCopyFront,
  onDismissCopyFront,
  partsDropdownOpen,
  onPartsDropdownToggle,
  onPartsDropdownClose,
}: OperatingHeaderProps) {
  const [clearPending, setClearPending] = useState(false);
  const partsRef = useRef<HTMLButtonElement>(null);
  const specimenId = useMemo(() => formatSpecimenId(new Date()), []);

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

  const saveColor =
    saveStatus === 'error'
      ? 'var(--danger)'
      : saveStatus === 'saved'
        ? 'var(--accent)'
        : saveDisabled
          ? 'var(--fg-muted)'
          : 'var(--fg)';

  const saveButton = (
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
        fontFamily: 'var(--font-geist-mono), monospace',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        transition:
          'background-color 150ms var(--ease-ui), color 150ms var(--ease-ui)',
      }}
    >
      <FridgeIcon size={14} />
      {!isMobile && statusLabel}
    </button>
  );

  const undoButton = (
    <RailButton
      icon={<UndoIcon size={16} />}
      label="Undo"
      shortcut="Ctrl+Z"
      size={32}
      onClick={onUndo}
    />
  );

  const clearButton = (
    <RailButton
      icon={<TrashIcon size={16} />}
      label={clearPending ? 'Confirm clear all' : 'Clear all'}
      size={32}
      danger
      active={clearPending}
      onClick={() => {
        if (clearPending) {
          onClearAll();
          setClearPending(false);
        } else {
          setClearPending(true);
        }
      }}
    />
  );

  const partsPickerButton = viewMode === 'single' && (
    <>
      <button
        ref={partsRef}
        onClick={onPartsDropdownToggle}
        title="Choose part"
        aria-label="Choose part"
        aria-expanded={partsDropdownOpen}
        style={{
          height: 26,
          padding: '0 10px',
          borderRadius: 4,
          border: '1px solid var(--border)',
          backgroundColor: partsDropdownOpen
            ? 'var(--accent)'
            : 'var(--surface-inset)',
          color: partsDropdownOpen ? 'var(--bg)' : 'var(--fg)',
          fontSize: 10,
          fontFamily: 'var(--font-geist-mono), monospace',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {PART_LABEL[PARTS_ORDER[focusIdx]]}
      </button>
      <Popover
        anchorRef={partsRef}
        open={partsDropdownOpen}
        onClose={onPartsDropdownClose}
        anchor="bottom"
        width={180}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {PARTS_ORDER.map((part, i) => {
            const active = focusIdx === i;
            return (
              <button
                key={part}
                onClick={() => {
                  onFocusIdxChange(i);
                  onPartsDropdownClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px 10px',
                  border: 'none',
                  background: active ? 'var(--accent)' : 'transparent',
                  color: active ? 'var(--bg)' : 'var(--fg)',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontFamily: 'var(--font-geist-mono), monospace',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  borderRadius: 3,
                  textAlign: 'left',
                }}
              >
                {PART_LABEL[part]}
              </button>
            );
          })}
        </div>
      </Popover>
    </>
  );

  const copyFrontPill = side === 'back' && showCopyFront && (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 26,
        padding: '0 4px 0 8px',
        borderRadius: 13,
        border: '1px solid var(--border-strong)',
        backgroundColor: 'var(--surface-raised)',
      }}
    >
      <button
        onClick={onCopyFront}
        style={{
          height: 22,
          padding: '0 10px',
          borderRadius: 11,
          border: 'none',
          backgroundColor: 'var(--accent)',
          color: 'var(--bg)',
          fontSize: 9,
          fontFamily: 'var(--font-geist-mono), monospace',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Mirror Anterior
      </button>
      <button
        onClick={onDismissCopyFront}
        aria-label="Dismiss"
        style={{
          width: 18,
          height: 18,
          borderRadius: '50%',
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
        <CloseIcon size={10} />
      </button>
    </div>
  );

  const tabsRow: ReactNode = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 6 : 10,
        flex: 1,
        justifyContent: isMobile ? 'flex-start' : 'center',
        overflowX: isMobile ? 'auto' : 'visible',
      }}
    >
      <TabGroup
        ariaLabel="Side"
        options={SIDE_OPTIONS}
        value={side}
        onChange={onSideChange}
        compact={isMobile}
      />
      {copyFrontPill}
      <TabGroup
        ariaLabel="Arm pose"
        options={POSE_OPTIONS}
        value={armPose}
        onChange={onArmPoseChange}
        disabled={viewMode === 'single'}
        compact={isMobile}
      />
      <TabGroup
        ariaLabel="View mode"
        options={VIEW_OPTIONS}
        value={viewMode}
        onChange={onViewModeChange}
        compact={isMobile}
      />
      {partsPickerButton}
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: isMobile ? '6px 8px' : '0 14px',
        height: isMobile ? 52 : 48,
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      {!isMobile && (
        <div
          style={{
            fontFamily: 'var(--font-geist-mono), monospace',
            fontSize: 10,
            letterSpacing: '0.12em',
            color: 'var(--fg-muted)',
            whiteSpace: 'nowrap',
            paddingRight: 12,
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            lineHeight: 1.2,
          }}
        >
          <span
            style={{
              fontSize: 8,
              opacity: 0.7,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
            }}
          >
            Specimen
          </span>
          <span style={{ color: 'var(--fg)' }}>{specimenId}</span>
        </div>
      )}

      {tabsRow}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          paddingLeft: 8,
          borderLeft: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        {undoButton}
        {clearButton}
        {saveButton}
      </div>
    </div>
  );
}
