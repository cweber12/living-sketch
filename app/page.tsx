import Link from 'next/link';

export default async function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[88vh] flex-col items-center justify-center px-6 py-24 text-center">
        <div className="flex max-w-4xl flex-col items-center gap-8">
          {/* Overline */}
          <p className="text-accent text-xs font-bold tracking-[0.35em] uppercase">
            Reanimation Studio
          </p>

          {/* Main headline */}
          <h1
            className="font-display glow-accent text-foreground leading-none font-bold tracking-[0.06em] uppercase"
            style={{ fontSize: 'clamp(3rem, 12vw, 9rem)' }}
          >
            It&apos;s <span className="text-accent">Alive.</span>
          </h1>

          {/* Divider */}
          <div className="divider-accent w-48" />

          {/* Sub-copy */}
          <p className="text-muted max-w-lg text-lg leading-relaxed sm:text-xl">
            Draw the parts. Extract the motion.
            <br />
            Watch your creation <em className="text-foreground">wake.</em>
          </p>

          {/* CTAs */}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/sketch"
              className="btn-primary rounded px-8 py-3 text-sm tracking-widest uppercase"
            >
              Enter the Lab
            </Link>
            <Link
              href="/console"
              className="btn-ghost rounded px-8 py-3 text-sm font-semibold tracking-widest uppercase"
            >
              View Animations
            </Link>
          </div>
        </div>
      </section>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <div className="divider-accent mx-12" />

      {/* ── Feature cards ───────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <header className="mb-16 text-center">
          <p className="text-accent mb-3 text-xs font-bold tracking-[0.35em] uppercase">
            The Process
          </p>
          <h2
            className="font-display text-foreground font-bold tracking-[0.08em] uppercase"
            style={{ fontSize: 'clamp(1.5rem, 5vw, 3rem)' }}
          >
            How the Resurrection Works
          </h2>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card 1 – Sketch */}
          <Link
            href="/sketch"
            className="card-themed group flex flex-col gap-5 rounded-xl p-8"
          >
            <div className="bg-accent-faint flex h-14 w-14 items-center justify-center rounded-lg">
              {/* Flask / laboratory icon */}
              <svg
                className="text-accent"
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M10 4h8M11 4v8l-5 10a1.5 1.5 0 001.4 2h13.2a1.5 1.5 0 001.4-2L17 12V4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="19" r="1.2" fill="currentColor" />
                <circle cx="16" cy="17" r="0.9" fill="currentColor" />
                <circle cx="18" cy="20" r="1.1" fill="currentColor" />
              </svg>
            </div>
            <div>
              <p className="text-accent mb-1 text-xs font-bold tracking-[0.3em] uppercase">
                I — Sketch
              </p>
              <h3 className="font-display text-foreground mb-3 text-xl font-bold uppercase">
                The Laboratory
              </h3>
              <p className="text-muted text-sm leading-relaxed">
                Assemble your creature part by part. Draw each body segment on
                its own canvas — head, torso, limbs — then export as SVG for
                later use.
              </p>
            </div>
            <span className="text-accent mt-auto inline-flex items-center gap-1 text-xs font-semibold tracking-widest uppercase transition-transform group-hover:translate-x-1">
              Open Canvas →
            </span>
          </Link>

          {/* Card 2 – Extract */}
          <Link
            href="/extract"
            className="card-themed group flex flex-col gap-5 rounded-xl p-8"
          >
            <div className="bg-accent-faint flex h-14 w-14 items-center justify-center rounded-lg">
              {/* Signal / pose-capture icon */}
              <svg
                className="text-accent"
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="14" cy="14" r="3" fill="currentColor" />
                <path
                  d="M6.5 21.5a10.5 10.5 0 0115 0M9.5 18.5a6 6 0 019 0"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M14 11V6M14 6l-2 2M14 6l2 2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-accent mb-1 text-xs font-bold tracking-[0.3em] uppercase">
                II — Extract
              </p>
              <h3 className="font-display text-foreground mb-3 text-xl font-bold uppercase">
                The Ritual
              </h3>
              <p className="text-muted text-sm leading-relaxed">
                Harness pose landmarks from a webcam or uploaded video. The
                bones obey. Landmark frames are recorded and saved for playback.
              </p>
            </div>
            <span className="text-accent mt-auto inline-flex items-center gap-1 text-xs font-semibold tracking-widest uppercase transition-transform group-hover:translate-x-1">
              Start Extract →
            </span>
          </Link>

          {/* Card 3 – Console */}
          <Link
            href="/console"
            className="card-themed group flex flex-col gap-5 rounded-xl p-8"
          >
            <div className="bg-accent-faint flex h-14 w-14 items-center justify-center rounded-lg">
              {/* Lightning bolt / awakening icon */}
              <svg
                className="text-accent"
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M16 3L6 16h9l-3 9 12-14h-9l3-8z"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-accent mb-1 text-xs font-bold tracking-[0.3em] uppercase">
                III — Re-Animate
              </p>
              <h3 className="font-display text-foreground mb-3 text-xl font-bold uppercase">
                The Awakening
              </h3>
              <p className="text-muted text-sm leading-relaxed">
                Fuse your sketches with captured motion. Adjust anchors. Scale
                each limb. Your creation rises — animated and alive.
              </p>
            </div>
            <span className="text-accent mt-auto inline-flex items-center gap-1 text-xs font-semibold tracking-widest uppercase transition-transform group-hover:translate-x-1">
              Open Console →
            </span>
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-edge text-muted flex flex-col items-center justify-between gap-4 border-t px-6 py-8 text-xs tracking-wider sm:flex-row">
        <span>
          <span className="font-display text-accent font-bold uppercase">
            Living Sketch
          </span>{' '}
          — Pose-Driven Animation Studio
        </span>
        <nav className="flex gap-6 uppercase">
          <Link href="/sketch" className="transition-opacity hover:opacity-80">
            Sketch
          </Link>
          <Link href="/extract" className="transition-opacity hover:opacity-80">
            Extract
          </Link>
          <Link href="/console" className="transition-opacity hover:opacity-80">
            Console
          </Link>
          <Link href="/docs" className="transition-opacity hover:opacity-80">
            Docs
          </Link>
        </nav>
      </footer>
    </main>
  );
}
