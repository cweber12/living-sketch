import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h2 className="font-display text-foreground text-xl font-bold tracking-wide uppercase">
        Page not found
      </h2>
      <Link
        href="/"
        className="btn-primary rounded-lg px-4 py-2 text-sm tracking-widest uppercase"
      >
        Go home
      </Link>
    </div>
  );
}
