<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Living Sketch – Project Guidelines

## Overview

Pose-driven animation app migrated from React Native (Expo) to Next.js 16 + TypeScript. Draws SVG body-part sketches onto MediaPipe Pose Landmarker-detected skeletons.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4
- **State**: Zustand stores (NOT React Context)
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint 9 + Prettier
- **CI hooks**: Husky + lint-staged

## Architecture

- `app/` – Next.js App Router pages and API routes
- `components/` – React components, grouped by page scope first:
  - `components/shared/` – Used across multiple pages
    - `shared/ui/` – Toolbar, NavBar, NavLinks
    - `shared/icons/` – BrainIcon, BodyRunningIcon, BodyStandingIcon, PersonFrontIcon, PersonBackIcon
  - `components/sketch/` – Sketch page only
    - `sketch/canvas/` – SketchCanvas
    - `sketch/icons/` – LayoutBodyIcon, DrawScalpelIcon, ColorPaletteIcon
    - `sketch/body-thumbnail.tsx`, `sketch/sketch-constants.ts`
  - `components/extract/` – Extract page only
    - `extract/canvas/` – PoseCanvas
    - `extract/icons/` – JarIcon, FridgeClosedIcon, FridgeOpenIcon, PulseIcon, ScalpelTrimIcon, CircularSawIcon
  - `components/console/` – Console page only
    - `console/canvas/` – AnimationCanvas
    - `console/controls/` – FileList, ScaleControls, ShiftControls
    - `console/icons/` – PanelIcon, FilesIcon, ShiftIcon, ScaleIcon, PreviewIcon
- `hooks/` – Custom React hooks (all client-side, 'use client')
- `lib/` – Pure logic: types, constants, utils, stores, storage
- `public/` – Static assets (SVG parts, icons)

## Conventions

- Use `'use client'` directive only where needed (hooks, interactive components)
- TensorFlow.js and webcam must be dynamically imported (no SSR)
- S3 operations go through API Route Handlers, never directly from client
- File names use kebab-case
- One export per file for components
- Use `@/` path alias for imports

## Build & Test

```bash
npm run dev        # development server
npm run build      # production build
npm run lint       # ESLint check
npm run format     # Prettier format
npm test           # Vitest run
npm run test:coverage  # with coverage
```

## Key Domain Concepts

- **Landmarks**: MediaPipe Pose Landmarker keypoints (33 body points)
- **Anchors**: Computed positions from landmarks for placing SVG drawings
- **Shift/Scale Factors**: User adjustments to body-part positioning/sizing
- **Body Parts**: 14 drawable segments (head, torso, arms, hands, legs, feet)

## Git Workflow

### Pre-implementation check (REQUIRED)

Before starting any new implementation task, always check whether the user has already made changes since the last commit:

```bash
git status
git diff --stat HEAD
```

- If there are **modified, deleted, or untracked files**: review them carefully, commit them with an accurate message, and push **before** writing any new code.
- Do this every time — never assume the working tree is clean.
- Never mix the user's existing work into a commit for a new implementation task.

### Committing completed work

After completing each task or set of related changes, always commit AND push:

```bash
git add -A && git commit -m "type(scope): description" && git push
```

Use conventional commit types — pick the most accurate one:

| Type       | When to use                                 |
| ---------- | ------------------------------------------- |
| `feat`     | New user-facing feature or capability       |
| `fix`      | Bug fix or correcting broken behaviour      |
| `refactor` | Code restructuring with no behaviour change |
| `style`    | CSS / visual-only changes, no logic         |
| `test`     | Adding or updating tests only               |
| `docs`     | Documentation or comments only              |
| `chore`    | Build config, tooling, dependency updates   |

Examples: `feat(sketch): add front/back toggle with glow animation`, `refactor(components): restructure into page-scoped directories`, `fix(console): resolve missing icon import after icons extraction`.

## Supabase Integration

- **Buckets**: `user_data` (private), `landmarks` (public), `svgs` (public)
- **Auth**: `@supabase/ssr` with cookie-based sessions via middleware
- **Server client**: `lib/supabase/server.ts` — per-request, authenticated via cookies
- **Admin client**: `lib/supabase/admin.ts` — uses `SUPABASE_SERVICE_ROLE_KEY`, bypasses RLS
- **Client**: `lib/supabase/client.ts` — browser-side, publishable key only
- API routes MUST use `supabaseAdmin ?? supabase` for storage writes (admin bypasses RLS; falls back to authenticated client)
- Never expose `SUPABASE_SERVICE_ROLE_KEY` client-side (no `NEXT_PUBLIC_` prefix)
- Storage paths follow `{user.id}/...` convention

## Code Review Checklist

After implementing new features, always review for:

1. **Supabase compatibility** — verify all storage operations use the admin client fallback pattern; confirm target bucket exists (`user_data`, `landmarks`, `svgs`); validate auth flow (server client for user identity, admin for storage writes)
2. **Existing code integration** — check imports resolve to existing modules; verify Zustand store shapes match consumers; confirm API route request/response contracts match client-side fetch calls
3. **Type safety** — run `npx tsc --noEmit` to catch type errors before committing
4. **Lint** — run `npm run lint` before committing

## Testing Rules

- Run `npm test` after every implementation to verify nothing is broken
- New utility functions, stores, and reusable components MUST have corresponding test files
- Test files live in `__tests__/` directories alongside the code they test
- Use Vitest globals (`describe`, `it`, `expect`, `vi`) — no manual imports needed
- Mock browser APIs (e.g. `matchMedia`, `canvas.getContext`) where required
- Aim for meaningful coverage: test state transitions, edge cases, and user interactions

## Documentation Rules

- After adding or changing features, update `app/docs/page.tsx` to reflect changes
- Keep `README.md` in sync with the current tech stack, scripts, and project structure
- Document new domain concepts in the "Key Domain Concepts" section above
- The `app/docs/page.tsx` file is the in-app documentation page — keep its `sections` array current

### When to update documentation

Update the relevant README(s) and/or `docs/` files when any of these change:

| Changed area                         | Files to update                                                    |
| ------------------------------------ | ------------------------------------------------------------------ |
| `app/*/page.tsx` — page features     | `app/README.md` (page section), `app/docs/page.tsx`                |
| `app/api/` — API route added/changed | `app/README.md` (API Routes section)                               |
| `components/` — new component        | `components/README.md`                                             |
| `components/` — directory structure  | `components/README.md`, root `README.md` (Project Structure)       |
| `hooks/` — new or changed hook       | `hooks/README.md`                                                  |
| `lib/` — new module or type          | `lib/README.md`                                                    |
| `lib/3d/` — any 3D pipeline change   | `lib/README.md` (3d section), `docs/3d-pipeline-architecture.md`   |
| New processing pipeline              | New file in `docs/` (e.g. `docs/{name}-pipeline.md`)               |
| Supabase auth or storage changes     | `docs/supabase-integration.md`, `app/README.md`                    |
| New Supabase bucket                  | `AGENTS.md` (Supabase Integration), `docs/supabase-integration.md` |

### Directory README files

Each major directory has a README. Keep these current:

- `app/README.md` — pages, layouts, auth, API routes
- `components/README.md` — all components by page scope
- `hooks/README.md` — all custom hooks
- `lib/README.md` — types, constants, stores, supabase, utils, 3d

### Pipeline architecture docs (`docs/`)

Each major data processing pipeline has a dedicated doc:

- `docs/sketch-svg-pipeline.md` — drawing → canvas → export → Supabase
- `docs/landmark-extraction-pipeline.md` — video → MediaPipe → pre-processing → Supabase
- `docs/svg-anchor-rendering-pipeline.md` — landmark JSON → anchors → Canvas 2D rendering
- `docs/3d-pipeline-architecture.md` — 3D transform pipeline (lib/3d/)
- `docs/supabase-integration.md` — client factories, auth, storage, API patterns

## CI/CD Pipeline

## CI/CD Pipeline

**Vercel** is the sole deployment platform. **GitHub Actions** runs CI — it does not deploy.

### GitHub Actions (CI only)

One workflow runs on every push and pull request to `master`:

| Workflow | File                       | Trigger                | Jobs                             |
| -------- | -------------------------- | ---------------------- | -------------------------------- |
| CI       | `.github/workflows/ci.yml` | Push or PR to `master` | Lint → type-check → test → build |

The build step mirrors the Vercel build: no static-export flags, standard SSR mode. CI must pass before merging to `master`.

Required repo secrets (Settings → Secrets → Actions):

| Secret                                         | Value                    |
| ---------------------------------------------- | ------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`                     | Supabase project URL     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase publishable key |

### Vercel (Deployment)

Vercel auto-deploys on push to `master` (production) and on pull request branches (preview). All features work on Vercel: auth, API routes, server actions, middleware.

Configure these environment variables in the Vercel dashboard:

| Variable                                       | Notes                                       |
| ---------------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                     | Supabase project URL                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase publishable key                    |
| `SUPABASE_SERVICE_ROLE_KEY`                    | Service role key — never expose client-side |

### Local Development

`npm run dev` is unaffected by CI/CD. `next.config.ts` uses standard SSR mode locally.

## Commit & Push Workflow

After ALL files have been updated (code, tests, docs, README):

1. Run `npx tsc --noEmit` — fix any type errors
2. Run `npm run lint` — fix any lint issues
3. Run `npm test` — ensure all tests pass
4. Commit and push:

```bash
git add -A && git commit -m "type(scope): description" && git push
```

Always complete the full validate → test → commit → push cycle. Never leave uncommitted changes.
