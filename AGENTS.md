<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Living Sketch – Project Guidelines

Pose-driven animation app migrated from React Native (Expo) to Next.js 16 + TypeScript. Draws SVG body-part sketches onto MediaPipe Pose Landmarker-detected skeletons.

For deep workflow guidance (full commit workflow, CI/CD, documentation update tables, README maintenance), see [`docs/contributing.md`](docs/contributing.md).

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
  - `components/shared/` – Used across multiple pages (`shared/ui/`, `shared/icons/`)
  - `components/sketch/` – Sketch page only (canvas, toolbar, icons, body-thumbnail, sketch-constants)
  - `components/extract/` – Extract page only (canvas, icons)
  - `components/console/` – Console page only (canvas, controls, icons)
- `hooks/` – Custom React hooks (all client-side, `'use client'`)
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

After completing a task: `git add -A && git commit -m "type(scope): description" && git push`. Conventional commit types, the full validate→test→commit→push cycle, and CI/CD details live in [`docs/contributing.md`](docs/contributing.md).

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

After implementing new features, review for:

1. **Supabase compatibility** — verify all storage operations use the admin client fallback pattern; confirm target bucket exists; validate auth flow
2. **Existing code integration** — check imports resolve; verify Zustand store shapes match consumers; confirm API request/response contracts
3. **Type safety** — `npx tsc --noEmit`
4. **Lint** — `npm run lint`

## Testing Rules

- Run `npm test` after every implementation to verify nothing is broken
- New utility functions, stores, and reusable components MUST have corresponding test files
- Test files live in `__tests__/` directories alongside the code they test
- Use Vitest globals (`describe`, `it`, `expect`, `vi`) — no manual imports needed
- Mock browser APIs (e.g. `matchMedia`, `canvas.getContext`) where required
- Aim for meaningful coverage: test state transitions, edge cases, and user interactions

## Documentation Rules (summary)

- After adding or changing features: update `app/docs/page.tsx`.
- New domain concepts: add to the **Key Domain Concepts** section above.
- For the full README/docs update table and pipeline doc inventory, see [`docs/contributing.md`](docs/contributing.md).
