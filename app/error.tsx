'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h2
        className="font-display font-bold uppercase text-xl tracking-wide"
        style={{ color: 'var(--fg)' }}
      >
        Something went wrong
      </h2>
      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
        {error.message}
      </p>
      <button
        onClick={reset}
        className="btn-primary rounded-lg px-4 py-2 text-sm uppercase tracking-widest"
      >
        Try again
      </button>
    </div>
  );
}
