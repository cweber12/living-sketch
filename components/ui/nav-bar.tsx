import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/actions/auth';
import { NavLinks } from './nav-links';

export async function NavBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between gap-4 px-5 py-3 border-b"
      style={{
        backgroundColor: 'var(--bg)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="font-display font-black tracking-widest uppercase text-base shrink-0"
        style={{ color: 'var(--accent)' }}
      >
        Living Sketch
      </Link>

      {/* App tabs – only when authenticated */}
      {user && <NavLinks />}

      {/* User area */}
      {user && (
        <div className="flex items-center gap-3 shrink-0">
          <span
            className="hidden sm:block text-xs tracking-wide"
            style={{ color: 'var(--fg-muted)' }}
          >
            {user.email}
          </span>
          <form action={logout}>
            <button
              type="submit"
              className="btn-ghost rounded px-3 py-1.5 text-xs uppercase tracking-widest"
            >
              Sign Out
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
