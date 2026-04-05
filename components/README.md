# components/

React components organized by page scope. Components used on only one page live in that page's subdirectory. Components used across multiple pages live in `shared/`.

---

## Directory Structure

```
components/
  shared/               Used on multiple pages
    ui/                 Toolbar, NavBar, NavLinks
    icons/              Shared icon components
  sketch/               Sketch page only
    canvas/             SketchCanvas
    icons/              Sketch-specific icons
    body-thumbnail.tsx  Body grid mini-map for single-part mode
    sketch-constants.ts Grid layout constants and part metadata
  extract/              Extract page only
    canvas/             PoseCanvas
    icons/              Extract-specific icons
  console/              Console page only
    canvas/             AnimationCanvas
    controls/           FileList, ShiftControls, ScaleControls
    icons/              Console-specific icons
```

---

## Shared (`shared/`)

### `shared/ui/toolbar.tsx`

The main interactive layout component, used on Sketch, Extract, and Console pages.

**Exports:** `Toolbar`, `ToolbarDropdown`, `SegmentedControl`, `ToolbarMode`, `useToolbarContext`

**`Toolbar`** — container component. Renders a collapsible side column on desktop (≥1024px) or a top bar on mobile. Provides panel expansion, mode toggling, and layout measurements to children via context.

Props:

- `sideWidth?: number` — collapsed width in side mode (default 48px)
- `onModeChange?: (mode: ToolbarMode) => void`
- `openId?: string | null` — controlled panel open state
- `onOpenIdChange?: (id: string | null) => void`

**`ToolbarDropdown`** — descriptor component. Does not render on its own; Toolbar reads its props to build the panel layout.

Props:

- `id: string` — unique identifier for this panel
- `label: string` — text shown on the button
- `icon?: ReactNode` — icon shown on the collapsed button
- `children: ReactNode` — panel content

**`SegmentedControl`** — generic toggle control for a fixed set of options.

Props:

- `options: T[]`
- `value: T` — current selection
- `onChange: (v: T) => void`
- `labels?: Record<string, string>` — display overrides
- `dangerValue?: T` — option styled as danger (red) when active

**`ToolbarMode`** — `'side' | 'top'`

Layout behavior:

- Side mode (desktop default): vertical icon column on the left; panels slide out to the right
- Top mode (mobile default): horizontal icon row at top; panels expand downward
- Desktop can toggle between modes with a mode-switch button

### `shared/ui/nav-bar.tsx`

Top navigation bar rendered on every page via `app/layout.tsx`. Contains the NavLinks component.

### `shared/ui/nav-links.tsx`

Navigation links: Sketch, Extract, Console, Docs.

### `shared/icons/brain.tsx` — `BrainIcon`

Used on Extract and Console pages. Accepts `size?: number`.

### `shared/icons/body.tsx` — `BodyRunningIcon`, `BodyStandingIcon`

Used on Extract and Sketch pages. `BodyStandingIcon` accepts `size?: string` (e.g. `"20px"`) and `color?: string`.

### `shared/icons/person-view.tsx` — `PersonFrontIcon`, `PersonBackIcon`

Used on Sketch and Console pages. Both accept `size?: number`.

---

## Sketch (`sketch/`)

### `sketch/canvas/sketch-canvas.tsx` — `SketchCanvas`

Single drawing canvas for one body part on one side (front or back).

**Exported type:** `ShapeTool = 'pen' | 'line' | 'rect' | 'circle' | 'ellipse'`

Props:

- `side: Side`, `part: BodyPartName`
- `brushSize: number`, `color: string`, `isEraser: boolean`, `tool: ShapeTool`
- `onMount(side, part, el)` — registers canvas ref with the rig
- `onStrokeStart(side, part)` — triggers undo snapshot
- `onStrokeEnd?(side, part)` — triggers session save

Canvas is always 400×400 pixels internally; scales to its CSS container via bounding rect measurements.

Drawing per tool:

- **Pen:** `perfect-freehand` → quadratic bezier path → `ctx.fill()`
- **Shapes:** preview on drag, commit on pointer-up
- **Eraser:** `globalCompositeOperation = 'destination-out'`

A custom SVG cursor reflects the current brush size, color, and eraser state.

### `sketch/body-thumbnail.tsx` — `BodyThumbnail`

Mini body grid for single-part focus mode. Shows all 14 body parts at reduced size; clicking any part focuses it.

Props: `{ focusPart: BodyPartName; onSelect: (part: BodyPartName) => void }`

Uses `GRID_ARMS_DOWN` layout from `sketch-constants.ts`.

### `sketch/sketch-constants.ts`

Exports grid layout and part metadata used by the sketch page and `BodyThumbnail`.

| Export             | Type                           | Description                                                      |
| ------------------ | ------------------------------ | ---------------------------------------------------------------- |
| `GRID_ARMS_UP`     | `string`                       | CSS `grid-template-areas` string for 8-column (arms-up) layout   |
| `GRID_ARMS_DOWN`   | `string`                       | CSS `grid-template-areas` string for 4-column (arms-down) layout |
| `GRID_AREA`        | `Record<BodyPartName, string>` | CSS grid-area name per body part                                 |
| `PART_LABEL`       | `Record<BodyPartName, string>` | Human-readable label per part                                    |
| `PART_PROPORTIONS` | `Record<BodyPartName, {w, h}>` | Aspect ratio (width/height) per part for single-focus sizing     |
| `PARTS_ORDER`      | `BodyPartName[]`               | Drawing order used for single-part navigation                    |

### `sketch/icons/`

Icons used only in the sketch toolbar:

- `layout-body.tsx` — `LayoutBodyIcon` (grid layout panel)
- `draw-scalpel.tsx` — `DrawScalpelIcon` (drawing tools panel)
- `color-palette.tsx` — `ColorPaletteIcon` (colors panel)
- `table.tsx` — `TableIcon`
- `test-tube.tsx` — `TestTubeIcon` (color display in colors panel; accepts `size` and `color` props)

---

## Extract (`extract/`)

### `extract/canvas/pose-canvas.tsx` — `PoseCanvas`

Transparent canvas overlay that renders the detected skeleton over the video source.

Props: `{ width, height, landmarks: LandmarkFrame | null, className? }`

Renders:

- Colored dots at each of the 33 keypoints (left = pink, right = blue, center = green)
- Lines connecting keypoints using `CONNECTED_KEYPOINTS` from `lib/constants/landmark-descriptors`
- Adapts colors to light/dark mode via `prefers-color-scheme` media query

### `extract/icons/`

Icons used in the extract toolbar:

- `jar.tsx` — `JarIcon` (archive/save)
- `fridge.tsx` — `FridgeClosedIcon`, `FridgeOpenIcon` (storage state)
- `pulse.tsx` — `PulseIcon` (detection active indicator)
- `scalpel-trim.tsx` — `ScalpelTrimIcon`
- `circular-saw.tsx` — `CircularSawIcon`

---

## Console (`console/`)

### `console/canvas/animation-canvas.tsx` — `AnimationCanvas`

Renders animated body-part SVGs over landmark frames at 30 fps.

Props:

- `frames: LandmarkFrame[]`
- `svgImages: Record<string, HTMLImageElement>`
- `shifts: ShiftFactors`, `scales: ScaleFactors`
- `playing: boolean`
- `width, height: number`
- `showAnchors?: boolean` — debug anchor visualization
- `bgColor?: string`, `previewScale?: number`

Animation loop:

1. `requestAnimationFrame` advances frame index every ~33ms
2. Each frame: `renderFrame(scaledLandmarks, svgImages, renderContext)` from `lib/utils/render-part-svg`
3. `TorsoDimensions` (EMA torso size) and `EarDistance` (EMA head width) are reset on each new play session

When paused, re-renders the current frame whenever `shifts` or `scales` change.

### `console/controls/file-list.tsx` — `FileList`

Dropdown list for browsing stored files. Fetches from `/api/storage/list?bucket=...` on mount. Supports per-file delete via `/api/storage/files`.

Props: `{ bucket, selected, onSelect, formatLabel?, onDelete? }`

### `console/controls/scale-controls.tsx` — `ScaleControls`

Sliders for adjusting SVG scale per body-part group (head, arm, hand, leg, foot). Reads/writes `useScaleFactorsStore`. X and Y sliders allow non-uniform scaling (0–10, step 0.01).

### `console/controls/shift-controls.tsx` — `ShiftControls`

Sliders for adjusting SVG position per anchor point (torso, head, shoulder, elbow, wrist, hip, knee, ankle, foot). Reads/writes `useShiftFactorsStore`. X and Y sliders (−10 to +10, step 0.1).

### `console/icons/`

Icons used in the console toolbar:

- `panel.tsx` — `PanelIcon`
- `files-icon.tsx` — `FilesIcon`
- `shift-icon.tsx` — `ShiftIcon`
- `scale-icon.tsx` — `ScaleIcon`
- `preview-icon.tsx` — `PreviewIcon`

---

## Conventions

- **One export per file** for components
- **Kebab-case filenames**
- **`'use client'`** at the top of any component that uses hooks, browser APIs, or event handlers
- **No page-level logic in components** — components receive data and callbacks via props; stores accessed where needed
- SVG icons are inline SVG — no external sprite sheets or icon fonts
- Icons accept `size` (number of pixels) and/or `color` props as appropriate
