import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-xl font-semibold">Page not found</h2>
      <Link
        href="/"
        className="rounded-lg bg-foreground px-4 py-2 text-background transition-colors hover:opacity-90"
      >
        Go home
      </Link>
    </div>
  );
}
