# Architecture Map

_Generated 2026-05-17 — run `npm run arch` to refresh._

> Auto-generated. Do not edit by hand.
> Maps source files to roles, imports, exports, and reverse dependents.
> For focused per-module context (Sketch/Extract/Console), see `docs/modules/`.

## Contents

1. [Module Overview](#module-overview)
2. [Module Relationships](#module-relationships)
3. [Pages & Routes](#pages--routes)
4. [File Index](#file-index)
5. [Hot Modules](#hot-modules)
6. [Cross-cutting Dependencies](#cross-cutting-dependencies)

## Module Overview

| Group                 | Files | Description                                                               |
| --------------------- | ----- | ------------------------------------------------------------------------- |
| `./`                  | 1     | Root — Next.js middleware                                                 |
| `app/`                | 5     | Root app files (layout, error, globals)                                   |
| `app/actions/`        | 1     | Server actions (auth)                                                     |
| `app/api/`            | 5     | API Route Handlers (Supabase storage bridge)                              |
| `app/auth/`           | 1     | Auth callback                                                             |
| `app/console/`        | 2     | Console page                                                              |
| `app/docs/`           | 2     | Docs page                                                                 |
| `app/extract/`        | 2     | Extract page                                                              |
| `app/login/`          | 1     | Login page                                                                |
| `app/register/`       | 1     | Register page                                                             |
| `app/sketch/`         | 2     | Sketch page                                                               |
| `components/console/` | 13    | Console-specific components (animation canvas, toolbar, controls)         |
| `components/extract/` | 7     | Extract-specific components (pose canvas, icons)                          |
| `components/shared/`  | 27    | Shared UI chrome (toolbar, icons, nav)                                    |
| `components/sketch/`  | 28    | Sketch-specific components (canvas, toolbar, body-thumbnail)              |
| `hooks/`              | 5     | Custom React hooks — one per module + shared SVG cache                    |
| `lib/`                | 3     | Top-level lib files (types, theme, cn)                                    |
| `lib/3d/`             | 10    | 3D pipeline — coordinate transforms, part transforms, scene orchestration |
| `lib/constants/`      | 5     | Domain constants — body parts, anchor map, landmark names, sizes          |
| `lib/storage/`        | 1     | Storage barrel (empty — utilities imported directly)                      |
| `lib/stores/`         | 4     | Zustand stores — landmarks, scale factors, shift factors                  |
| `lib/supabase/`       | 4     | Supabase clients — server, admin, browser, middleware                     |
| `lib/utils/`          | 13    | Pure utility functions — frame processing, SVG rendering, anchor math     |

## Module Relationships

Sketch, Extract, and Console are architecturally isolated by page, components, and hooks.
They communicate exclusively through Supabase storage — there is no direct React state sharing.

### Boundaries

| Module      | Purpose                                                      | Owns                                                            |
| ----------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| **Sketch**  | Drawing and SVG logic, saving SVGs                           | `app/sketch, components/sketch, hooks/use-sketch-canvas-rig.ts` |
| **Extract** | Pose detection, video/webcam handling, saving pose landmarks | `app/extract, components/extract, hooks/use-pose-detection.ts`  |
| **Console** | SVG anchoring, rendering logic, fetching landmarks and SVGs  | `app/console, components/console, hooks/use-cache-svgs.ts`      |

### Storage Bridge

Module communication happens via API route fetch calls — not in the import graph.

| Producer | Route                             | Consumer                  |
| -------- | --------------------------------- | ------------------------- |
| Extract  | `POST /api/storage/landmarks`     | Console (reads via `GET`) |
| Sketch   | `POST /api/storage/upload`        | Console (reads via `GET`) |
| Console  | `POST /api/storage/animations`    | Console (reads back)      |
| —        | `GET /api/storage/files`, `/list` | Console (file listing)    |

### Functionally Shared (real logic, not just UI)

| File                             | Role  | Used by          | Exports                                                                                                                                                                                                                       |
| -------------------------------- | ----- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`                   | Types | extract, console | Keypoint, LandmarkFrame, Dimensions, PointAnchor, QuadAnchor, SegmentAnchor, HeadAnchor, PartAnchors, AnchorsMap, ShiftVector, ScaleVector, ShiftFactors, ScaleFactors, SvgParts, CaptureViewMode, StoredAnimation, FileEntry |
| `lib/utils/frame-filter.ts`      | Util  | extract, console | isFrameValid, lerpFrame, filterAndInterpolateFrames, interpolateLowConfidenceLandmarks, applyFrameInterval                                                                                                                    |
| `lib/utils/landmark-smoother.ts` | Util  | extract, console | SmootherConfig, DEFAULT_SMOOTHER_CONFIG, smoothLandmarkFrames                                                                                                                                                                 |

### Shared UI (cosmetic — toolbar chrome, icons, nav)

- `components/extract/icons/…` — extract, console
- `components/shared/icons/…` — extract, console
- `components/shared/toolbar/…` — extract, console
- `lib/constants/icons.ts` — sketch, extract, console

### Module-Exclusive Dependencies

Deps imported by exactly one module (no cross-module coupling):

| Module  | Exclusive dependencies                                                                                                                                                                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sketch  | `lib/constants/anchor-descriptors.ts`                                                                                                                                                                                       |
| Extract | `lib/constants/landmark-descriptors.ts`, `lib/stores/landmarks-store.ts`, `lib/utils/display-transform.ts`, `lib/utils/frame-crop.ts`                                                                                       |
| Console | `lib/stores/scale-factors-store.ts`, `lib/stores/shift-factors-store.ts`, `lib/utils/ear-distance.ts`, `lib/utils/pose-utils.ts`, `lib/utils/render-part-svg.ts`, `lib/utils/svg-utils.ts`, `lib/utils/torso-dimensions.ts` |

### Verdict

The modules are well-isolated at the component and hook level.

**Shared:**

- **UI chrome** (`components/shared/`, icon files) — cosmetic; expected.
- **Core types** — `lib/types.ts`: domain type library (LandmarkFrame, AnchorsMap, ShiftFactors, …). All modules depend on it.
- **Frame-processing pipeline** — `lib/utils/frame-filter.ts`, `lib/utils/landmark-smoother.ts` are shared between Extract and Console.
  Console re-processes the same landmark data Extract produces. Intentional pipeline reuse, not accidental coupling.

**Not shared (each module owns these exclusively):**

- **Sketch**: `lib/constants/anchor-descriptors.ts`
- **Extract**: `lib/constants/landmark-descriptors.ts`, `lib/stores/landmarks-store.ts`, `lib/utils/display-transform.ts`, `lib/utils/frame-crop.ts`
- **Console**: `lib/stores/scale-factors-store.ts`, `lib/stores/shift-factors-store.ts`, `lib/utils/ear-distance.ts`, `lib/utils/pose-utils.ts`, `lib/utils/render-part-svg.ts`, `lib/utils/svg-utils.ts`, `lib/utils/torso-dimensions.ts`

## Pages & Routes

| Route                     | File                                  | Type      |
| ------------------------- | ------------------------------------- | --------- |
| `/api/storage/animations` | `app/api/storage/animations/route.ts` | API Route |
| `/api/storage/files`      | `app/api/storage/files/route.ts`      | API Route |
| `/api/storage/landmarks`  | `app/api/storage/landmarks/route.ts`  | API Route |
| `/api/storage/list`       | `app/api/storage/list/route.ts`       | API Route |
| `/api/storage/upload`     | `app/api/storage/upload/route.ts`     | API Route |
| `/auth/callback`          | `app/auth/callback/route.ts`          | API Route |
| `/console`                | `app/console/layout.tsx`              | Layout    |
| `/console`                | `app/console/page.tsx`                | Page      |
| `/docs`                   | `app/docs/layout.tsx`                 | Layout    |
| `/docs`                   | `app/docs/page.tsx`                   | Page      |
| `/`                       | `app/error.tsx`                       | Next.js   |
| `/extract`                | `app/extract/layout.tsx`              | Layout    |
| `/extract`                | `app/extract/page.tsx`                | Page      |
| `/`                       | `app/layout.tsx`                      | Layout    |
| `/`                       | `app/loading.tsx`                     | Next.js   |
| `/login`                  | `app/login/page.tsx`                  | Page      |
| `/`                       | `app/not-found.tsx`                   | Next.js   |
| `/`                       | `app/page.tsx`                        | Page      |
| `/register`               | `app/register/page.tsx`               | Page      |
| `/sketch`                 | `app/sketch/layout.tsx`               | Layout    |
| `/sketch`                 | `app/sketch/page.tsx`                 | Page      |

## File Index

Grouped by sub-module. `[Role]` | exports | imports | imported by.
Icon leaf files are collapsed into a directory summary.

### `./` (1 files)

#### `middleware.ts` `[Middleware]`

exports: middleware, config

imports:

- `lib/supabase/middleware.ts`

packages: next

### `app/` (5 files)

#### `app/error.tsx` `[Next.js]`

exports: Error

#### `app/layout.tsx` `[Layout]`

exports: metadata, RootLayout

imports:

- `app/globals.css`
- `components/shared/nav/nav-bar.tsx`

packages: next

#### `app/loading.tsx` `[Next.js]`

exports: Loading

#### `app/not-found.tsx` `[Next.js]`

exports: NotFound

packages: next

#### `app/page.tsx` `[Page]`

exports: Home

packages: next

### `app/actions/` (1 files)

#### `app/actions/auth.ts` `[Server Action]`

exports: login, register, logout

imports:

- `lib/supabase/server.ts`

packages: next

imported by:

- `app/login/page.tsx`
- `app/register/page.tsx`
- `components/shared/nav/nav-bar.tsx`

### `app/api/` (5 files)

#### `app/api/storage/animations/route.ts` `[API Route]`

exports: POST, GET

imports:

- `lib/supabase/admin.ts`
- `lib/supabase/server.ts`
- `lib/types.ts`

packages: next

#### `app/api/storage/files/route.ts` `[API Route]`

exports: DELETE

imports:

- `lib/supabase/admin.ts`
- `lib/supabase/server.ts`

packages: next

#### `app/api/storage/landmarks/route.ts` `[API Route]`

exports: POST, GET

imports:

- `lib/supabase/admin.ts`
- `lib/supabase/server.ts`
- `lib/types.ts`

packages: next

#### `app/api/storage/list/route.ts` `[API Route]`

exports: GET

imports:

- `lib/supabase/admin.ts`
- `lib/supabase/server.ts`

packages: next

#### `app/api/storage/upload/route.ts` `[API Route]`

exports: GET, POST

imports:

- `hooks/use-sketch-canvas-rig.ts`
- `lib/constants/anchor-descriptors.ts`
- `lib/supabase/admin.ts`
- `lib/supabase/server.ts`

packages: next

### `app/auth/` (1 files)

#### `app/auth/callback/route.ts` `[API Route]`

exports: GET

imports:

- `lib/supabase/server.ts`

packages: next

### `app/console/` (2 files)

#### `app/console/layout.tsx` `[Layout]` _(console)_

exports: ConsoleLayout

#### `app/console/page.tsx` `[Page]` _(console)_

exports: ConsolePage

imports:

- `components/console/canvas/animation-canvas.tsx`
- `components/console/toolbar/collection.tsx`
- `components/console/toolbar/modify.tsx`
- `components/console/toolbar/preview.tsx`
- `components/shared/toolbar/toolbar-main.tsx`
- `components/shared/toolbar/use-dropdown.ts`
- `components/shared/toolbar/use-section-expand.ts`
- `hooks/use-cache-svgs.ts`
- `lib/stores/scale-factors-store.ts`
- `lib/stores/shift-factors-store.ts`
- `lib/types.ts`
- `lib/utils/frame-filter.ts`
- `lib/utils/landmark-smoother.ts`
- `lib/utils/pose-utils.ts`
- `lib/utils/torso-dimensions.ts`

packages: react, zustand

### `app/docs/` (2 files)

#### `app/docs/layout.tsx` `[Layout]`

exports: DocsLayout

#### `app/docs/page.tsx` `[Page]`

exports: metadata, DocsPage

packages: next

### `app/extract/` (2 files)

#### `app/extract/layout.tsx` `[Layout]` _(extract)_

exports: ExtractLayout

#### `app/extract/page.tsx` `[Page]` _(extract)_

exports: ExtractPage

imports:

- `components/extract/canvas/pose-canvas.tsx`
- `components/extract/icons/circular-saw.tsx`
- `components/extract/icons/pulse.tsx`
- `components/extract/icons/record.tsx`
- `components/shared/icons/brain.tsx`
- `components/shared/icons/chevron.tsx`
- `components/shared/icons/fridge.tsx`
- `components/shared/toolbar/toolbar-main.tsx`
- `hooks/use-pose-detection.ts`
- `lib/stores/landmarks-store.ts`
- `lib/types.ts`
- `lib/utils/frame-crop.ts`
- `lib/utils/frame-filter.ts`
- `lib/utils/landmark-smoother.ts`

packages: next, react

### `app/login/` (1 files)

#### `app/login/page.tsx` `[Page]`

exports: LoginPage

imports:

- `app/actions/auth.ts`

packages: next

### `app/register/` (1 files)

#### `app/register/page.tsx` `[Page]`

exports: RegisterPage

imports:

- `app/actions/auth.ts`

packages: next

### `app/sketch/` (2 files)

#### `app/sketch/layout.tsx` `[Layout]` _(sketch)_

exports: SketchLayout

#### `app/sketch/page.tsx` `[Page]` _(sketch)_

exports: SketchPage

imports:

- `components/shared/icons/navigate.tsx`
- `components/sketch/body-thumbnail.tsx`
- `components/sketch/canvas/sketch-canvas.tsx`
- `components/sketch/inspector-panel.tsx`
- `components/sketch/sketch-constants.ts`
- `components/sketch/specimen-plate.tsx`
- `components/sketch/status-strip.tsx`
- `components/sketch/toolbar/operating-header.tsx`
- `components/sketch/toolbar/tool-rail.tsx`
- `hooks/use-sketch-canvas-rig.ts`
- `lib/constants/anchor-descriptors.ts`

packages: react

### `components/console/` (13 files)

#### `components/console/canvas/animation-canvas.tsx` `[Canvas]` _(console)_

exports: AnimationCanvas

imports:

- `lib/types.ts`
- `lib/utils/ear-distance.ts`
- `lib/utils/render-part-svg.ts`
- `lib/utils/torso-dimensions.ts`

packages: react

imported by:

- `app/console/page.tsx`

#### `components/console/controls/file-list.tsx` `[Control]` _(console)_

exports: FileList

imports:

- `lib/types.ts`

packages: react

imported by:

- `components/console/toolbar/collection.tsx`

#### `components/console/controls/scale-controls.tsx` `[Control]` _(console)_

exports: ScaleControls

imports:

- `lib/stores/scale-factors-store.ts`
- `lib/types.ts`

packages: react

imported by:

- `components/console/toolbar/modify.tsx`

#### `components/console/controls/shift-controls.tsx` `[Control]` _(console)_

exports: ShiftControls

imports:

- `lib/stores/shift-factors-store.ts`
- `lib/types.ts`

packages: react

imported by:

- `components/console/toolbar/modify.tsx`

#### `components/console/icons/index.ts` `[Barrel]` _(console)_

exports: FilesIcon, PanelIcon, PreviewIcon, ScaleIcon, ShiftIcon

imports:

- `components/console/icons/files-icon.tsx`
- `components/console/icons/panel.tsx`
- `components/console/icons/preview-icon.tsx`
- `components/console/icons/scale-icon.tsx`
- `components/console/icons/shift-icon.tsx`

#### `components/console/toolbar/collection.tsx` `[Toolbar]` _(console)_

exports: CollectionSection

imports:

- `components/console/controls/file-list.tsx`
- `components/console/icons/files-icon.tsx`
- `components/extract/icons/pulse.tsx`
- `components/shared/icons/brain.tsx`
- `components/shared/icons/person.tsx`
- `components/shared/toolbar/index.tsx`
- `lib/types.ts`

imported by:

- `app/console/page.tsx`

#### `components/console/toolbar/modify.tsx` `[Toolbar]` _(console)_

exports: ModifySection

imports:

- `components/console/controls/scale-controls.tsx`
- `components/console/controls/shift-controls.tsx`
- `components/console/icons/panel.tsx`
- `components/console/icons/scale-icon.tsx`
- `components/console/icons/shift-icon.tsx`
- `components/shared/toolbar/index.tsx`

imported by:

- `app/console/page.tsx`

#### `components/console/toolbar/preview.tsx` `[Toolbar]` _(console)_

exports: DisplaySection

imports:

- `components/console/icons/preview-icon.tsx`
- `components/shared/toolbar/index.tsx`

imported by:

- `app/console/page.tsx`

**`components/console/icons/`** — 5 icon components `[Icon]`

All import `lib/constants/icons.ts` and/or `lucide-react`. Files: files-icon.tsx, panel.tsx, preview-icon.tsx, scale-icon.tsx, shift-icon.tsx

### `components/extract/` (7 files)

#### `components/extract/canvas/pose-canvas.tsx` `[Canvas]` _(extract)_

exports: PoseCanvas

imports:

- `lib/constants/landmark-descriptors.ts`
- `lib/theme.ts`
- `lib/types.ts`
- `lib/utils/display-transform.ts`

packages: react

imported by:

- `app/extract/page.tsx`

#### `components/extract/icons/index.ts` `[Barrel]` _(extract)_

exports: CircularSawIcon, JarIcon, PulseIcon, RecordIcon, ScalpelTrimIcon

imports:

- `components/extract/icons/circular-saw.tsx`
- `components/extract/icons/jar.tsx`
- `components/extract/icons/pulse.tsx`
- `components/extract/icons/record.tsx`
- `components/extract/icons/scalpel-trim.tsx`

**`components/extract/icons/`** — 5 icon components `[Icon]`

All import `lib/constants/icons.ts` and/or `lucide-react`. Files: circular-saw.tsx, jar.tsx, pulse.tsx, record.tsx, scalpel-trim.tsx

### `components/shared/` (27 files)

#### `components/shared/icons/index.ts` `[Barrel]`

exports: BarrelIcon, BodyIcon, BodyRunningIcon, BrainIcon, ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon, CleaverIcon, CloseIcon, DrillIcon, FridgeClosedIcon, FridgeOpenIcon, FridgeIcon, PrevIcon, NextIcon, OptionsIcon, PersonArmsUpIcon, PersonArmsDownIcon, TrashIcon, UndoIcon, ZoomIcon

imports:

- `components/shared/icons/barrel.tsx`
- `components/shared/icons/body.tsx`
- `components/shared/icons/brain.tsx`
- `components/shared/icons/chevron.tsx`
- `components/shared/icons/cleaver.tsx`
- `components/shared/icons/close.tsx`
- `components/shared/icons/drill.tsx`
- `components/shared/icons/fridge.tsx`
- `components/shared/icons/navigate.tsx`
- `components/shared/icons/options.tsx`
- `components/shared/icons/person.tsx`
- `components/shared/icons/trash.tsx`
- `components/shared/icons/undo.tsx`
- `components/shared/icons/zoom.tsx`

#### `components/shared/nav/nav-bar.tsx` `[Nav]`

exports: NavBar

imports:

- `app/actions/auth.ts`
- `components/shared/nav/nav-links.tsx`
- `lib/supabase/server.ts`

packages: next

imported by:

- `app/layout.tsx`

#### `components/shared/nav/nav-links.tsx` `[Nav]`

exports: NavDropdown

imports:

- `components/shared/icons/chevron.tsx`

packages: next, react

imported by:

- `components/shared/nav/nav-bar.tsx`

#### `components/shared/toolbar/constants.ts` `[Toolbar]`

exports: NAVBAR_H, TOOLBAR_H, TOOLBAR_W, TOOLBAR_H_MOBILE, MOBILE_BP, SECTION_PADDING, SECTION_PADDING_MOBILE, SECTION_MIN_W_MOBILE, SECTION_MIN_H_MOBILE, SECTION_GAP, SECTION_LABEL_SIZE, SECTION_LABEL_SIZE_MOBILE, SECTION_SIDE_PADDING, SECTION_SIDE_LABEL_SIZE, ACTION_ICON_MIN, ACTION_ICON_MIN_MOBILE, ACTION_ICON_LABELED_FONT, DROPDOWN_MIN_W, DROPDOWN_MAX_W, DROPDOWN_MIN_W_SIDE, EXPAND_TAB_W, EXPAND_TAB_H, EXPAND_TAB_SIDE_W, EXPAND_TAB_SIDE_H

imported by:

- `components/shared/toolbar/dropdown-panel.tsx`
- `components/shared/toolbar/index.tsx`
- `components/shared/toolbar/toolbar-main.tsx`
- `components/shared/toolbar/toolbar-parts.tsx`
- `components/shared/toolbar/toolbar-section.tsx`
- `components/shared/toolbar/use-dropdown.ts`
- `components/shared/toolbar/use-section-expand.ts`

#### `components/shared/toolbar/dropdown-panel.tsx` `[Toolbar]`

exports: DropdownPanel

imports:

- `components/shared/toolbar/constants.ts`
- `components/shared/toolbar/toolbar-main.tsx`
- `components/shared/toolbar/types.ts`

packages: react, react-dom

imported by:

- `components/shared/toolbar/index.tsx`
- `components/shared/toolbar/toolbar-parts.tsx`
- `components/shared/toolbar/toolbar-section.tsx`

#### `components/shared/toolbar/index.tsx` `[Barrel]`

exports: ToolbarCtx, ToolbarLayout, PageToolbar, ToolbarSection, DropdownPanel, useDropdown, useSectionExpand, SegmentedControl, ActionIcon, SectionLabel, ActionIconsRow, ToolbarGroup, ToolbarSpacer

imports:

- `components/shared/toolbar/constants.ts`
- `components/shared/toolbar/dropdown-panel.tsx`
- `components/shared/toolbar/segmented-control.tsx`
- `components/shared/toolbar/styles.css`
- `components/shared/toolbar/toolbar-main.tsx`
- `components/shared/toolbar/toolbar-parts.tsx`
- `components/shared/toolbar/toolbar-section.tsx`
- `components/shared/toolbar/use-dropdown.ts`
- `components/shared/toolbar/use-section-expand.ts`

imported by:

- `components/console/toolbar/collection.tsx`
- `components/console/toolbar/modify.tsx`
- `components/console/toolbar/preview.tsx`

#### `components/shared/toolbar/segmented-control.tsx` `[Toolbar]`

exports: SegmentedControl

imports:

- `lib/cn.ts`

packages: react

imported by:

- `components/shared/toolbar/index.tsx`

#### `components/shared/toolbar/toolbar-main.tsx` `[Toolbar]`

exports: NAVBAR_H, TOOLBAR_H, TOOLBAR_W, TOOLBAR_H_MOBILE, ToolbarCtx, ToolbarLayout, PageToolbar

imports:

- `components/shared/icons/fridge.tsx`
- `components/shared/icons/trash.tsx`
- `components/shared/icons/undo.tsx`
- `components/shared/toolbar/constants.ts`
- `components/shared/toolbar/types.ts`
- `lib/cn.ts`

packages: react

imported by:

- `app/console/page.tsx`
- `app/extract/page.tsx`
- `components/shared/toolbar/dropdown-panel.tsx`
- `components/shared/toolbar/index.tsx`
- `components/shared/toolbar/toolbar-parts.tsx`
- `components/shared/toolbar/toolbar-section.tsx`

#### `components/shared/toolbar/toolbar-parts.tsx` `[Toolbar]`

exports: ActionIconProps, ActionIcon, SectionLabelProps, SectionLabel, ActionIconsRowProps, ActionIconsRow, ToolbarGroupProps, ToolbarGroup

imports:

- `components/shared/toolbar/constants.ts`
- `components/shared/toolbar/dropdown-panel.tsx`
- `components/shared/toolbar/toolbar-main.tsx`

packages: react, react-dom

imported by:

- `components/shared/toolbar/index.tsx`

#### `components/shared/toolbar/toolbar-section.tsx` `[Toolbar]`

exports: ToolbarSection

imports:

- `components/shared/toolbar/constants.ts`
- `components/shared/toolbar/dropdown-panel.tsx`
- `components/shared/toolbar/toolbar-main.tsx`
- `components/shared/toolbar/types.ts`
- `lib/cn.ts`

packages: react

imported by:

- `components/shared/toolbar/index.tsx`

#### `components/shared/toolbar/types.ts` `[Types]`

exports: ToolbarMode, ToolbarCtxValue, DropdownPanelProps, PageToolbarProps, ToolbarSectionProps

packages: react

imported by:

- `components/shared/toolbar/dropdown-panel.tsx`
- `components/shared/toolbar/toolbar-main.tsx`
- `components/shared/toolbar/toolbar-section.tsx`

#### `components/shared/toolbar/use-dropdown.ts` `[Hook]`

exports: useDropdown

imports:

- `components/shared/toolbar/constants.ts`

packages: react

imported by:

- `app/console/page.tsx`
- `components/shared/toolbar/index.tsx`

#### `components/shared/toolbar/use-section-expand.ts` `[Hook]`

exports: useSectionExpand

imports:

- `components/shared/toolbar/constants.ts`

packages: react

imported by:

- `app/console/page.tsx`
- `components/shared/toolbar/index.tsx`

**`components/shared/icons/`** — 14 icon components `[Icon]`

All import `lib/constants/icons.ts` and/or `lucide-react`. Files: barrel.tsx, body.tsx, brain.tsx, chevron.tsx, cleaver.tsx, close.tsx, drill.tsx, fridge.tsx, navigate.tsx, options.tsx, person.tsx, trash.tsx, undo.tsx, zoom.tsx

### `components/sketch/` (28 files)

#### `components/sketch/body-thumbnail.tsx` `[Component]` _(sketch)_

exports: BodyThumbnail

imports:

- `components/sketch/sketch-constants.ts`
- `hooks/use-sketch-canvas-rig.ts`
- `lib/constants/anchor-descriptors.ts`

imported by:

- `app/sketch/page.tsx`

#### `components/sketch/canvas/sketch-canvas.tsx` `[Canvas]` _(sketch)_

exports: ShapeTool, SketchCanvas

imports:

- `hooks/use-sketch-canvas-rig.ts`

packages: perfect-freehand, react

imported by:

- `app/sketch/page.tsx`
- `components/sketch/inspector-panel.tsx`
- `components/sketch/status-strip.tsx`
- `components/sketch/toolbar/tool-rail.tsx`

#### `components/sketch/icons/index.ts` `[Barrel]` _(sketch)_

exports: BrushIcon, CircleIcon, ColorPaletteIcon, DrawScalpelIcon, EllipseIcon, EraserIcon, Flask2Icon, FlaskIcon, HeadIcon, LayoutIcon, LineIcon, PenIcon, RectIcon, TableIcon, TagIcon, TestTubeAndFlaskIcon, TestTubeIcon

imports:

- `components/sketch/icons/brush.tsx`
- `components/sketch/icons/circle.tsx`
- `components/sketch/icons/color-palette.tsx`
- `components/sketch/icons/draw-scalpel.tsx`
- `components/sketch/icons/ellipse.tsx`
- `components/sketch/icons/eraser.tsx`
- `components/sketch/icons/flask-2.tsx`
- `components/sketch/icons/flask.tsx`
- `components/sketch/icons/head.tsx`
- `components/sketch/icons/layout.tsx`
- `components/sketch/icons/line.tsx`
- `components/sketch/icons/pen.tsx`
- `components/sketch/icons/rect.tsx`
- `components/sketch/icons/table.tsx`
- `components/sketch/icons/tag.tsx`
- `components/sketch/icons/test-tube-and-flask.tsx`
- `components/sketch/icons/test-tube.tsx`

#### `components/sketch/inspector-panel.tsx` `[Component]` _(sketch)_

exports: InspectorPanel

imports:

- `components/sketch/canvas/sketch-canvas.tsx`
- `components/sketch/sketch-constants.ts`
- `hooks/use-sketch-canvas-rig.ts`

packages: react

imported by:

- `app/sketch/page.tsx`

#### `components/sketch/sketch-constants.ts` `[Constant]` _(sketch)_

exports: GRID_ARMS_UP, GRID_ARMS_DOWN, GRID_AREA, PART_LABEL, PART_CODE, PART_PROPORTIONS, PARTS_ORDER, DEFAULT_BRUSH, DEFAULT_COLOR_LIGHT, DEFAULT_COLOR_DARK

imports:

- `hooks/use-sketch-canvas-rig.ts`

imported by:

- `app/sketch/page.tsx`
- `components/sketch/body-thumbnail.tsx`
- `components/sketch/inspector-panel.tsx`
- `components/sketch/toolbar/operating-header.tsx`

#### `components/sketch/specimen-plate.tsx` `[Component]` _(sketch)_

exports: SpecimenPlate, SpecimenBrackets

imports:

- `hooks/use-sketch-canvas-rig.ts`

packages: react

imported by:

- `app/sketch/page.tsx`

#### `components/sketch/status-strip.tsx` `[Component]` _(sketch)_

exports: StatusStrip

imports:

- `components/sketch/canvas/sketch-canvas.tsx`

packages: react

imported by:

- `app/sketch/page.tsx`

#### `components/sketch/toolbar/operating-header.tsx` `[Toolbar]` _(sketch)_

exports: ArmPose, ViewMode, OperatingHeader

imports:

- `components/shared/icons/close.tsx`
- `components/shared/icons/fridge.tsx`
- `components/shared/icons/trash.tsx`
- `components/shared/icons/undo.tsx`
- `components/sketch/sketch-constants.ts`
- `components/sketch/toolbar/popover.tsx`
- `components/sketch/toolbar/rail-button.tsx`
- `hooks/use-sketch-canvas-rig.ts`

packages: react

imported by:

- `app/sketch/page.tsx`

#### `components/sketch/toolbar/popover.tsx` `[Toolbar]` _(sketch)_

exports: Popover

packages: react, react-dom

imported by:

- `components/sketch/toolbar/operating-header.tsx`
- `components/sketch/toolbar/tool-rail.tsx`

#### `components/sketch/toolbar/rail-button.tsx` `[Toolbar]` _(sketch)_

exports: RailButton

packages: react

imported by:

- `components/sketch/toolbar/operating-header.tsx`
- `components/sketch/toolbar/tool-rail.tsx`

#### `components/sketch/toolbar/tool-rail.tsx` `[Toolbar]` _(sketch)_

exports: ToolRail

imports:

- `components/shared/icons/zoom.tsx`
- `components/sketch/canvas/sketch-canvas.tsx`
- `components/sketch/icons/brush.tsx`
- `components/sketch/icons/circle.tsx`
- `components/sketch/icons/ellipse.tsx`
- `components/sketch/icons/eraser.tsx`
- `components/sketch/icons/flask-2.tsx`
- `components/sketch/icons/line.tsx`
- `components/sketch/icons/pen.tsx`
- `components/sketch/icons/rect.tsx`
- `components/sketch/toolbar/popover.tsx`
- `components/sketch/toolbar/rail-button.tsx`

packages: react

imported by:

- `app/sketch/page.tsx`

**`components/sketch/icons/`** — 17 icon components `[Icon]`

All import `lib/constants/icons.ts` and/or `lucide-react`. Files: brush.tsx, circle.tsx, color-palette.tsx, draw-scalpel.tsx, ellipse.tsx, eraser.tsx, flask-2.tsx, flask.tsx, head.tsx, layout.tsx, line.tsx, pen.tsx, rect.tsx, table.tsx, tag.tsx, test-tube-and-flask.tsx, test-tube.tsx

### `hooks/` (5 files)

#### `hooks/index.ts` `[Barrel]`

imports:

- `hooks/use-cache-svgs.ts`
- `hooks/use-pose-detection.ts`
- `hooks/use-set-anchors-and-draw.ts`
- `hooks/use-sketch-canvas-rig.ts`

#### `hooks/use-cache-svgs.ts` `[Hook]` _(console)_

exports: useCacheSvgs

imports:

- `lib/types.ts`
- `lib/utils/svg-utils.ts`
- `lib/utils/torso-dimensions.ts`

packages: react

imported by:

- `app/console/page.tsx`
- `hooks/index.ts`

#### `hooks/use-pose-detection.ts` `[Hook]` _(extract)_

exports: usePoseDetection

imports:

- `lib/stores/landmarks-store.ts`
- `lib/types.ts`

packages: react

imported by:

- `app/extract/page.tsx`
- `hooks/index.ts`

#### `hooks/use-set-anchors-and-draw.ts` `[Hook]`

imported by:

- `hooks/index.ts`

#### `hooks/use-sketch-canvas-rig.ts` `[Hook]` _(sketch)_

exports: BodyPartName, Side, useSketchCanvasRig

imports:

- `lib/constants/anchor-descriptors.ts`

packages: react

imported by:

- `app/api/storage/upload/route.ts`
- `app/sketch/page.tsx`
- `components/sketch/body-thumbnail.tsx`
- `components/sketch/canvas/sketch-canvas.tsx`
- `components/sketch/inspector-panel.tsx`
- `components/sketch/sketch-constants.ts`
- `components/sketch/specimen-plate.tsx`
- `components/sketch/toolbar/operating-header.tsx`
- `hooks/index.ts`

### `lib/` (3 files)

#### `lib/cn.ts` `[Util]`

exports: cn

packages: clsx, tailwind-merge

imported by:

- `components/shared/toolbar/segmented-control.tsx`
- `components/shared/toolbar/toolbar-main.tsx`
- `components/shared/toolbar/toolbar-section.tsx`

#### `lib/theme.ts` `[Util]`

exports: darkTheme, lightTheme, Theme, getActiveTheme

imported by:

- `components/extract/canvas/pose-canvas.tsx`

#### `lib/types.ts` `[Types]`

exports: Keypoint, LandmarkFrame, Dimensions, PointAnchor, QuadAnchor, SegmentAnchor, HeadAnchor, PartAnchors, AnchorsMap, ShiftVector, ScaleVector, ShiftFactors, ScaleFactors, SvgParts, CaptureViewMode, StoredAnimation, FileEntry

imported by:

- `app/api/storage/animations/route.ts`
- `app/api/storage/landmarks/route.ts`
- `app/console/page.tsx`
- `app/extract/page.tsx`
- `components/console/canvas/animation-canvas.tsx`
- `components/console/controls/file-list.tsx`
- `components/console/controls/scale-controls.tsx`
- `components/console/controls/shift-controls.tsx`
- `components/console/toolbar/collection.tsx`
- `components/extract/canvas/pose-canvas.tsx`
- `hooks/use-cache-svgs.ts`
- `hooks/use-pose-detection.ts`
- `lib/3d/coordinate-system.ts`
- `lib/3d/scene-orchestrator.ts`
- `lib/stores/landmarks-store.ts`
- `lib/stores/scale-factors-store.ts`
- `lib/stores/shift-factors-store.ts`
- `lib/utils/drawing-utils.ts`
- `lib/utils/frame-crop.ts`
- `lib/utils/frame-filter.ts`
- `lib/utils/landmark-smoother.ts`
- `lib/utils/pose-utils.ts`
- `lib/utils/render-part-svg.ts`
- `lib/utils/set-anchors.ts`
- `lib/utils/svg-utils.ts`
- `lib/utils/validation-utils.ts`

### `lib/3d/` (10 files)

#### `lib/3d/body-hierarchy.ts` `[3D Pipeline]`

exports: BODY_HIERARCHY, HIERARCHY_BFS_ORDER, HIERARCHY_REVERSE_ORDER, ALL_PARTS

imports:

- `lib/3d/types.ts`

imported by:

- `lib/3d/index.ts`
- `lib/3d/temporal-smoother.ts`

#### `lib/3d/coordinate-system.ts` `[3D Pipeline]`

exports: DEFAULT_SCENE_CONFIG, landmarkToScene, frameTo3D, frameConfidences

imports:

- `lib/3d/types.ts`
- `lib/types.ts`

imported by:

- `lib/3d/index.ts`
- `lib/3d/scene-orchestrator.ts`

#### `lib/3d/index.ts` `[Barrel]`

exports: Vec3, Basis3, PartTransform3D, BodyTransforms, BodyPartKey, SceneConfig, HierarchyNode, AnchorOrigin, PlaneMapping, SmootherState, vec3, ZERO, UNIT_X, UNIT_Y, UNIT_Z, add, sub, mul, negate, dot, cross, len, lenSq, dist, normalize, lerp, midpoint, projectOnPlane, lerpScalar, isNearZero, DEFAULT_SCENE_CONFIG, landmarkToScene, frameTo3D, frameConfidences, computeTorsoFrame, isFrontFacing, getShoulderMidpoint, getTorsoWidth, computeHeadTransform, computeSegmentTransform, computeHandTransform, computeFootTransform, computeAllPartTransforms, BODY_HIERARCHY, HIERARCHY_BFS_ORDER, HIERARCHY_REVERSE_ORDER, ALL_PARTS, TemporalSmoother, PLANE_MAPPINGS, anchorYShift, SceneOrchestrator

imports:

- `lib/3d/body-hierarchy.ts`
- `lib/3d/coordinate-system.ts`
- `lib/3d/math.ts`
- `lib/3d/part-transforms.ts`
- `lib/3d/scene-orchestrator.ts`
- `lib/3d/svg-plane-mapping.ts`
- `lib/3d/temporal-smoother.ts`
- `lib/3d/torso-frame.ts`
- `lib/3d/types.ts`

#### `lib/3d/math.ts` `[3D Pipeline]`

exports: vec3, ZERO, UNIT_X, UNIT_Y, UNIT_Z, add, sub, mul, negate, dot, cross, len, lenSq, dist, normalize, lerp, midpoint, projectOnPlane, lerpScalar, isNearZero

imports:

- `lib/3d/types.ts`

imported by:

- `lib/3d/index.ts`
- `lib/3d/part-transforms.ts`
- `lib/3d/temporal-smoother.ts`
- `lib/3d/torso-frame.ts`

#### `lib/3d/part-transforms.ts` `[3D Pipeline]`

exports: computeHeadTransform, computeSegmentTransform, computeHandTransform, computeFootTransform, computeAllPartTransforms

imports:

- `lib/3d/math.ts`
- `lib/3d/torso-frame.ts`
- `lib/3d/types.ts`

imported by:

- `lib/3d/index.ts`
- `lib/3d/scene-orchestrator.ts`

#### `lib/3d/scene-orchestrator.ts` `[3D Pipeline]`

exports: SceneOrchestrator

imports:

- `lib/3d/coordinate-system.ts`
- `lib/3d/part-transforms.ts`
- `lib/3d/temporal-smoother.ts`
- `lib/3d/torso-frame.ts`
- `lib/3d/types.ts`
- `lib/types.ts`

imported by:

- `lib/3d/index.ts`

#### `lib/3d/svg-plane-mapping.ts` `[3D Pipeline]`

exports: PLANE_MAPPINGS, anchorYShift

imports:

- `lib/3d/types.ts`

imported by:

- `lib/3d/index.ts`

#### `lib/3d/temporal-smoother.ts` `[3D Pipeline]`

exports: TemporalSmoother

imports:

- `lib/3d/body-hierarchy.ts`
- `lib/3d/math.ts`
- `lib/3d/types.ts`

imported by:

- `lib/3d/index.ts`
- `lib/3d/scene-orchestrator.ts`

#### `lib/3d/torso-frame.ts` `[3D Pipeline]`

exports: computeTorsoFrame, isFrontFacing, getShoulderMidpoint, getTorsoWidth

imports:

- `lib/3d/math.ts`
- `lib/3d/types.ts`

imported by:

- `lib/3d/index.ts`
- `lib/3d/part-transforms.ts`
- `lib/3d/scene-orchestrator.ts`

#### `lib/3d/types.ts` `[3D Pipeline]`

exports: Vec3, Basis3, PartTransform3D, BodyTransforms, BodyPartKey, SceneConfig, HierarchyNode, AnchorOrigin, PlaneMapping, SmootherState

imported by:

- `lib/3d/body-hierarchy.ts`
- `lib/3d/coordinate-system.ts`
- `lib/3d/index.ts`
- `lib/3d/math.ts`
- `lib/3d/part-transforms.ts`
- `lib/3d/scene-orchestrator.ts`
- `lib/3d/svg-plane-mapping.ts`
- `lib/3d/temporal-smoother.ts`
- `lib/3d/torso-frame.ts`

### `lib/constants/` (5 files)

#### `lib/constants/anchor-descriptors.ts` `[Constant]`

exports: ANCHOR_MAP, BODY_PARTS

imported by:

- `app/api/storage/upload/route.ts`
- `app/sketch/page.tsx`
- `components/sketch/body-thumbnail.tsx`
- `hooks/use-sketch-canvas-rig.ts`
- `lib/constants/index.ts`

#### `lib/constants/icons.ts` `[Constant]`

exports: ICON_STROKE, IconProps

imported by:

- `components/console/icons/files-icon.tsx`
- `components/console/icons/panel.tsx`
- `components/console/icons/preview-icon.tsx`
- `components/console/icons/scale-icon.tsx`
- `components/console/icons/shift-icon.tsx`
- `components/extract/icons/circular-saw.tsx`
- `components/extract/icons/jar.tsx`
- `components/extract/icons/pulse.tsx`
- `components/extract/icons/record.tsx`
- `components/extract/icons/scalpel-trim.tsx`
- `components/shared/icons/barrel.tsx`
- `components/shared/icons/body.tsx`
- `components/shared/icons/brain.tsx`
- `components/shared/icons/chevron.tsx`
- `components/shared/icons/cleaver.tsx`
- `components/shared/icons/close.tsx`
- `components/shared/icons/drill.tsx`
- `components/shared/icons/fridge.tsx`
- `components/shared/icons/navigate.tsx`
- `components/shared/icons/options.tsx`
- `components/shared/icons/person.tsx`
- `components/shared/icons/trash.tsx`
- `components/shared/icons/undo.tsx`
- `components/shared/icons/zoom.tsx`
- `components/sketch/icons/brush.tsx`
- `components/sketch/icons/circle.tsx`
- `components/sketch/icons/color-palette.tsx`
- `components/sketch/icons/draw-scalpel.tsx`
- `components/sketch/icons/ellipse.tsx`
- `components/sketch/icons/eraser.tsx`
- `components/sketch/icons/flask-2.tsx`
- `components/sketch/icons/flask.tsx`
- `components/sketch/icons/head.tsx`
- `components/sketch/icons/layout.tsx`
- `components/sketch/icons/line.tsx`
- `components/sketch/icons/pen.tsx`
- `components/sketch/icons/rect.tsx`
- `components/sketch/icons/table.tsx`
- `components/sketch/icons/tag.tsx`
- `components/sketch/icons/test-tube-and-flask.tsx`
- `components/sketch/icons/test-tube.tsx`

#### `lib/constants/index.ts` `[Barrel]`

exports: CANVAS_RATIO, WEBCAM_DIMENSIONS, SMALL_SCREEN_BREAKPOINT, KEYPOINT_NAMES, CONNECTED_KEYPOINTS, ANCHOR_MAP, BODY_PARTS

imports:

- `lib/constants/anchor-descriptors.ts`
- `lib/constants/landmark-descriptors.ts`
- `lib/constants/sizes.ts`

imported by:

- `lib/utils/render-part-svg.ts`

#### `lib/constants/landmark-descriptors.ts` `[Constant]`

exports: KEYPOINT_NAMES, CONNECTED_KEYPOINTS

imported by:

- `components/extract/canvas/pose-canvas.tsx`
- `lib/constants/index.ts`

#### `lib/constants/sizes.ts` `[Constant]`

exports: CANVAS_RATIO, WEBCAM_DIMENSIONS, SMALL_SCREEN_BREAKPOINT, ICON_SIZES, SVG_LINE_WIDTH

imported by:

- `lib/constants/index.ts`

### `lib/storage/` (1 files)

#### `lib/storage/index.ts` `[Barrel]`

### `lib/stores/` (4 files)

#### `lib/stores/index.ts` `[Barrel]`

imports:

- `lib/stores/landmarks-store.ts`
- `lib/stores/scale-factors-store.ts`
- `lib/stores/shift-factors-store.ts`

#### `lib/stores/landmarks-store.ts` `[Store]`

exports: useLandmarksStore

imports:

- `lib/types.ts`

packages: zustand

imported by:

- `app/extract/page.tsx`
- `hooks/use-pose-detection.ts`
- `lib/stores/index.ts`

#### `lib/stores/scale-factors-store.ts` `[Store]`

exports: useScaleFactorsStore

imports:

- `lib/types.ts`

packages: zustand

imported by:

- `app/console/page.tsx`
- `components/console/controls/scale-controls.tsx`
- `lib/stores/index.ts`

#### `lib/stores/shift-factors-store.ts` `[Store]`

exports: useShiftFactorsStore

imports:

- `lib/types.ts`

packages: zustand

imported by:

- `app/console/page.tsx`
- `components/console/controls/shift-controls.tsx`
- `lib/stores/index.ts`

### `lib/supabase/` (4 files)

#### `lib/supabase/admin.ts` `[Supabase]`

exports: supabaseAdmin

packages: @supabase/supabase-js

imported by:

- `app/api/storage/animations/route.ts`
- `app/api/storage/files/route.ts`
- `app/api/storage/landmarks/route.ts`
- `app/api/storage/list/route.ts`
- `app/api/storage/upload/route.ts`

#### `lib/supabase/client.ts` `[Supabase]`

exports: createClient

packages: @supabase/ssr

#### `lib/supabase/middleware.ts` `[Supabase]`

exports: updateSession

packages: @supabase/ssr, next

imported by:

- `middleware.ts`

#### `lib/supabase/server.ts` `[Supabase]`

exports: createClient

packages: @supabase/ssr, next

imported by:

- `app/actions/auth.ts`
- `app/api/storage/animations/route.ts`
- `app/api/storage/files/route.ts`
- `app/api/storage/landmarks/route.ts`
- `app/api/storage/list/route.ts`
- `app/api/storage/upload/route.ts`
- `app/auth/callback/route.ts`
- `components/shared/nav/nav-bar.tsx`

### `lib/utils/` (13 files)

#### `lib/utils/display-transform.ts` `[Util]`

exports: DisplayTransform, objectContainTransform, applyDisplayTransform

imported by:

- `components/extract/canvas/pose-canvas.tsx`
- `lib/utils/index.ts`

#### `lib/utils/drawing-utils.ts` `[Util]`

exports: drawTorsoSvg, drawHeadSvg, drawSegmentSvg, drawHandSvg, drawLegSvg, drawFootSvg

imports:

- `lib/types.ts`
- `lib/utils/svg-utils.ts`
- `lib/utils/torso-dimensions.ts`

imported by:

- `lib/utils/index.ts`
- `lib/utils/render-part-svg.ts`

#### `lib/utils/ear-distance.ts` `[Util]`

exports: EarDistance

imported by:

- `components/console/canvas/animation-canvas.tsx`
- `lib/utils/index.ts`
- `lib/utils/render-part-svg.ts`
- `lib/utils/set-anchors.ts`

#### `lib/utils/frame-crop.ts` `[Util]`

exports: Crop, computeSubjectCrop, transformFrameToCrop, transformFramesToCrop, cropToDimensions

imports:

- `lib/types.ts`

imported by:

- `app/extract/page.tsx`
- `lib/utils/index.ts`

#### `lib/utils/frame-filter.ts` `[Util]`

exports: isFrameValid, lerpFrame, filterAndInterpolateFrames, interpolateLowConfidenceLandmarks, applyFrameInterval

imports:

- `lib/types.ts`

imported by:

- `app/console/page.tsx`
- `app/extract/page.tsx`

#### `lib/utils/index.ts` `[Barrel]`

imports:

- `lib/utils/display-transform.ts`
- `lib/utils/drawing-utils.ts`
- `lib/utils/ear-distance.ts`
- `lib/utils/frame-crop.ts`
- `lib/utils/pose-utils.ts`
- `lib/utils/render-part-svg.ts`
- `lib/utils/set-anchors.ts`
- `lib/utils/svg-utils.ts`
- `lib/utils/torso-dimensions.ts`
- `lib/utils/validation-utils.ts`

#### `lib/utils/landmark-smoother.ts` `[Util]`

exports: SmootherConfig, DEFAULT_SMOOTHER_CONFIG, smoothLandmarkFrames

imports:

- `lib/types.ts`

imported by:

- `app/console/page.tsx`
- `app/extract/page.tsx`

#### `lib/utils/pose-utils.ts` `[Util]`

exports: scaleLandmarks, scaleLandmarkFrames, scaleLandmarksUniform, scaleLandmarkFramesUniform, applyShiftsToFrame, applyShiftsToFrames

imports:

- `lib/types.ts`

imported by:

- `app/console/page.tsx`
- `lib/utils/index.ts`

#### `lib/utils/render-part-svg.ts` `[Util]`

exports: RenderContext, renderPartSvg, renderFrame

imports:

- `lib/constants/index.ts`
- `lib/types.ts`
- `lib/utils/drawing-utils.ts`
- `lib/utils/ear-distance.ts`
- `lib/utils/set-anchors.ts`
- `lib/utils/torso-dimensions.ts`
- `lib/utils/validation-utils.ts`

imported by:

- `components/console/canvas/animation-canvas.tsx`
- `lib/utils/index.ts`

#### `lib/utils/set-anchors.ts` `[Util]`

exports: setTorsoAnchors, setHeadAnchors, setArmAnchors, setHandAnchors, setLegAnchors, setFootAnchors

imports:

- `lib/types.ts`
- `lib/utils/ear-distance.ts`
- `lib/utils/torso-dimensions.ts`

imported by:

- `lib/utils/index.ts`
- `lib/utils/render-part-svg.ts`

#### `lib/utils/svg-utils.ts` `[Util]`

exports: affineFrom3Points, svgStringToImage, getSvgSize

imports:

- `lib/types.ts`

imported by:

- `hooks/use-cache-svgs.ts`
- `lib/utils/drawing-utils.ts`
- `lib/utils/index.ts`

#### `lib/utils/torso-dimensions.ts` `[Util]`

exports: TorsoDimensions

imported by:

- `app/console/page.tsx`
- `components/console/canvas/animation-canvas.tsx`
- `hooks/use-cache-svgs.ts`
- `lib/utils/drawing-utils.ts`
- `lib/utils/index.ts`
- `lib/utils/render-part-svg.ts`
- `lib/utils/set-anchors.ts`

#### `lib/utils/validation-utils.ts` `[Util]`

exports: validateAnchors

imports:

- `lib/types.ts`

imported by:

- `lib/utils/index.ts`
- `lib/utils/render-part-svg.ts`

## Hot Modules

Top 25 most-imported files. High importer count = high coupling risk if the file changes.

| #   | File                                         | Role          | Importers | Exports                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | -------------------------------------------- | ------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `lib/constants/icons.ts`                     | Constant      | 41        | ICON_STROKE, IconProps                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2   | `lib/types.ts`                               | Types         | 26        | Keypoint, LandmarkFrame, Dimensions, PointAnchor, QuadAnchor, SegmentAnchor, HeadAnchor, PartAnchors, AnchorsMap, ShiftVector, ScaleVector, ShiftFactors, ScaleFactors, SvgParts, CaptureViewMode, StoredAnimation, FileEntry                                                                                                                                                                                                                         |
| 3   | `hooks/use-sketch-canvas-rig.ts`             | Hook          | 9         | BodyPartName, Side, useSketchCanvasRig                                                                                                                                                                                                                                                                                                                                                                                                                |
| 4   | `lib/3d/types.ts`                            | 3D Pipeline   | 9         | Vec3, Basis3, PartTransform3D, BodyTransforms, BodyPartKey, SceneConfig, HierarchyNode, AnchorOrigin, PlaneMapping, SmootherState                                                                                                                                                                                                                                                                                                                     |
| 5   | `lib/supabase/server.ts`                     | Supabase      | 8         | createClient                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 6   | `lib/utils/torso-dimensions.ts`              | Util          | 7         | TorsoDimensions                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 7   | `components/shared/toolbar/constants.ts`     | Toolbar       | 7         | NAVBAR_H, TOOLBAR_H, TOOLBAR_W, TOOLBAR_H_MOBILE, MOBILE_BP, SECTION_PADDING, SECTION_PADDING_MOBILE, SECTION_MIN_W_MOBILE, SECTION_MIN_H_MOBILE, SECTION_GAP, SECTION_LABEL_SIZE, SECTION_LABEL_SIZE_MOBILE, SECTION_SIDE_PADDING, SECTION_SIDE_LABEL_SIZE, ACTION_ICON_MIN, ACTION_ICON_MIN_MOBILE, ACTION_ICON_LABELED_FONT, DROPDOWN_MIN_W, DROPDOWN_MAX_W, DROPDOWN_MIN_W_SIDE, EXPAND_TAB_W, EXPAND_TAB_H, EXPAND_TAB_SIDE_W, EXPAND_TAB_SIDE_H |
| 8   | `components/shared/toolbar/toolbar-main.tsx` | Toolbar       | 6         | NAVBAR_H, TOOLBAR_H, TOOLBAR_W, TOOLBAR_H_MOBILE, ToolbarCtx, ToolbarLayout, PageToolbar                                                                                                                                                                                                                                                                                                                                                              |
| 9   | `lib/supabase/admin.ts`                      | Supabase      | 5         | supabaseAdmin                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 10  | `lib/constants/anchor-descriptors.ts`        | Constant      | 5         | ANCHOR_MAP, BODY_PARTS                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 11  | `components/shared/icons/fridge.tsx`         | Icon          | 4         | FridgeClosedIcon, FridgeOpenIcon, FridgeIcon                                                                                                                                                                                                                                                                                                                                                                                                          |
| 12  | `components/sketch/canvas/sketch-canvas.tsx` | Canvas        | 4         | ShapeTool, SketchCanvas                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 13  | `components/sketch/sketch-constants.ts`      | Constant      | 4         | GRID_ARMS_UP, GRID_ARMS_DOWN, GRID_AREA, PART_LABEL, PART_CODE, PART_PROPORTIONS, PARTS_ORDER, DEFAULT_BRUSH, DEFAULT_COLOR_LIGHT, DEFAULT_COLOR_DARK                                                                                                                                                                                                                                                                                                 |
| 14  | `lib/utils/ear-distance.ts`                  | Util          | 4         | EarDistance                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 15  | `lib/3d/math.ts`                             | 3D Pipeline   | 4         | vec3, ZERO, UNIT_X, UNIT_Y, UNIT_Z, add, sub, mul, negate, dot, cross, len, lenSq, dist, normalize, lerp, midpoint, projectOnPlane, lerpScalar, isNearZero                                                                                                                                                                                                                                                                                            |
| 16  | `lib/stores/shift-factors-store.ts`          | Store         | 3         | useShiftFactorsStore                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 17  | `lib/stores/scale-factors-store.ts`          | Store         | 3         | useScaleFactorsStore                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 18  | `lib/stores/landmarks-store.ts`              | Store         | 3         | useLandmarksStore                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 19  | `components/shared/icons/brain.tsx`          | Icon          | 3         | BrainIcon                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 20  | `components/shared/icons/chevron.tsx`        | Icon          | 3         | ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon                                                                                                                                                                                                                                                                                                                                                                                     |
| 21  | `components/extract/icons/pulse.tsx`         | Icon          | 3         | PulseIcon                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 22  | `app/actions/auth.ts`                        | Server Action | 3         | login, register, logout                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 23  | `components/shared/toolbar/index.tsx`        | Barrel        | 3         | ToolbarCtx, ToolbarLayout, PageToolbar, ToolbarSection, DropdownPanel, useDropdown, useSectionExpand, SegmentedControl, ActionIcon, SectionLabel, ActionIconsRow, ToolbarGroup, ToolbarSpacer                                                                                                                                                                                                                                                         |
| 24  | `components/shared/icons/trash.tsx`          | Icon          | 3         | TrashIcon                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 25  | `components/shared/icons/undo.tsx`           | Icon          | 3         | UndoIcon                                                                                                                                                                                                                                                                                                                                                                                                                                              |

## Cross-cutting Dependencies

Files imported from more than one top-level source group:

| File                                              | Role          | Top-level groups            | Importers |
| ------------------------------------------------- | ------------- | --------------------------- | --------- |
| `lib/types.ts`                                    | Types         | app, components, hooks, lib | 26        |
| `lib/utils/torso-dimensions.ts`                   | Util          | app, components, hooks, lib | 7         |
| `lib/constants/anchor-descriptors.ts`             | Constant      | app, components, hooks, lib | 5         |
| `hooks/use-sketch-canvas-rig.ts`                  | Hook          | app, components, hooks      | 9         |
| `lib/stores/shift-factors-store.ts`               | Store         | app, components, lib        | 3         |
| `lib/stores/scale-factors-store.ts`               | Store         | app, components, lib        | 3         |
| `lib/stores/landmarks-store.ts`                   | Store         | app, hooks, lib             | 3         |
| `lib/supabase/server.ts`                          | Supabase      | app, components             | 8         |
| `components/shared/toolbar/toolbar-main.tsx`      | Toolbar       | app, components             | 6         |
| `components/shared/icons/fridge.tsx`              | Icon          | app, components             | 4         |
| `components/sketch/canvas/sketch-canvas.tsx`      | Canvas        | app, components             | 4         |
| `components/sketch/sketch-constants.ts`           | Constant      | app, components             | 4         |
| `lib/utils/ear-distance.ts`                       | Util          | components, lib             | 4         |
| `components/shared/icons/brain.tsx`               | Icon          | app, components             | 3         |
| `components/shared/icons/chevron.tsx`             | Icon          | app, components             | 3         |
| `components/extract/icons/pulse.tsx`              | Icon          | app, components             | 3         |
| `app/actions/auth.ts`                             | Server Action | app, components             | 3         |
| `lib/utils/svg-utils.ts`                          | Util          | hooks, lib                  | 3         |
| `hooks/use-cache-svgs.ts`                         | Hook          | app, hooks                  | 2         |
| `lib/utils/pose-utils.ts`                         | Util          | app, lib                    | 2         |
| `components/shared/toolbar/use-dropdown.ts`       | Hook          | app, components             | 2         |
| `components/shared/toolbar/use-section-expand.ts` | Hook          | app, components             | 2         |
| `hooks/use-pose-detection.ts`                     | Hook          | app, hooks                  | 2         |
| `components/extract/icons/circular-saw.tsx`       | Icon          | app, components             | 2         |
| `components/extract/icons/record.tsx`             | Icon          | app, components             | 2         |
| `lib/utils/frame-crop.ts`                         | Util          | app, lib                    | 2         |
| `components/shared/icons/navigate.tsx`            | Icon          | app, components             | 2         |
| `lib/utils/render-part-svg.ts`                    | Util          | components, lib             | 2         |
| `lib/constants/landmark-descriptors.ts`           | Constant      | components, lib             | 2         |
| `lib/utils/display-transform.ts`                  | Util          | components, lib             | 2         |

---

_143 files indexed._
