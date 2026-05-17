---
applyTo: 'app/sketch/**,components/sketch/**,hooks/use-sketch-canvas-rig.ts'
---

# Sketch Page — Agent Context

> **Keep this file up to date.** Any change to the sketch page — new state, new toolbar action, new canvas behaviour, modified session keys, modified save flow — must be reflected here before the task is closed.

The sketch page lets users draw custom artwork onto 14 body-part canvases (× 2 sides = 28 total), then save the result to Supabase for use in the animation pipeline. Every canvas is a fixed 400×400px internal buffer displayed inside a responsive CSS grid. The artwork is composited onto pose-detected skeletons in the console/animation pipeline.

> For the auto-generated dependency graph, entry points, and exclusive dependencies, see [`docs/modules/sketch.md`](../../docs/modules/sketch.md). Run `npm run arch` to refresh.

## File Map

| Thing                                                                           | Path                                                                                                      |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Page                                                                            | `app/sketch/page.tsx`                                                                                     |
| Canvas component                                                                | `components/sketch/canvas/sketch-canvas.tsx`                                                              |
| Canvas rig hook                                                                 | `hooks/use-sketch-canvas-rig.ts`                                                                          |
| Operating header (top bar)                                                      | `components/sketch/toolbar/operating-header.tsx` (`OperatingHeader`, `ArmPose` + `ViewMode` type exports) |
| Tool rail (persistent left/bottom palette)                                      | `components/sketch/toolbar/tool-rail.tsx`                                                                 |
| Rail/header button primitive                                                    | `components/sketch/toolbar/rail-button.tsx`                                                               |
| Anchored popover primitive (sketch-local)                                       | `components/sketch/toolbar/popover.tsx`                                                                   |
| Body thumbnail (single-part nav)                                                | `components/sketch/body-thumbnail.tsx`                                                                    |
| Specimen plate + corner brackets (decorative frame)                             | `components/sketch/specimen-plate.tsx` (`SpecimenPlate`, `SpecimenBrackets`)                              |
| Sketch icons                                                                    | `components/sketch/icons/`                                                                                |
| Grid areas, part labels, proportions, parts order                               | `components/sketch/sketch-constants.ts`                                                                   |
| Drawing defaults (`DEFAULT_BRUSH`, `DEFAULT_COLOR_LIGHT`, `DEFAULT_COLOR_DARK`) | `components/sketch/sketch-constants.ts`                                                                   |
| Front-to-back mirror map                                                        | `MIRROR_PART_MAP` inside `app/sketch/page.tsx` (not in sketch-constants)                                  |
| Arm part lists for rotation                                                     | `LEFT_ARM_PARTS`, `RIGHT_ARM_PARTS` inside `app/sketch/page.tsx`                                          |
| Session state key                                                               | `SESSION_STATE_KEY = 'sketch-page-state'` (top of `page.tsx`)                                             |
| Canvas session key                                                              | `SESSION_KEY = 'sketch-canvases'` (inside `use-sketch-canvas-rig.ts`)                                     |

> The sketch page does **not** use `ToolbarLayout` / `PageToolbar` from `components/shared/toolbar/`. Those primitives are still used by the extract and console pages. The sketch page owns its chrome via `OperatingHeader` + `ToolRail`.

## Toolbar Architecture

Sketch chrome = `OperatingHeader` + `ToolRail`. Read those component files for current tab structure and button behaviors. Popover open-state (`brushOpen`, `colorOpen`, `zoomOpen`, `partsOpen`) is owned by `page.tsx` and passed as `open` / `onToggle` / `onClose` props; popovers portal to `document.body`.

### `tool` vs `isEraser` — two independent state variables

`tool: ShapeTool` (`'pen' | 'line' | 'rect' | 'circle' | 'ellipse'`) and `isEraser: boolean` are tracked separately:

- Selecting a shape does **not** activate or deactivate eraser.
- Activating eraser does **not** change the selected shape tool.
- `SketchCanvas` receives both props and reconciles at draw time: when `isEraser` is `true`, drawing always uses pen-path mode with `destination-out` compositing, regardless of `tool`. The selected shape is preserved and reactivates when eraser is turned off.

`usedColors` only accumulates entries when `isEraser` is `false` — eraser strokes do not add to color history. The array is capped at 12 entries (`slice(-12)`); the toolbar shows the last 6 as swatches.

## Body-Grid Canvas System

- 14 body parts × 2 sides = **28 `SketchCanvas` instances always mounted**. Only the active `side`'s canvases are `visible`; the other side's are `hidden` (not unmounted, so pixel data is preserved).
- CSS Grid layout string templates: `GRID_ARMS_UP` / `GRID_ARMS_DOWN` in `sketch-constants.ts`. Grid area names map to body parts via `GRID_AREA`.
- `DEFAULT_CANVAS_SIZE = 110` (CSS px) is the baseline grid unit. `effectiveU = DEFAULT_CANVAS_SIZE * zoom` is the actual grid unit used when building column/row track strings. **Never apply CSS `zoom:` or `transform: scale()` to the grid** — it breaks coordinate mapping and webkit layout.
- Grid column/row sizes are calculated inline in `page.tsx` from `effectiveU` with per-part multipliers (`armColUp`, `legCol`, etc.).
- `zoom` initialises at `1` on desktop and `1.5` on mobile (`window.innerWidth < 768`), so the head and torso fill the initial mobile viewport.
- **Anatomy note:** left body parts appear on the right side of the screen (anatomical anterior view / camera mirror). `GRID_AREA` keys reflect this: `leftUpperArm` → area `luarm` (right side of grid).
- `PART_PROPORTIONS` in `sketch-constants.ts` defines the display aspect ratio (w/h multipliers) for each part — e.g. torso is `{ w: 2.3, h: 2.6 }`, head is `{ w: 1, h: 1 }`. These drive grid track sizing and the zoom-canvas aspect ratio in single-part mode.
- The body grid is wrapped in **`<SpecimenPlate>`** (from `components/sketch/specimen-plate.tsx`) — purely decorative: 4 accent-colored corner reticle ticks + a monospace "Plate · Anterior/Posterior" caption. No outer border. The single-part canvas is wrapped with **`<SpecimenBrackets>`** — 4 accent L-shapes sitting on the canvas corners. Both are `pointer-events: none` so they never interfere with drawing.

`SketchCanvas` props are typed in the component file. Key behavioral note: `onStrokeEnd` triggers `saveToSession()`, which serialises all 28 canvases on every stroke — intentional for session durability but heavier than it appears.

## Single-Part (Zoom) Mode

Activated by the **`Whole / Detail`** tab in `OperatingHeader` (`viewMode: 'single'`). When `Detail` is active, a part-picker button appears next to the tab — clicking it opens a popover listing all 14 parts.

### Layout

The single-part block in `page.tsx` renders a 4-row column inside the canvas stage:

1. **Top bar:** an "← Whole" exit pill on the left (sets `viewMode='body'`), the centered mono plate label `PLATE · {SIDE} · {FOCUSED PART}` (focused part in accent), and a spacer that balances the exit pill width so the label stays optically centered.
2. **Canvas row:** desktop-only labeled prev/next pills flank the canvas (`← {PART_LABEL[prevPart]}` / `{PART_LABEL[nextPart]} →`). The canvas itself is wrapped with `SpecimenBrackets` for surgical-microscope corner cues. Below the canvas: a mono tabular page count `01 / 14`.
3. **Mobile-only nav row:** full-width prev/next pills labeled the same way (`md:hidden`).
4. **Body map:** `BodyThumbnail` rendered **inline**, centered below the canvas. Tapping any cell in the map calls `selectPart(part)` and switches focus. It is no longer floating / fixed-positioned.

The shared pill style is defined as `navPillStyle` + `mobileNavPillStyle` inside `SketchPage` and re-used across all five buttons (exit, desktop prev/next, mobile prev/next). All pills are monospace, 0.1em letter-spacing, accent-themed on hover via the existing `.toolbar-action-btn` class.

`prevPart` / `nextPart` are derived from `PARTS_ORDER` with wrap-around: `(focusIdx ± 1 + PARTS_ORDER.length) % PARTS_ORDER.length`.

### Canvas behavior

- Renders one large `SketchCanvas` for the focused part, registered via `setZoomCanvasRef`.
- The zoom canvas aspect ratio is derived from `PART_PROPORTIONS[focusPart]`. For arm parts when `armPose === 'up'`, `w` and `h` are swapped — arm canvases are landscape in T-pose orientation because the part is drawn horizontally.
- `setZoomCanvasRef` copies pixel data from the primary (body-grid) canvas on mount, then copies back on unmount. Strokes in zoom mode are therefore seamlessly reflected in body-grid mode when the user exits.
- **The `T-Pose / Hanging` tab is disabled in single-part mode** to prevent rotation while the zoom canvas is active.

## Canvas Rig (`useSketchCanvasRig`)

All canvas refs and history live in **refs, not state** — mutations do not trigger re-renders.

### Two-ref system

The rig maintains two ref maps:

- `primaryRefs` — always points to the body-grid `<canvas>` elements (always mounted).
- `refs` — the "active draw target". Normally mirrors `primaryRefs`. When a zoom canvas mounts, `refs[key]` is temporarily redirected to the zoom canvas element. When the zoom canvas unmounts, `refs[key]` is restored to `primaryRefs[key]`. All draw operations use `refs`, so they transparently target whichever canvas is active.

### API

| Function                                               | What it does                                                                                                                                                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setCanvasRef(side, part, el)`                         | Registers a primary canvas into both `refs` and `primaryRefs`; restores pixel data from `sessionStorage` on mount                                                                                   |
| `setZoomCanvasRef(side, part, el)`                     | On mount: copies pixels from `primaryRefs[key]` → zoom canvas, redirects `refs[key]` to zoom canvas. On unmount: copies pixels back from zoom → `primaryRefs[key]`, restores `refs[key]` to primary |
| `pushUndoSnapshot(side, part)`                         | Captures `ImageData` before each stroke begins                                                                                                                                                      |
| `undo()`                                               | Cross-canvas undo — pops from `globalHistory` to find which canvas to restore, then pops that canvas's `undoStacks` entry                                                                           |
| `clearAll()`                                           | Clears all 28 canvas buffers                                                                                                                                                                        |
| `exportAll()`                                          | Returns `{ front: { [part]: dataURL }, back: { [part]: dataURL } }` as WebP                                                                                                                         |
| `mirrorCopyCanvas(fromSide, fromPart, toSide, toPart)` | Horizontally flips and copies pixel data between canvases                                                                                                                                           |
| `rotatePartCanvas(side, part, degrees)`                | In-place 90° CW or CCW rotation of one canvas buffer                                                                                                                                                |
| `saveToSession()`                                      | Serialises all canvas data URLs to `sessionStorage['sketch-canvases']`                                                                                                                              |

### Undo system

Undo is **cross-canvas and order-preserving**. Two data structures work together:

- `undoStacks: Map<CanvasKey, ImageData[]>` — per-canvas stack, capped at 40 entries each.
- `globalHistory: Array<{side, part}>` — flat ordered list of every stroke across all canvases, capped at `40 × 28` entries.

`undo()` pops the last `{side, part}` from `globalHistory`, then pops from that canvas's `undoStacks` and restores the `ImageData`. This means undo respects true draw order across all 28 canvases, not "undo on the currently focused canvas".

## Side Switching and Back-Side Initialisation

- **First switch to `back`:** `mirrorCopyCanvas` runs for all 14 parts using `MIRROR_PART_MAP` defined in `page.tsx`. Left/right limbs swap (anatomically a rotated figure shows opposite limbs); head and torso map to themselves.
- **Subsequent switches to `back`:** `setShowCopyFront(true)` displays a dismissible **"Mirror Anterior"** pill inline in `OperatingHeader` (next to the side tabs). **Accepting** runs `mirrorCopyCanvas` for all 14 parts again, overwriting any existing back-side artwork. **Dismissing** sets `showCopyFront = false` with no copy performed.
- `backInitialised` is a `useRef<boolean>` — persists across re-renders but resets on page reload.

## Arm Pose and Mobile Orientation

`armPose: 'up' | 'down'` controls whether arms are drawn in T-pose (horizontal, `'up'`) or arms-at-sides (vertical, `'down'`).

Toggling pose calls `rotatePartCanvas` on all 6 arm/hand canvases on **both** sides simultaneously. `LEFT_ARM_PARTS` and `RIGHT_ARM_PARTS` use opposite degree signs — see inline comment in `page.tsx` for the anatomical reason.

**Desktop:** `armPose` is changed only by the `T-Pose / Hanging` tab in `OperatingHeader` — no auto-rotation.

**Mobile:** A `matchMedia('(orientation: landscape)')` listener auto-rotates arm canvases when the device is physically rotated. Landscape → `'up'`; portrait → `'down'`. This listener is only registered when `isMobile` is true.

`armPose` initialises as `'up'` for SSR safety. A `useEffect` after mount reads the actual device orientation and corrects it. No canvas rotation is performed at this point — the canvases are still loading from session storage.

**Stroke color also follows the OS color scheme.** A `prefers-color-scheme` media query listener updates `color` automatically when the OS dark/light mode changes. The user can still override manually at any time.

**On save:** `rotateSquareDataURL` is applied to the **exported data URLs only** — it does not modify the canvas buffers in the DOM. The displayed arm canvases remain in their current orientation; only the uploaded images are normalised to T-pose. The animation pipeline always expects T-pose orientation.

## Session Persistence

| Key                   | Contents                                                                                              | Cleared on |
| --------------------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| `'sketch-page-state'` | UI state JSON: `side`, `viewMode`, `focusIdx`, `zoom`, `brushSize`, `color`, `isEraser`, `usedColors` | Reload     |
| `'sketch-canvases'`   | Canvas pixel data as WebP data URLs keyed by `'${side}-${part}'`                                      | Reload     |

`armPose` is intentionally **not** persisted — it must always be derived from actual device orientation on mount, never from a stale stored value.

Reload is detected via `PerformanceNavigationTiming.type === 'reload'`. On reload, both session keys are cleared and state starts fresh.

## Save Flow

```
handleSave()
  → exportAll()                              // reads ImageData from all 28 canvas buffers → WebP data URLs
  → if armPose === 'down':
      rotateSquareDataURL(url, ±90°)         // rotate exported URLs only; canvas buffers unchanged
        right arm parts: +90° (CW)
        left arm parts:  −90° (CCW)
  → POST /api/storage/upload
      body: { images: { front, back }, setName: ISO-timestamp string }
  → Supabase storage (svgs bucket)
```

`saveStatus` cycles through `'idle' → 'saving' → 'saved' | 'error' → 'idle'` with a timeout reset. An HTTP 200 with an empty `paths` array is treated as an error (browser doesn't support WebP canvas encoding).

## Key Gotchas

- `brushSize` is in **CSS pixels**. `SketchCanvas` scales it to canvas-buffer pixels using `scaleRef` (the ratio of `CANVAS_SIZE / getBoundingClientRect().width`). Do not pass raw canvas coordinates to brush size calculations.
- `DEFAULT_COLOR_LIGHT` / `DEFAULT_COLOR_DARK` / `DEFAULT_BRUSH` are the canonical drawing defaults, exported from `sketch-constants.ts`. The page imports them from there.
- The grid has no explicit `gap` class — gap is set via inline `style` (`2px` mobile / `4px` desktop) because it participates in the grid track calculations.
- `PARTS_ORDER` in `sketch-constants.ts` defines the tab order for single-part navigation and must stay consistent with `BodyPartName`.
- `focusPart = PARTS_ORDER[focusIdx]` — always derive the part name from the index, never store the name directly.
- `MIRROR_PART_MAP` lives in `page.tsx`, not in `sketch-constants.ts`. If you need to reference or change mirroring logic, look in the page file.
- `rotateSquareDataURL` only rotates the exported data URLs before upload — it does not mutate canvas buffers. Do not assume the canvases have been re-rotated after a save.
