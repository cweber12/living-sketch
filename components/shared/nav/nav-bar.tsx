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
      <div className="relative flex h-12 items-center px-3 sm:px-5">
        {/* Left: logo */}
        <div className="flex flex-1 items-center">
          <Link
            href="/"
            className="font-display text-foreground hover:text-accent shrink-0 text-sm font-bold tracking-wide uppercase transition-colors sm:text-base"
          >
            Living Sketch
          </Link>
        </div>

        {/* Center: nav dropdown — absolutely centered */}
        {user && (
          <div className="absolute left-1/2 -translate-x-1/2">
            <NavDropdown />
          </div>
        )}

        {/* Right: user + sign-out */}
        {user && (
          <div className="flex flex-1 items-center justify-end gap-2">
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
