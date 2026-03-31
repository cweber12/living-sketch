import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Living Sketch — Documentation',
  description: 'Feature documentation for the Living Sketch app.',
};

const sections = [
  {
    title: 'Sketch',
    items: [
      '14-part body grid — head, torso, upper/lower arms, hands, upper/lower legs, feet',
      'Arms-up (8-column) and Arms-down (4-column) grid layouts',
      'Single-part focus mode with prev/next navigation and body thumbnail',
      'Drawing tools: pen (perfect-freehand), line, rectangle, circle, ellipse',
      'Eraser mode with destination-out compositing',
      'Adjustable brush size, colour picker, undo (40-step stack per canvas)',
      'Front/back sides — each of the 28 canvases exports as WebP',
      'Save button uploads all sketches to Supabase via /api/storage/upload',
    ],
  },
  {
    title: 'Capture',
    items: [
      'MediaPipe Pose Landmarker (Lite, float16) with GPU delegate',
      'Webcam (getUserMedia) or uploaded video as detection source',
      'Detection loop at configurable FPS via requestAnimationFrame',
      'Module-level singleton landmarker — instant on re-navigation',
      'Live skeleton overlay (PoseCanvas) during detection',
      'Animated skeleton preview after capture completes',
      'Upload landmark frames to Supabase via /api/storage/landmarks',
    ],
  },
  {
    title: 'Console',
    items: [
      'Browse saved sketch sets and landmark captures',
      'List files from Supabase storage buckets',
    ],
  },
  {
    title: 'Toolbar',
    items: [
      'Shared responsive component used on Sketch and Capture pages',
      'Side mode (left column) on screens ≥ 640 px',
      'Top mode (horizontal row) on screens < 640 px',
      'Toggle between side/top on desktop via mode-switch button',
      'Collapse/expand with smooth CSS transitions',
      'SegmentedControl generic toggle for any set of options',
    ],
  },
  {
    title: 'Authentication & Storage',
    items: [
      'Supabase Auth with @supabase/ssr cookie-based sessions',
      'Three storage buckets: svgs (public), landmarks (public), user_data (private)',
      'API routes use admin client (bypasses RLS) with authenticated fallback',
      'Storage paths scoped to user ID',
    ],
  },
  {
    title: 'Tech Stack',
    items: [
      'Next.js 16 App Router + React 19',
      'TypeScript strict mode',
      'Tailwind CSS v4 with CSS custom property theming',
      'Zustand for global state (landmarks, anchors, factors)',
      'Vitest + React Testing Library',
      'ESLint 9 + Prettier, Husky + lint-staged',
    ],
  },
];

export default function DocsPage() {
  return (
    <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 overflow-y-auto">
      <h1
        className="text-2xl font-display font-bold uppercase tracking-widest mb-6"
        style={{ color: 'var(--fg)' }}
      >
        Documentation
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>
        Living Sketch is a pose-driven animation app. Draw SVG body-part
        sketches, capture pose landmarks from video, and animate skeletons in
        real time.
      </p>

      {sections.map((section) => (
        <section key={section.title} className="mb-8">
          <h2
            className="text-base font-display font-bold uppercase tracking-widest mb-3"
            style={{ color: 'var(--accent)' }}
          >
            {section.title}
          </h2>
          <ul className="list-disc list-inside flex flex-col gap-1.5">
            {section.items.map((item) => (
              <li
                key={item}
                className="text-sm leading-relaxed"
                style={{ color: 'var(--fg)' }}
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <hr className="my-8" style={{ borderColor: 'var(--border)' }} />
      <p
        className="text-xs uppercase tracking-widest"
        style={{ color: 'var(--fg-muted)' }}
      >
        Last updated automatically by agent workflow.
      </p>
    </main>
  );
}
