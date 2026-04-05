# Sketch and SVG Save Pipeline

## Purpose

This document describes the pipeline for creating and persisting body-part sketch artwork — from user input on the canvas to stored `.webp` files in Supabase.

## Scope

Covers: `app/sketch/page.tsx`, `components/sketch/canvas/sketch-canvas.tsx`, `hooks/use-sketch-canvas-rig.ts`, `app/api/storage/upload/route.ts`, and the relevant utilities and constants.

---

## Pipeline Overview

```
User pointer input
  → SketchCanvas (Canvas 2D drawing)
  → useSketchCanvasRig (canvas registry, undo, session persistence)
  → exportAll() → WebP data URLs (28 canvases)
  → arm rotation correction (if arms-down layout)
  → POST /api/storage/upload
  → Supabase svgs bucket
```

---

## Stage 1: Drawing Input

Each body part has one `<SketchCanvas>` per side (front and back) — 28 canvases total, each 400×400 pixels.

### Pen tool

1. `pointerdown` — starts stroke; `onStrokeStart` fires → `pushUndoSnapshot`
2. `pointermove` — collects input points (with pressure from `event.pressure`, fallback 0.5)
3. `pointerup` — `perfect-freehand.getStroke(points)` → outline polygon → `Path2D` → `ctx.fill()`
4. `onStrokeEnd` fires → `saveToSession`

### Shape tools (line, rect, circle, ellipse)

1. `pointerdown` — records start point
2. `pointermove` — redraws committed image + preview shape on each move
3. `pointerup` — commits final shape onto canvas

### Eraser

- Sets `ctx.globalCompositeOperation = 'destination-out'` before drawing
- Erased pixels become transparent

---

## Stage 2: Canvas Management (`useSketchCanvasRig`)

### Canvas registry

`setCanvasRef(side, part, el)` is called by each `SketchCanvas` on mount. The rig holds refs to all 28 canvases as a `Map<string, HTMLCanvasElement>`.

### Undo

- `pushUndoSnapshot(side, part)` captures the current canvas `ImageData` (via `getImageData`) before every stroke
- Each canvas maintains its own undo stack (max 40 entries)
- `undo()` pops from a global history (ordered by most recent across all canvases) and calls `putImageData` to restore

### Session persistence

`saveToSession()` iterates all registered canvases:

1. Exports each via `canvas.toDataURL('image/webp', 0.9)`
2. Skips blank canvases (all pixels alpha = 0)
3. Writes to `sessionStorage` with key `{side}-{part}`

`SketchCanvas` reads `sessionStorage` on mount to restore any existing drawing, so sketches survive page navigation.

### Front/back mirroring

On first navigation to the back side:

1. `mirrorCopyCanvas(fromSide, fromPart, toSide, backPart)` is called for all 14 parts
2. Mirror uses `ctx.translate(width, 0); ctx.scale(-1, 1)` to horizontally flip front artwork to back
3. L/R part names are swapped via `MIRROR_PART_MAP` (e.g. `rightUpperArm` → `leftUpperArm` on back)

---

## Stage 3: Export

`exportAll()` returns:

```typescript
{
  front: Record<BodyPartName, string>,  // data:image/webp;base64,...
  back:  Record<BodyPartName, string>,
}
```

Only non-blank canvases are included (missing keys = blank part).

### Arm orientation correction

If the user drew in arms-down layout mode, arm and hand canvases are in a rotated orientation relative to the T-pose expected by the animation pipeline. Before upload, these are corrected:

```typescript
// Right arm parts: rotate +90° CW
rotateSquareDataURL(dataUrl, 90);

// Left arm parts: rotate −90° CCW
rotateSquareDataURL(dataUrl, -90);
```

`rotateSquareDataURL` creates an off-screen 400×400 canvas, applies `ctx.rotate()`, and returns a new WebP data URL.

---

## Stage 4: Upload to Supabase

`POST /api/storage/upload`

**Request:**

```json
{
  "setName": "my-sketch-001",
  "images": {
    "front": { "head": "data:image/webp;base64,...", ... },
    "back":  { "head": "data:image/webp;base64,...", ... }
  }
}
```

**Server processing:**

1. Authenticate user via Supabase server client
2. Validate `setName` — alphanumeric, underscores, hyphens only
3. For each `{side}/{part}` entry: strip the `data:image/webp;base64,` header, decode base64 → `Buffer`
4. Upload buffer to `svgs/{userId}/{setName}/{partName}-{side}.webp`
5. Uses admin client (bypasses RLS) with authenticated client fallback

**Storage layout:**

```
svgs/
  {userId}/
    {setName}/
      head-front.webp
      head-back.webp
      torso-front.webp
      torso-back.webp
      ... (up to 28 files)
```

---

## Stage 5: Download (Console)

`GET /api/storage/upload?key={userId}/{setName}`

1. Lists all `.webp` files under the given folder in the `svgs` bucket
2. Downloads each file (returns raw bytes)
3. Converts each to `data:image/webp;base64,...`
4. Returns `{ images: { "head-front": "data:image/webp;base64,...", ... } }`

The console page splits the flat key map (`"head-front"`) into a structured `SvgParts` object, then passes it to `useCacheSvgs` to generate `HTMLImageElement` objects for rendering.

---

## Key Modules

| Module                                   | Role                                        |
| ---------------------------------------- | ------------------------------------------- |
| `app/sketch/page.tsx`                    | Orchestrates state, layout, handler wiring  |
| `components/sketch/canvas/sketch-canvas` | Drawing input, tool rendering per canvas    |
| `hooks/use-sketch-canvas-rig.ts`         | Canvas registry, undo, export, session save |
| `components/sketch/sketch-constants.ts`  | Grid layouts, part labels, proportions      |
| `app/api/storage/upload/route.ts`        | Upload/download SVG sets                    |
| `lib/supabase/admin.ts`                  | Admin client for RLS-bypass storage writes  |
| `perfect-freehand`                       | Pressure-sensitive pen stroke generation    |

---

## Data Flow Diagram

```
[User] pointer events
         ↓
[SketchCanvas] Canvas 2D drawing (per part, per side)
         ↓
[useSketchCanvasRig] undo snapshot → saveToSession (sessionStorage)
         ↓ (on Save)
[exportAll()] → { front: {...}, back: {...} } WebP data URLs
         ↓
[rotateSquareDataURL()] arm orientation correction (if arms-down)
         ↓
[POST /api/storage/upload] → buffer conversion → Supabase upload
         ↓
[svgs bucket] {userId}/{setName}/{partName}-{side}.webp
```

---

## Constraints and Design Decisions

- **Canvas size fixed at 400×400px** — provides enough resolution for detail while keeping export payload manageable
- **WebP format** — good compression with transparency support
- **Arms-down rotation correction** — ensures animation pipeline always receives T-pose oriented images regardless of how the user drew them
- **Session storage** — sketches persist across accidental navigation without requiring a save action
- **Blank canvas filtering** — avoids uploading empty files; the animation pipeline treats missing parts as invisible
- **L/R swap on back-side init** — anatomically correct: a rotated figure shows the opposite limbs
