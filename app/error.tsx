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
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-zinc-600 dark:text-zinc-400">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-lg bg-foreground px-4 py-2 text-background transition-colors hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
