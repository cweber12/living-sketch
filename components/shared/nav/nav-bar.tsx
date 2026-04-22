import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/actions/auth';
import { NavDropdown } from './nav-links';

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <header className="bg-surface border-edge sticky top-0 z-50 border-b">
      <div className="flex h-12 items-center justify-between px-3 py-2 sm:px-5">
        {/* Left: nav dropdown + title */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="font-display text-foreground hover:text-accent shrink-0 text-sm font-bold tracking-wide uppercase transition-colors sm:text-base"
          >
            Living Sketch
          </Link>
        </div>
        {user && <NavDropdown />}

        {/* Right: user + sign-out */}
        {user && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-muted hidden text-xs tracking-wide sm:block">
              {user.email}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="btn-ghost text-2xs rounded px-2.5 py-1 tracking-widest uppercase"
              >
                Sign Out
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
