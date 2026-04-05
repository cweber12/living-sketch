# Living Sketch

[![CI](https://github.com/cweber12/living-sketch/actions/workflows/ci.yml/badge.svg)](https://github.com/cweber12/living-sketch/actions/workflows/ci.yml)

A pose-driven animation studio built with Next.js 16 + TypeScript. Draw hand-crafted SVG body-part sketches, capture human pose data from video using MediaPipe, and play back the sketches animated over detected skeletons.

## Feature Areas

| Feature     | Description                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Sketch**  | Draw on a 14-part body grid. Tools: pen, line, rectangle, circle, ellipse, eraser. Front and back sides with session persistence. |
| **Extract** | Detect poses from webcam or uploaded video via MediaPipe Pose Landmarker. Filters and saves landmark frames to Supabase.          |
| **Console** | Load saved landmark captures and SVG sketch sets, preview the combined animation, and adjust body-part positioning and scale.     |

## Tech Stack

| Layer          | Tool                                           |
| -------------- | ---------------------------------------------- |
| Framework      | Next.js 16 (App Router) + React 19             |
| Language       | TypeScript (strict mode)                       |
| Styling        | Tailwind CSS v4 + CSS custom properties        |
| State          | Zustand                                        |
| Pose Detection | MediaPipe Pose Landmarker (WASM, GPU delegate) |
| Drawing        | `perfect-freehand` + Canvas 2D API             |
| Storage        | Supabase Auth + Storage buckets                |
| Testing        | Vitest + React Testing Library                 |
| Linting        | ESLint 9 + Prettier + Husky + lint-staged      |

## Setup

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with three storage buckets created: `svgs`, `landmarks`, `user_data`

### Fork and Install

```bash
git clone https://github.com/your-org/living-sketch.git
cd living-sketch
npm install
```

### Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-service-role-key
```

| Variable                                       | Required | Description                                  |
| ---------------------------------------------- | -------- | -------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                     | Yes      | Supabase project URL                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Yes      | Supabase anon/publishable key (browser-safe) |
| `SUPABASE_SERVICE_ROLE_KEY`                    | Yes      | Service role key — server only, never public |

### Supabase Buckets

Create three storage buckets in your Supabase project:

| Bucket      | Access  | Purpose                          |
| ----------- | ------- | -------------------------------- |
| `svgs`      | Public  | SVG sketch sets (WebP data URLs) |
| `landmarks` | Public  | Landmark frame JSON files        |
| `user_data` | Private | Reserved for future user data    |

### Run

```bash
npm run dev       # development server at http://localhost:3000
npm run build     # production build
npm run lint      # ESLint check
npm run format    # Prettier format
npm test          # Vitest
npm run test:coverage  # Vitest with coverage report
```

## Project Structure

```
app/                  Next.js App Router pages and API routes
  sketch/             Body-part sketch editor
  extract/            Webcam/video pose detection and landmark capture
  console/            Animation playback and file management
  docs/               In-app documentation page
  login/ register/    Authentication forms
  actions/auth.ts     Server actions for login, register, logout
  api/storage/        API route handlers for upload, download, list, delete
components/
  shared/             Components used across multiple pages
    ui/               Toolbar, NavBar, NavLinks
    icons/            BrainIcon, BodyRunningIcon, BodyStandingIcon, PersonFrontIcon, PersonBackIcon
  sketch/             Sketch-page-only components
    canvas/           SketchCanvas
    icons/            LayoutBodyIcon, DrawScalpelIcon, ColorPaletteIcon
  extract/            Extract-page-only components
    canvas/           PoseCanvas
    icons/            JarIcon, FridgeClosedIcon, FridgeOpenIcon, PulseIcon, ScalpelTrimIcon, CircularSawIcon
  console/            Console-page-only components
    canvas/           AnimationCanvas
    controls/         FileList, ScaleControls, ShiftControls
    icons/            PanelIcon, FilesIcon, ShiftIcon, ScaleIcon, PreviewIcon
hooks/                Client-side React hooks
lib/
  3d/                 3D transform pipeline (transforms, hierarchy, smoothing)
  constants/          Anchor descriptors, landmark descriptors, sizes
  stores/             Zustand stores (landmarks, scale factors, shift factors)
  supabase/           Supabase client factories (browser, server, admin)
  utils/              Pure logic: anchors, drawing, SVG, smoothing, filters
  types.ts            Shared TypeScript types
public/               Static assets (SVG body parts, icons)
docs/                 Technical architecture documents
```

## Architecture Summary

### Sketch

14-part CSS Grid backed by 28 `SketchCanvas` canvases (14 parts × front/back). `perfect-freehand` handles pen pressure → stroke outline. Canvas 2D handles shape tools. `useSketchCanvasRig` manages canvas refs, a 40-step per-canvas undo stack, session storage persistence, and front/back mirroring.

### Extract

MediaPipe Pose Landmarker runs as a module-level singleton (no re-load on navigation). A `requestAnimationFrame` loop at 30 fps feeds video frames through `landmarker.detectForVideo()`. Frames are smoothed via One-Euro filter, validated, interpolated, and saved to Supabase (`landmarks` bucket) as JSON.

### Console

Loads a landmark file and an SVG sketch set, then renders them combined at 30 fps via `AnimationCanvas`. Body-part SVGs are positioned using a pipeline of affine transforms anchored to MediaPipe keypoints. `ShiftControls` and `ScaleControls` let users tune positioning in real time via Zustand stores.

### 3D Pipeline (lib/3d/)

A complete 3D transform pipeline is implemented in `lib/3d/`. It converts MediaPipe landmark frames to 3D scene coordinates, computes per-body-part transform matrices (position, orientation basis, dimensions), and applies temporal EMA smoothing. This pipeline is ready to drive a React Three Fiber scene as a future replacement for the current 2D Canvas rendering. See [docs/3d-pipeline-architecture.md](docs/3d-pipeline-architecture.md).

### Toolbar

`<Toolbar>` renders as a collapsible side column on desktop and a top bar on mobile. `<ToolbarDropdown>` and `<SegmentedControl>` are the main building blocks. Pages can also control which panel is open programmatically.

### Auth and Storage

Supabase Auth with `@supabase/ssr` cookie-based sessions. All storage writes go through API routes using the admin client (bypasses RLS), with an authenticated fallback. Storage paths follow `{userId}/{filename}` convention. The `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the browser.

## Domain Concepts

| Term             | Meaning                                                                              |
| ---------------- | ------------------------------------------------------------------------------------ |
| Landmarks        | MediaPipe Pose Landmarker output — 33 normalized keypoints per frame                 |
| Anchors          | 2D positions derived from landmarks for placing SVG body parts on canvas             |
| Body Parts       | 14 drawable segments: head, torso, 4 arm segments, 2 hands, 4 leg segments, 2 feet   |
| Shift Factors    | Per-joint position adjustments applied during SVG rendering                          |
| Scale Factors    | Per-group size adjustments applied during SVG rendering                              |
| Torso Dimensions | EMA-tracked torso width/height used to normalize all body-part sizing                |
| TemporalSmoother | EMA-based frame smoother for 3D transforms (position, orientation basis, dimensions) |

## CI/CD

**Vercel** is the sole deployment platform. **GitHub Actions** runs CI on every push and pull request — it does not deploy.

### CI (GitHub Actions)

Workflow: `.github/workflows/ci.yml`  
Trigger: push or PR to `master`  
Jobs: Lint → Type-check → Test → Build

Required repo secrets (Settings → Secrets → Actions):

| Secret                                         | Value                    |
| ---------------------------------------------- | ------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`                     | Supabase project URL     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase publishable key |

### Deployment (Vercel)

Vercel auto-deploys on push to `master`. Connect the repo in the Vercel dashboard and add these environment variables:

| Variable                                       | Notes                                       |
| ---------------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                     | Supabase project URL                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase publishable key                    |
| `SUPABASE_SERVICE_ROLE_KEY`                    | Service role key — never expose client-side |

## License

Private — all rights reserved.
