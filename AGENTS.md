<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Living Sketch – Project Guidelines

## Overview

Pose-driven animation app migrated from React Native (Expo) to Next.js 16 + TypeScript. Draws SVG body-part sketches onto TensorFlow.js MoveNet-detected skeletons.

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
- `components/` – React components (ui/, canvas/, controls/)
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

After completing each task or set of related changes, always commit AND push:

```bash
git add -A && git commit -m "type(scope): description" && git push
```

Use conventional commit types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`.

## Supabase Integration

- **Buckets**: `user_data` (private), `landmarks` (public), `svgs` (public)
- **Auth**: `@supabase/ssr` with cookie-based sessions via middleware
- **Server client**: `lib/supabase/server.ts` — per-request, authenticated via cookies
- **Admin client**: `lib/supabase/admin.ts` — uses `SUPABASE_SECRET_KEY`, bypasses RLS
- **Client**: `lib/supabase/client.ts` — browser-side, publishable key only
- API routes MUST use `supabaseAdmin ?? supabase` for storage writes (admin bypasses RLS; falls back to authenticated client)
- Never expose `SUPABASE_SECRET_KEY` client-side (no `NEXT_PUBLIC_` prefix)
- Storage paths follow `{user.id}/...` convention

## Code Review Checklist

After implementing new features, always review for:

1. **Supabase compatibility** — verify all storage operations use the admin client fallback pattern; confirm target bucket exists (`user_data`, `landmarks`, `svgs`); validate auth flow (server client for user identity, admin for storage writes)
2. **Existing code integration** — check imports resolve to existing modules; verify Zustand store shapes match consumers; confirm API route request/response contracts match client-side fetch calls
3. **Type safety** — run `npx tsc --noEmit` to catch type errors before committing
4. **Lint** — run `npm run lint` before committing
