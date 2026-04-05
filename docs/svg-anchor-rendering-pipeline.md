# SVG Anchor and Rendering Pipeline

## Purpose

This document describes the pipeline for rendering body-part SVG images onto a canvas, anchored to MediaPipe pose landmark coordinates. This is the current (2D) rendering pipeline used by the Console page.

## Scope

Covers: `lib/utils/set-anchors.ts`, `lib/utils/drawing-utils.ts`, `lib/utils/render-part-svg.ts`, `lib/utils/pose-utils.ts`, `lib/utils/torso-dimensions.ts`, `lib/utils/ear-distance.ts`, `lib/utils/validation-utils.ts`, `components/console/canvas/animation-canvas.tsx`.

---

## Pipeline Overview

```
LandmarkFrame (stored JSON)
  → scaleLandmarks()           scale keypoints from video dims → canvas dims
  → applyShiftsToFrame()       apply per-joint user shift adjustments
  → setAnchors()               compute 2D anchor positions per body part
  → validateAnchors()          skip invalid/out-of-bounds parts
  → draw*Svg()                 render SVG onto Canvas 2D via affine transform
```

This runs once per animation frame (30 fps) inside `AnimationCanvas`.

---

## Stage 1: Landmark Scaling (`pose-utils.ts`)

Landmarks are stored with coordinates normalized to the original video capture dimensions. Before rendering, they are scaled to the canvas size.

```typescript
scaleLandmarks(frame, originalDims, targetDims) → LandmarkFrame
```

Linear rescaling: `x' = x × (targetW / sourceW)`, `y' = y × (targetH / sourceH)`.

---

## Stage 2: Shift Application (`pose-utils.ts`)

Per-joint position adjustments from `useShiftFactorsStore` are applied.

```typescript
applyShiftsToFrame(frame, shifts, torsoW, torsoH) → LandmarkFrame
```

Each keypoint has a named shift entry (torso, head, shoulder, elbow, wrist, hip, knee, ankle, foot). Shift values are multiplied by torso dimensions, converting them from relative units to pixels. A static lookup table maps keypoint index (0–32) to shift key name.

---

## Stage 3: Anchor Computation (`set-anchors.ts`)

Each body part's 2D drawing anchor is computed from the scaled, shifted landmark frame.

| Part type | Anchor type     | Computed from                                            |
| --------- | --------------- | -------------------------------------------------------- |
| Torso     | `QuadAnchor`    | Left shoulder (11), right shoulder (12), hip mid (23+24) |
| Head      | `HeadAnchor`    | Left ear (7), right ear (8), shoulder midpoint           |
| Arms/legs | `SegmentAnchor` | Proximal → distal joint pair (e.g. shoulder → elbow)     |
| Hands     | `SegmentAnchor` | Wrist (15/16) → index finger tip (19/20)                 |
| Feet      | `SegmentAnchor` | Ankle (27/28) → foot index (31/32)                       |

Anchors are skipped (`undefined`) if any required keypoint has confidence < 0.3.

**`TorsoDimensions` updates:**  
After computing the torso anchor, `TorsoDimensions.updateAvgTorsoHeight()`, `updateAvgTorsoWidth()`, and `updateAvgHipWidth()` are called. These EMA-smoothed metrics (alpha 0.1–0.15) are used by all subsequent draw functions for sizing and scaling.

---

## Stage 4: Validation (`validation-utils.ts`)

Before drawing each part, `validateAnchors(anchors, canvasWidth, canvasHeight)` checks:

- No anchor point is null or undefined
- No coordinate is NaN
- All coordinates are within canvas bounds

If validation fails, the part is skipped for that frame.

---

## Stage 5: SVG Drawing (`drawing-utils.ts`)

Each body part is rendered using a different affine strategy depending on its geometry.

### Torso (`drawTorsoSvg`)

Maps three source points on the SVG image to three destination points on the canvas using `affineFrom3Points()` from `svg-utils.ts`:

- Source: top-left, top-right, bottom-center of the SVG
- Destination: left shoulder anchor, right shoulder anchor, hip midpoint anchor

### Head (`drawHeadSvg`)

Centered on the head anchor position. Scaled uniformly: `size = torsoDims.avgTorsoHypotenuse × headScale`. Uses `ctx.transform()` for translation and scale (no rotation — head stays upright).

`EarDistance` provides the averaged ear-to-ear width for consistent head sizing across frames.

### Limbs — arms and legs (`drawSegmentSvg`)

Each segment SVG is drawn along its joint-to-joint axis:

1. Compute segment direction and length from the two anchor points
2. Determine if the segment is more vertical or horizontal (auto-detect, or `forceVertical`)
3. Compute cross-width from `TorsoDimensions` × scale factor
4. Use `affineFrom3Points()` to map SVG top-center, bottom-center, and a side point to canvas coordinates

### Hands (`drawHandSvg`)

Same algorithm as segments with hand-specific scale factors.

### Feet (`drawFootSvg`)

Same algorithm as segments with foot-specific scale factors.

---

## Rendering Orchestration (`render-part-svg.ts`)

### `renderFrame(scaledLandmarks, svgImages, renderContext)`

Top-level call for a complete frame render:

1. Clears the canvas (fills with `bgColor` if set)
2. Updates `TorsoDimensions` facing state (`updateFacing`, `updateUpperBodyFacing`, `updateLowerBodyFacing`)
3. Determines current facing: `isFront` getter from `TorsoDimensions`
4. Iterates all 14 body parts in hierarchy order
5. For each part: selects the correct SVG key (`"{part}-front"` or `"{part}-back"` depending on facing), calls `renderPartSvg()`

### `renderPartSvg(part, img, scaledLandmarks, renderContext)`

Computes the anchor for the given part, validates it, then calls the appropriate `draw*Svg()` function.

---

## AnimationCanvas (`components/console/canvas/animation-canvas.tsx`)

Orchestrates the full pipeline at 30 fps.

```
playback RAF loop (every 33ms)
  → advance frame index
  → scaleLandmarks(frames[idx], origDims, canvasDims)
  → renderFrame(scaledLandmarks, svgImages, renderContext)
```

**Shared context state:**

- `TorsoDimensions` — EMA torso metrics; fresh instance per play session
- `EarDistance` — EMA ear width; fresh instance per play session

**Pause behavior:**  
When `playing = false`, runs a single `renderFrame` whenever `shifts` or `scales` props change. This allows real-time tuning of adjustments without playing the animation.

**`showAnchors` debug mode:**  
Draws colored dots at all computed anchor positions for visual debugging.

---

## Shift and Scale Integration

| Store                  | Applied at             | Effect                                  |
| ---------------------- | ---------------------- | --------------------------------------- |
| `useShiftFactorsStore` | `applyShiftsToFrame()` | Moves specific body part groups in X/Y  |
| `useScaleFactorsStore` | `draw*Svg()` functions | Scales specific body part groups in X/Y |

Both stores are read from `renderContext` on each frame — changes take effect on the next frame (or immediately on pause).

---

## Key Modules

| Module                                       | Role                                              |
| -------------------------------------------- | ------------------------------------------------- |
| `lib/utils/pose-utils.ts`                    | Landmark scaling and shift application            |
| `lib/utils/set-anchors.ts`                   | 2D anchor computation from landmark indices       |
| `lib/utils/drawing-utils.ts`                 | Per-part SVG rendering (affine canvas transforms) |
| `lib/utils/render-part-svg.ts`               | Full-frame orchestration, facing detection        |
| `lib/utils/torso-dimensions.ts`              | EMA torso size tracking (reference scale)         |
| `lib/utils/ear-distance.ts`                  | EMA head width tracking                           |
| `lib/utils/validation-utils.ts`              | Anchor bounds checking                            |
| `lib/utils/svg-utils.ts`                     | Affine matrix computation, image loading          |
| `lib/stores/shift-factors-store.ts`          | Per-joint shift adjustments                       |
| `lib/stores/scale-factors-store.ts`          | Per-group scale adjustments                       |
| `lib/constants/anchor-descriptors.ts`        | Landmark index mappings (`ANCHOR_MAP`)            |
| `components/console/canvas/animation-canvas` | RAF playback, render context lifecycle            |

---

## Data Flow Diagram

```
[Supabase landmarks bucket] → GET /api/storage/landmarks
         ↓
[LandmarkFrame[]] raw (video-space coordinates)
         ↓
[scaleLandmarks()] → canvas-space coordinates
         ↓
[applyShiftsToFrame()] → user-adjusted positions
         ↓
[set*Anchors()] → QuadAnchor | SegmentAnchor | HeadAnchor per part
         ↓
[validateAnchors()] → skip out-of-bounds parts
         ↓
[draw*Svg()] → ctx.transform() → ctx.drawImage() → Canvas 2D
         ↓
[Canvas 2D output] displayed in browser via AnimationCanvas
```

---

## Constraints and Design Decisions

- **EMA for torso/ear metrics** — prevents single bad frames from causing jarring size jumps in rendered parts
- **Separate facing per body section** — upper body (shoulders) and lower body (hips) can face independently, supporting twisted-spine poses
- **Scale factors are dimensionless multipliers, not pixels** — makes them resolution-independent
- **Shift factors are torso-relative** — a shift of (1, 0) moves a part by one torso-width, which scales naturally with pose distance from camera
- **Per-part validation** — allows partial renders (one arm may be off-screen while other parts render correctly)
- **Front/back SVG selection** — correct artwork is shown per body section, allowing a figure that is twisting to show front torso and back legs simultaneously
