import { register } from '@/app/actions/auth';
import Link from 'next/link';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="hero-grid flex flex-1 flex-col items-center justify-center p-6">
      {/* Radial fade */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 20%, var(--bg) 100%)',
        }}
      />

      <div className="card-themed w-full max-w-sm rounded-xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <Link
            href="/"
            className="font-display font-black uppercase text-sm tracking-[0.3em] block mb-4 transition-opacity hover:opacity-70"
            style={{ color: 'var(--accent)' }}
          >
            Living Sketch
          </Link>
          <h1
            className="font-display font-bold uppercase tracking-widest text-2xl"
            style={{ color: 'var(--fg)' }}
          >
            Create Account
          </h1>
          <p
            className="text-xs tracking-wide"
            style={{ color: 'var(--fg-muted)' }}
          >
            Begin your experiment
          </p>
        </div>

        {/* Alert */}
        {error && (
          <div className="alert-danger rounded px-4 py-3 text-xs">{error}</div>
        )}

        {/* Form */}
        <form action={register} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
              style={{ color: 'var(--fg-muted)' }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="input-themed block w-full rounded px-3 py-2.5 text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-widest mb-1.5"
              style={{ color: 'var(--fg-muted)' }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="input-themed block w-full rounded px-3 py-2.5 text-sm"
              placeholder="••••••••"
            />
            <p className="mt-1.5 text-xs" style={{ color: 'var(--fg-muted)' }}>
              Minimum 6 characters
            </p>
          </div>

          <button
            type="submit"
            className="btn-primary w-full rounded py-3 text-xs uppercase tracking-widest mt-2"
          >
            Reanimate
          </button>
        </form>

        <div className="divider-accent" />

        <p
          className="text-center text-xs tracking-wide"
          style={{ color: 'var(--fg-muted)' }}
        >
          Already animated?{' '}
          <Link
            href="/login"
            className="font-semibold transition-opacity hover:opacity-70"
            style={{ color: 'var(--accent)' }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
