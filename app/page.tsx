// Home page – landing with navigation to Sketch, Capture, Console
// Replaces drawing-app/app/index.jsx

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/actions/auth';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Living Sketch</h1>
      <p className="max-w-md text-center text-lg text-zinc-600 dark:text-zinc-400">
        Pose-driven animation and sketch drawing
      </p>

      {user && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {user.email}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Sign Out
            </button>
          </form>
        </div>
      )}

      <nav className="flex flex-col gap-4 sm:flex-row">
        <Link
          href="/sketch"
          className="flex h-14 w-48 items-center justify-center rounded-xl bg-foreground text-background transition-colors hover:opacity-90"
        >
          Sketch Canvas
        </Link>
        <Link
          href="/capture"
          className="flex h-14 w-48 items-center justify-center rounded-xl bg-foreground text-background transition-colors hover:opacity-90"
        >
          Motion Capture
        </Link>
        <Link
          href="/console"
          className="flex h-14 w-48 items-center justify-center rounded-xl bg-foreground text-background transition-colors hover:opacity-90"
        >
          Animation Console
        </Link>
      </nav>
    </main>
  );
}
