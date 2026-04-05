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
      'Front/back sides with mirrored init — action bar toggle with animated flip',
      'Session storage persistence across navigation',
      'Colors history dropdown (appears after first stroke, stores up to 12 recent colors)',
      'Brush size indicator uses accent color; eraser indicator uses danger color',
      'Save button uploads all sketches to Supabase via /api/storage/upload',
    ],
  },
  {
    title: 'Extract',
    items: [
      'MediaPipe Pose Landmarker (Lite, float16) with GPU delegate',
      'Live source (webcam/getUserMedia) or Browse (video upload) with head/jar icons',
      'Detection loop at configurable FPS via requestAnimationFrame',
      'Module-level singleton landmarker — instant on re-navigation',
      'Live skeleton overlay (PoseCanvas) during detection',
      'Animated skeleton preview after extraction completes',
      'One-Euro filter smoothing and per-landmark confidence-based interpolation',
      'Archive landmark frames to Supabase via /api/storage/landmarks',
      'Re-Extract to run detection again on same or new input',
    ],
  },
  {
    title: 'Re-Animate (Console)',
    items: [
      'Load a landmark archive (Activity) and an SVG sketch set (Creations) to animate',
      'Activity view (brain icon): lists saved landmark JSON files from Supabase',
      'Creations view (person icon): lists saved SVG sketch sets from Supabase',
      'Playback at 30 fps — SVG body parts rendered onto Canvas 2D via affine transforms',
      'Front/back facing detected per body section (upper and lower independently)',
      'Shift controls — move body part groups (torso, head, limbs) in X/Y',
      'Scale controls — resize body part groups independently',
      'Shift and scale changes apply immediately on pause for real-time tuning',
      'EMA-smoothed torso dimensions and ear distance for stable frame-to-frame sizing',
    ],
  },
  {
    title: 'Toolbar',
    items: [
      'Shared responsive component used on Sketch and Extract pages',
      'Side mode (left column) on screens ≥ 1024 px',
      'Top mode (horizontal row) on screens < 1024 px',
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
