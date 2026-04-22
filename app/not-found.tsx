import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="space-y-2 text-center">
        <p className="text-muted font-mono text-xs tracking-widest uppercase">
          404
        </p>
        <h2 className="font-display text-foreground text-xl font-bold tracking-wide uppercase">
          Page not found
        </h2>
      </div>
      <Link
        href="/"
        className="btn-primary rounded-lg px-6 py-2.5 text-sm tracking-widest uppercase"
      >
        Go home
      </Link>
    </div>
  );
}
