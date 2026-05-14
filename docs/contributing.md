# Contributing — Workflow, CI/CD, and Documentation Rules

This document holds the deep workflow guidance. `AGENTS.md` (always loaded) keeps the everyday conventions; everything in here is referenced from there when needed.

## Commit Message Conventions

After each task or set of related changes, commit and push:

```bash
git add -A && git commit -m "type(scope): description" && git push
```

Pick the most accurate conventional type:

| Type       | When to use                                 |
| ---------- | ------------------------------------------- |
| `feat`     | New user-facing feature or capability       |
| `fix`      | Bug fix or correcting broken behaviour      |
| `refactor` | Code restructuring with no behaviour change |
| `style`    | CSS / visual-only changes, no logic         |
| `test`     | Adding or updating tests only               |
| `docs`     | Documentation or comments only              |
| `chore`    | Build config, tooling, dependency updates   |

Examples:

- `feat(sketch): add front/back toggle with glow animation`
- `refactor(components): restructure into page-scoped directories`
- `fix(console): resolve missing icon import after icons extraction`

## Commit & Push Workflow

After **all** files have been updated (code, tests, docs, README):

1. `npx tsc --noEmit` — fix any type errors
2. `npm run lint` — fix any lint issues
3. `npm test` — ensure all tests pass
4. Commit and push (see above)

Always complete the full validate → test → commit → push cycle. Never leave uncommitted changes.

## Documentation Rules

- After adding or changing features, update `app/docs/page.tsx` to reflect changes.
- Keep `README.md` in sync with the current tech stack, scripts, and project structure.
- Document new domain concepts in `AGENTS.md`'s **Key Domain Concepts** section.
- `app/docs/page.tsx` is the in-app documentation page — keep its `sections` array current.

### When to update documentation

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

- `app/README.md` — pages, layouts, auth, API routes
- `components/README.md` — all components by page scope
- `hooks/README.md` — all custom hooks
- `lib/README.md` — types, constants, stores, supabase, utils, 3d

### Pipeline architecture docs (`docs/`)

- `docs/sketch-svg-pipeline.md` — drawing → canvas → export → Supabase
- `docs/landmark-extraction-pipeline.md` — video → MediaPipe → pre-processing → Supabase
- `docs/svg-anchor-rendering-pipeline.md` — landmark JSON → anchors → Canvas 2D rendering
- `docs/3d-pipeline-architecture.md` — 3D transform pipeline (`lib/3d/`)
- `docs/supabase-integration.md` — client factories, auth, storage, API patterns

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

Vercel dashboard env vars:

| Variable                                       | Notes                                       |
| ---------------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                     | Supabase project URL                        |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase publishable key                    |
| `SUPABASE_SERVICE_ROLE_KEY`                    | Service role key — never expose client-side |

### Local Development

`npm run dev` is unaffected by CI/CD. `next.config.ts` uses standard SSR mode locally.
