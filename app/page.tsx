import Link from 'next/link';

export default async function Home() {
  return (
    <main className="flex flex-col flex-1">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-24 min-h-[88vh]">
        <div className="flex flex-col items-center gap-8 max-w-4xl">
          {/* Overline */}
          <p
            className="text-xs font-bold tracking-[0.35em] uppercase"
            style={{ color: 'var(--accent)' }}
          >
            Reanimation Studio
          </p>

          {/* Main headline */}
          <h1
            className="font-display font-black uppercase leading-none glow-accent"
            style={{
              fontSize: 'clamp(3rem, 12vw, 9rem)',
              color: 'var(--fg)',
              letterSpacing: '0.06em',
            }}
          >
            It&apos;s <span style={{ color: 'var(--accent)' }}>Alive.</span>
          </h1>

          {/* Divider */}
          <div className="divider-accent w-48" />

          {/* Sub-copy */}
          <p
            className="text-lg sm:text-xl max-w-lg leading-relaxed"
            style={{ color: 'var(--fg-muted)' }}
          >
            Draw the parts. Capture the motion.
            <br />
            Watch your creation <em style={{ color: 'var(--fg)' }}>wake.</em>
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            <Link
              href="/sketch"
              className="btn-primary rounded px-8 py-3 text-sm uppercase tracking-widest"
            >
              Enter the Lab
            </Link>
            <Link
              href="/console"
              className="btn-ghost rounded px-8 py-3 text-sm uppercase tracking-widest font-semibold"
            >
              View Animations
            </Link>
          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <div className="divider-accent mx-12" />

      {/* ── Feature cards ───────────────────────────────────────────── */}
      <section className="px-6 py-24 max-w-6xl mx-auto w-full">
        <header className="mb-16 text-center">
          <p
            className="text-xs font-bold tracking-[0.35em] uppercase mb-3"
            style={{ color: 'var(--accent)' }}
          >
            The Process
          </p>
          <h2
            className="font-display font-black uppercase"
            style={{
              fontSize: 'clamp(1.5rem, 5vw, 3rem)',
              color: 'var(--fg)',
              letterSpacing: '0.08em',
            }}
          >
            How the Resurrection Works
          </h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 – Sketch */}
          <Link
            href="/sketch"
            className="card-themed rounded-xl p-8 flex flex-col gap-5 group"
          >
            <div
              className="text-4xl w-14 h-14 flex items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--accent-faint)' }}
            >
              🧪
            </div>
            <div>
              <p
                className="text-xs font-bold tracking-[0.3em] uppercase mb-1"
                style={{ color: 'var(--accent)' }}
              >
                I — Sketch
              </p>
              <h3
                className="font-display font-bold uppercase text-xl mb-3"
                style={{ color: 'var(--fg)' }}
              >
                The Laboratory
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--fg-muted)' }}
              >
                Assemble your creature part by part. Draw each body segment on
                its own canvas — head, torso, limbs — then export as SVG for
                later use.
              </p>
            </div>
            <span
              className="mt-auto text-xs font-semibold tracking-widest uppercase group-hover:translate-x-1 transition-transform inline-flex items-center gap-1"
              style={{ color: 'var(--accent)' }}
            >
              Open Canvas →
            </span>
          </Link>

          {/* Card 2 – Capture */}
          <Link
            href="/capture"
            className="card-themed rounded-xl p-8 flex flex-col gap-5 group"
          >
            <div
              className="text-4xl w-14 h-14 flex items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--accent-faint)' }}
            >
              📡
            </div>
            <div>
              <p
                className="text-xs font-bold tracking-[0.3em] uppercase mb-1"
                style={{ color: 'var(--accent)' }}
              >
                II — Capture
              </p>
              <h3
                className="font-display font-bold uppercase text-xl mb-3"
                style={{ color: 'var(--fg)' }}
              >
                The Ritual
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--fg-muted)' }}
              >
                Harness pose landmarks from a webcam or uploaded video. The
                bones obey. Landmark frames are recorded and saved for playback.
              </p>
            </div>
            <span
              className="mt-auto text-xs font-semibold tracking-widest uppercase group-hover:translate-x-1 transition-transform inline-flex items-center gap-1"
              style={{ color: 'var(--accent)' }}
            >
              Start Capture →
            </span>
          </Link>

          {/* Card 3 – Console */}
          <Link
            href="/console"
            className="card-themed rounded-xl p-8 flex flex-col gap-5 group"
          >
            <div
              className="text-4xl w-14 h-14 flex items-center justify-center rounded-lg"
              style={{ backgroundColor: 'var(--accent-faint)' }}
            >
              ⚡
            </div>
            <div>
              <p
                className="text-xs font-bold tracking-[0.3em] uppercase mb-1"
                style={{ color: 'var(--accent)' }}
              >
                III — Animate
              </p>
              <h3
                className="font-display font-bold uppercase text-xl mb-3"
                style={{ color: 'var(--fg)' }}
              >
                The Awakening
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--fg-muted)' }}
              >
                Fuse your sketches with captured motion. Adjust anchors. Scale
                each limb. Your creation rises — animated and alive.
              </p>
            </div>
            <span
              className="mt-auto text-xs font-semibold tracking-widest uppercase group-hover:translate-x-1 transition-transform inline-flex items-center gap-1"
              style={{ color: 'var(--accent)' }}
            >
              Open Console →
            </span>
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer
        className="border-t px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs tracking-wider"
        style={{
          borderColor: 'var(--border)',
          color: 'var(--fg-muted)',
        }}
      >
        <span>
          <span
            className="font-display font-bold uppercase"
            style={{ color: 'var(--accent)' }}
          >
            Living Sketch
          </span>{' '}
          — Pose-Driven Animation Studio
        </span>
        <nav className="flex gap-6 uppercase">
          <Link href="/sketch" className="hover:opacity-80 transition-opacity">
            Sketch
          </Link>
          <Link href="/capture" className="hover:opacity-80 transition-opacity">
            Capture
          </Link>
          <Link href="/console" className="hover:opacity-80 transition-opacity">
            Console
          </Link>
          <Link href="/docs" className="hover:opacity-80 transition-opacity">
            Docs
          </Link>
        </nav>
      </footer>
    </main>
  );
}
