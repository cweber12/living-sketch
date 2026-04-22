import { register } from '@/app/actions/auth';
import Link from 'next/link';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

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
            Create Account
          </h1>
          <p className="text-muted text-xs tracking-wide">
            Create your account
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
              minLength={6}
              autoComplete="new-password"
              className="input-themed block w-full rounded px-3 py-2.5 text-sm"
              placeholder="••••••••"
            />
            <p className="text-muted mt-1.5 text-xs">Minimum 6 characters</p>
          </div>

          <button
            type="submit"
            className="btn-primary mt-2 w-full rounded py-3 text-xs tracking-widest uppercase"
          >
            Reanimate
          </button>
        </form>

        <div className="divider-accent" />

        <p className="text-muted text-center text-xs tracking-wide">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-accent font-semibold transition-opacity hover:opacity-70"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
