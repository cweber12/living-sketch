'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="space-y-2 text-center">
        <p className="text-danger font-mono text-xs tracking-widest uppercase">
          Error
        </p>
        <h2 className="font-display text-foreground text-xl font-bold tracking-wide uppercase">
          Something went wrong
        </h2>
        {error.message && (
          <p className="text-muted max-w-sm text-sm">{error.message}</p>
        )}
      </div>
      <button
        onClick={reset}
        className="btn-primary rounded-lg px-6 py-2.5 text-sm tracking-widest uppercase"
      >
        Try again
      </button>
    </div>
  );
}
