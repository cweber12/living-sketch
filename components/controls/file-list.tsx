'use client';

import { useEffect, useState } from 'react';
import type { FileEntry } from '@/lib/types';

interface FileListProps {
  bucket: 'landmarks' | 'svgs' | 'animations';
  selected: string | null;
  onSelect: (file: FileEntry) => void;
}

export default function FileList({
  bucket,
  selected,
  onSelect,
}: FileListProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="py-2 text-center text-xs text-neutral-500">Loading…</div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="py-2 text-center text-xs text-neutral-500">
        No saved files
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {files.map((f) => (
        <li key={f.key}>
          <button
            onClick={() => onSelect(f)}
            className={`w-full rounded px-2 py-1 text-left text-xs transition-colors ${
              selected === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700'
            }`}
          >
            {f.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
