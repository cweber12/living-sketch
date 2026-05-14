@AGENTS.md

## Agent skills

### Issue tracker

Issues live in GitHub Issues (`cweber12/living-sketch`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Sketch page

When working on `hooks/use-sketch-canvas-rig.ts`, read `.github/instructions/sketch-page.instructions.md` — it documents the full canvas rig, toolbar architecture, session persistence, and save flow for the sketch page. The instructions are auto-loaded by Claude Code when working inside `app/sketch/` or `components/sketch/`.
