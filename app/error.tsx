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
      <h2 className="font-display text-foreground text-xl font-bold tracking-wide uppercase">
        Something went wrong
      </h2>
      <p className="text-muted text-sm">{error.message}</p>
      <button
        onClick={reset}
        className="btn-primary rounded-lg px-4 py-2 text-sm tracking-widest uppercase"
      >
        Try again
      </button>
    </div>
  );
}
