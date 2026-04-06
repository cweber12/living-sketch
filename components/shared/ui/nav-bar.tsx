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
    <header
      className="sticky top-0 z-50"
      style={{
        backgroundColor: 'var(--surface)',
        borderBottom: '2px solid var(--border-strong)',
      }}
    >
      <div className="flex items-center justify-between px-3 sm:px-5 py-2">
        {/* Left: nav dropdown + title */}
        <div className="flex items-center gap-2">
          {user && <NavDropdown />}
          <Link
            href="/"
            className="font-display font-bold tracking-wide uppercase text-sm sm:text-base shrink-0"
            style={{ color: 'var(--fg)' }}
          >
            Living Sketch
          </Link>
        </div>

        {/* Right: user + sign-out */}
        {user && (
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="hidden sm:block text-xs tracking-wide"
              style={{ color: 'var(--fg-muted)' }}
            >
              {user.email}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="btn-ghost rounded px-2.5 py-1 text-[11px] uppercase tracking-widest"
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
