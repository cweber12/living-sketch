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

- **Landmarks**: MoveNet keypoints (17 body points + 2 estimated feet)
- **Anchors**: Computed positions from landmarks for placing SVG drawings
- **Shift/Scale Factors**: User adjustments to body-part positioning/sizing
- **Body Parts**: 14 drawable segments (head, torso, arms, hands, legs, feet)

## Git Workflow

After completing each task or set of related changes, always commit AND push:

```bash
git add -A && git commit -m "type(scope): description" && git push
```

Use conventional commit types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`.
