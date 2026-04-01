import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h2
        className="font-display font-bold uppercase text-xl tracking-wide"
        style={{ color: 'var(--fg)' }}
      >
        Page not found
      </h2>
      <Link
        href="/"
        className="btn-primary rounded-lg px-4 py-2 text-sm uppercase tracking-widest"
      >
        Go home
      </Link>
    </div>
  );
}
