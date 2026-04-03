'use client';

import { useEffect, useState } from 'react';
import type { FileEntry } from '@/lib/types';

interface FileListProps {
  bucket: 'landmarks' | 'svgs' | 'animations';
  selected: string | null;
  onSelect: (file: FileEntry) => void;
  formatLabel?: (name: string, selected: boolean) => string;
  onDelete?: (file: FileEntry) => void;
}

export default function FileList({
  bucket,
  selected,
  onSelect,
  formatLabel,
  onDelete,
}: FileListProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = async () => {
      try {
        const r = await fetch(`/api/storage/list?bucket=${bucket}`);
        const data = await r.json();
        if (!cancelled) setFiles(data.files ?? []);
      } catch {
        if (!cancelled) setFiles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [bucket]);

  const handleDelete = async (f: FileEntry) => {
    setDeleting(f.key);
    try {
      const res = await fetch(
        `/api/storage/files?bucket=${bucket}&key=${encodeURIComponent(f.key)}`,
        { method: 'DELETE' },
      );
      if (res.ok) {
        setFiles((prev) => prev.filter((x) => x.key !== f.key));
        onDelete?.(f);
      }
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div
        className="py-2 text-center text-[11px] uppercase tracking-widest"
        style={{ color: 'var(--fg-muted)' }}
      >
        Loading…
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div
        className="py-2 text-center text-[11px] uppercase tracking-widest"
        style={{ color: 'var(--fg-muted)' }}
      >
        No saved files
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {files.map((f) => {
        const isSelected = selected === f.key;
        const label = formatLabel ? formatLabel(f.name, isSelected) : f.name;
        return (
          <li key={f.key} className="flex items-center gap-1">
            <button
              onClick={() => onSelect(f)}
              className="flex-1 rounded px-2 py-1 text-left text-[11px] transition-colors truncate"
              style={{
                backgroundColor: isSelected
                  ? 'var(--accent)'
                  : 'var(--surface-inset)',
                color: isSelected ? 'var(--bg)' : 'var(--fg)',
                border: '1px solid var(--border)',
              }}
            >
              {label}
            </button>
            <button
              onClick={() => handleDelete(f)}
              disabled={deleting === f.key}
              className="rounded p-1 transition-colors disabled:opacity-40"
              style={{ color: 'var(--fg-muted)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  'var(--danger)';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  'var(--danger-muted)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  'var(--fg-muted)';
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  'transparent';
              }}
              title="Delete"
              aria-label="Delete file"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3 w-3"
              >
                <path
                  fillRule="evenodd"
                  d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
