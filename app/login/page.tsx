import { login } from '@/app/actions/auth';
import Link from 'next/link';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      {/* Radial fade */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 20%, var(--bg) 100%)',
        }}
      />

      <div className="card-themed w-full max-w-sm space-y-6 rounded-xl p-8">
        {/* Header */}
        <div className="space-y-1 text-center">
          <Link
            href="/"
            className="font-display text-accent mb-4 block text-sm font-bold tracking-[0.3em] uppercase transition-opacity hover:opacity-70"
          >
            Living Sketch
          </Link>
          <h1 className="font-display text-foreground text-2xl font-bold tracking-widest uppercase">
            Sign In
          </h1>
          <p className="text-muted text-xs tracking-wide">
            Sign in to your account
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert-danger rounded px-4 py-3 text-xs">{error}</div>
        )}
        {message && (
          <div className="alert-success rounded px-4 py-3 text-xs">
            {message}
          </div>
        )}

        {/* Form */}
        <form action={login} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="text-muted mb-1.5 block text-xs font-semibold tracking-widest uppercase"
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
              className="text-muted mb-1.5 block text-xs font-semibold tracking-widest uppercase"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="input-themed block w-full rounded px-3 py-2.5 text-sm"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="btn-primary mt-2 w-full rounded py-3 text-xs tracking-widest uppercase"
          >
            Enter
          </button>
        </form>

        <div className="divider-accent" />

        <p className="text-muted text-center text-xs tracking-wide">
          No account?{' '}
          <Link
            href="/register"
            className="text-accent font-semibold transition-opacity hover:opacity-70"
          >
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
