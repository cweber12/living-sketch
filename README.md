# Living Sketch

Pose-driven animation app that draws SVG body-part sketches onto MediaPipe-detected skeletons. Migrated from React Native (Expo) to Next.js 16 + TypeScript.

## Features

- **Sketch** — Draw on a 14-part body grid (head, torso, arms, hands, legs, feet). Supports pen, line, rectangle, circle, and ellipse tools. Arms-up and arms-down layouts with a single-part focus mode.
- **Capture** — Detect poses from webcam or uploaded video using MediaPipe Pose Landmarker. Records landmark frames for playback and upload.
- **Console** — Browse and manage saved sketches and landmark captures stored in Supabase.
- **Responsive Toolbar** — Sidebar (left column) on desktop, top bar on mobile. Users can toggle between modes on larger screens.

## Tech Stack

| Layer          | Tool                                   |
| -------------- | -------------------------------------- |
| Framework      | Next.js 16 (App Router) + React 19     |
| Language       | TypeScript (strict)                    |
| Styling        | Tailwind CSS v4                        |
| State          | Zustand                                |
| Pose Detection | MediaPipe Pose Landmarker (WASM + GPU) |
| Drawing        | perfect-freehand + Canvas 2D API       |
| Storage        | Supabase (Auth + Storage buckets)      |
| Testing        | Vitest + React Testing Library         |
| Linting        | ESLint 9 + Prettier                    |

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Fill in SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SECRET_KEY

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command                 | Description          |
| ----------------------- | -------------------- |
| `npm run dev`           | Development server   |
| `npm run build`         | Production build     |
| `npm run lint`          | ESLint check         |
| `npm run format`        | Prettier format      |
| `npm test`              | Run Vitest           |
| `npm run test:coverage` | Vitest with coverage |

## Project Structure

```
app/                  Next.js App Router pages & API routes
  sketch/             Body-part sketch editor
  capture/            Webcam/video pose detection
  console/            Saved files browser
  docs/               Documentation page
  api/storage/        Upload endpoints (SVGs, landmarks)
components/
  canvas/             SketchCanvas, PoseCanvas, grid renderers
  controls/           Brush, color, scale, shift controls
  ui/                 Toolbar, NavBar, SegmentedControl, buttons
hooks/                Client-side hooks (pose detection, canvas rig)
lib/
  constants/          Anchor/landmark descriptors, colors, sizes
  stores/             Zustand stores (landmarks, anchors, factors)
  storage/            Supabase client wrappers
  types.ts            Shared TypeScript types
  utils/              Pure logic (anchors, drawing, SVG, smoothing)
public/               Static assets (SVG parts, icons)
```

## Architecture

- **Sketch page**: 14-part CSS Grid with `SketchCanvas` components. Each canvas uses `perfect-freehand` for pen strokes and Canvas 2D for shape tools. Undo stack (40 steps per canvas) managed by `useSketchCanvasRig`.
- **Capture page**: MediaPipe Pose Landmarker loaded as a module-level singleton for instant re-navigation. Detection loop runs via `requestAnimationFrame` at configurable FPS.
- **Toolbar**: Shared `<Toolbar>` component — renders as a collapsible sidebar on desktop or a top bar on mobile. Large screens can toggle between modes.
- **Storage**: Supabase buckets (`svgs`, `landmarks`, `user_data`). API routes use the admin client with RLS bypass; falls back to the authenticated client.

## Domain Concepts

| Term                | Meaning                                                                            |
| ------------------- | ---------------------------------------------------------------------------------- |
| Landmarks           | MediaPipe Pose Landmarker 33-keypoint arrays                                       |
| Anchors             | Computed positions from landmarks for placing SVG drawings                         |
| Shift/Scale Factors | User adjustments to body-part positioning and sizing                               |
| Body Parts          | 14 drawable segments: head, torso, 4 arm segments, 2 hands, 4 leg segments, 2 feet |

## License

Private — all rights reserved.
