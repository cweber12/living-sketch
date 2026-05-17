---
applyTo: 'app/console/**,components/console/**,hooks/use-cache-svgs.ts,lib/3d/**'
---

# Console Module — Agent Context

For the current Console module dependency graph, entry points, exclusive dependencies,
and storage bridge, see [`docs/modules/console.md`](../../docs/modules/console.md).

> Re-generate with `npm run arch` after any structural change.
> Do not manually edit `docs/modules/console.md` — it is auto-generated.

## Working Rules

- Read `docs/modules/console.md` before making multi-file or architectural changes.
- Prefer changes inside Console-owned files (`app/console/`, `components/console/`, `hooks/use-cache-svgs.ts`, `lib/3d/`).
- Do not edit Sketch or Extract module files unless the task explicitly requires it.
- Do not change shared dependencies (`lib/types.ts`, `lib/utils/frame-filter.ts`, `lib/utils/landmark-smoother.ts`, `lib/supabase/`) without checking the full architecture in `docs/architecture.md`.
- Preserve the `GET /api/storage/landmarks` and `GET /api/storage/files` contracts unless the task specifically changes them.
- Do not manually edit files in `docs/modules/`.

## lib/3d ownership note

`lib/3d/**` is currently treated as Console-owned because it is Console-exclusive per the import graph.
If another module starts importing from `lib/3d/`, update the `applyTo` pattern above and the
`MODULE_DEFS` ownership config in `scripts/gen-arch.mjs`. The generator will emit a boundary warning
in `docs/modules/console.md` if this condition changes.

## Notes

<!-- Add further behavioral rules, architecture decisions, and invariants here. -->
