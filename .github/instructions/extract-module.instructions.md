---
applyTo: 'app/extract/**,components/extract/**,hooks/use-pose-detection.ts'
---

# Extract Module — Agent Context

For the current Extract module dependency graph, entry points, exclusive dependencies,
and storage bridge, see [`docs/modules/extract.md`](../../docs/modules/extract.md).

> Re-generate with `npm run arch` after any structural change.
> Do not manually edit `docs/modules/extract.md` — it is auto-generated.

## Working Rules

- Read `docs/modules/extract.md` before making multi-file or architectural changes.
- Prefer changes inside Extract-owned files (`app/extract/`, `components/extract/`, `hooks/use-pose-detection.ts`).
- Do not edit Sketch or Console module files unless the task explicitly requires it.
- Do not change shared dependencies (`lib/types.ts`, `lib/utils/frame-filter.ts`, `lib/utils/landmark-smoother.ts`, `lib/supabase/`) without checking the full architecture in `docs/architecture.md`.
- Preserve the `POST /api/storage/landmarks` contract (shape, path, auth) unless the task specifically changes it.
- Do not manually edit files in `docs/modules/`.

## Notes

<!-- Add further behavioral rules, architecture decisions, and invariants here. -->
