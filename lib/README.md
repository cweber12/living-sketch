# lib/

Pure TypeScript logic — types, constants, utilities, Zustand stores, Supabase clients, and the 3D transform pipeline. No React components or hooks live here.

---

## Directory Structure

```
lib/
  types.ts              Shared TypeScript types for the whole project
  theme.ts              Canvas rendering colors (light/dark, pose skeleton)
  3d/                   3D transform pipeline
  constants/            Anchor descriptors, landmark descriptors, sizing
  stores/               Zustand global state stores
  supabase/             Supabase client factories
  storage/              Storage utilities (placeholder)
  utils/                Pure functions: anchors, drawing, SVG, smoothing, filters
```

---

## `types.ts`

Shared TypeScript types used across the entire project.

| Type              | Description                                                                       |
| ----------------- | --------------------------------------------------------------------------------- |
| `Keypoint`        | `{ x, y, z?, score? }` — one MediaPipe landmark                                   |
| `LandmarkFrame`   | `Keypoint[]` — 33 keypoints for a single video frame                              |
| `Dimensions`      | `{ width, height }`                                                               |
| `PointAnchor`     | `{ x, y }` — single anchor point                                                  |
| `QuadAnchor`      | `{ tl, tr, bl, br }` — four-corner anchor (torso)                                 |
| `SegmentAnchor`   | `{ from, to }` — two-point anchor (limbs)                                         |
| `HeadAnchor`      | `{ leftAnchor, rightAnchor, baseAnchor }` — three-point anchor (ears + base)      |
| `AnchorsMap`      | Maps each of 14 body parts to its anchor type                                     |
| `ShiftVector`     | `{ x, y }` — per-axis shift adjustment                                            |
| `ShiftFactors`    | 9 named shift points: torso, head, shoulder, elbow, wrist, hip, knee, ankle, foot |
| `ScaleVector`     | `{ x, y }` — per-axis scale adjustment                                            |
| `ScaleFactors`    | 5 named scale groups: head, arm, hand, leg, foot                                  |
| `SvgParts`        | `Record<string, string>` — SVG string or data URL per part key                    |
| `StoredAnimation` | `{ timestamp, landmarks, svgs, [metadata] }` — saved animation record             |
| `FileEntry`       | `{ key, name, source: 'cloud' }` — file listing entry                             |
| `CaptureViewMode` | `'live' \| 'replay' \| 'select-video'`                                            |

---

## `theme.ts`

Canvas rendering color palette for the Extract page skeleton visualization. Provides colors for left/right/center keypoints and connection lines, with light and dark mode variants. Used only by `PoseCanvas` — not by CSS or Tailwind.

---

## `constants/`

### `anchor-descriptors.ts`

**Exports:** `ANCHOR_MAP`, `BODY_PARTS`

`ANCHOR_MAP` maps each of the 14 body part names to the MediaPipe landmark indices used to compute its anchor:

| Body Part | Landmarks Used                                   |
| --------- | ------------------------------------------------ |
| Head      | Ears: 7 (left), 8 (right)                        |
| Torso     | Shoulders: 11, 12 + Hips: 23, 24                 |
| Arms      | Shoulder → Elbow → Wrist (11/12 → 13/14 → 15/16) |
| Hands     | Wrist → Index finger tip (15/16 → 19/20)         |
| Legs      | Hip → Knee → Ankle (23/24 → 25/26 → 27/28)       |
| Feet      | Ankle → Foot index (27/28 → 31/32)               |

`BODY_PARTS` is a readonly array of all 14 part names, derived from `ANCHOR_MAP` keys.

### `landmark-descriptors.ts`

**Exports:** `KEYPOINT_NAMES`, `CONNECTED_KEYPOINTS`

- `KEYPOINT_NAMES`: Names of all 33 MediaPipe Pose landmarks (nose, eyes, ears, shoulders, elbows, wrists, fingers, hips, knees, ankles, feet)
- `CONNECTED_KEYPOINTS`: Array of `[i, j]` index pairs defining the skeleton edges for rendering

### `sizes.ts`

**Exports:** `CANVAS_RATIO`, `WEBCAM_DIMENSIONS`, `BODY_PROPORTIONS`, `SMALL_SCREEN_BREAKPOINT`

- `CANVAS_RATIO` (`{ width: 0.45, height: 0.75 }`): Canvas proportions relative to viewport for the animation canvas
- `WEBCAM_DIMENSIONS` (`{ width: 256, height: 224 }`): Resolution for webcam capture
- `BODY_PROPORTIONS`: Per-part width/height ratios relative to viewport size — used for sizing the animation canvas context
- `SMALL_SCREEN_BREAKPOINT`: 600px

### `index.ts`

Barrel export re-exporting from `sizes`, `landmark-descriptors`, and `anchor-descriptors`. Import constants from `@/lib/constants` for convenience.

---

## `stores/`

Zustand stores for global client-side state. All stores are framework-agnostic TypeScript and importable in any client component or hook.

### `landmarks-store.ts` — `useLandmarksStore`

State for the pose detection lifecycle and extracted frames.

```typescript
{
  frames: LandmarkFrame[];         // all collected frames
  currentFrame: LandmarkFrame | null; // live frame for skeleton preview
  dimensions: Dimensions;          // source video dimensions
  setFrames, setCurrentFrame, setDimensions, clearFrames, reset
}
```

Written by `usePoseDetection`; read by the Extract page and Console page.

### `scale-factors-store.ts` — `useScaleFactorsStore`

Body-part scale adjustments for animation rendering.

```typescript
{
  headScale: ScaleVector;    // { x: 1, y: 1 } default
  armScale: ScaleVector;
  handScale: ScaleVector;
  legScale: ScaleVector;
  footScale: ScaleVector;
  setScale(key, value): void;
  setAll(factors): void;
  reset(): void;
  getFactors(): ScaleFactors;
}
```

Written by `ScaleControls`; read by `AnimationCanvas` each render frame.

### `shift-factors-store.ts` — `useShiftFactorsStore`

Per-anchor-point position adjustments for animation rendering.

```typescript
{
  torsoShift, headShift, shoulderShift, elbowShift, wristShift,
  hipShift, kneeShift, ankleShift, footShift: ShiftVector;
  setShift(key, value): void;
  setAll(factors): void;
  reset(): void;
  getFactors(): ShiftFactors;
}
```

Written by `ShiftControls`; read by `AnimationCanvas` each render frame.

---

## `supabase/`

Four Supabase client factories, each appropriate for a different execution context.

### `client.ts`

Browser client using `createBrowserClient()` from `@supabase/ssr`. Uses the publishable anon key. Safe for client components.

### `server.ts`

Per-request server client using `createServerClient()`. Reads and writes auth cookies for session management. Use in Server Components, API routes, and Server Actions.

### `admin.ts`

Singleton admin client using the `SUPABASE_SECRET_KEY` service role key. Bypasses Row Level Security — must only be used server-side. Returns `null` if the secret key is not configured (API routes fall back to the authenticated client).

### `middleware.ts`

`updateSession(request: NextRequest)` — refreshes the Supabase auth session and updates cookies. Called by the root `middleware.ts` on every request. Redirects unauthenticated users to `/login`.

**Supabase usage pattern in API routes:**

```typescript
const supabaseAdmin = createAdminClient();
const supabase = await createServerClient(); // authenticated session
const client = supabaseAdmin ?? supabase; // prefer admin; fallback to authed
```

---

## `utils/`

Pure functions with no side effects. No React, no browser globals unless explicitly documented.

### `set-anchors.ts`

Computes 2D anchor positions from a scaled landmark frame. One function per body-part type:

| Function          | Output          | Input landmarks                    |
| ----------------- | --------------- | ---------------------------------- |
| `setTorsoAnchors` | `QuadAnchor`    | Shoulders (11, 12) + hips (23, 24) |
| `setHeadAnchors`  | `HeadAnchor`    | Ears (7, 8) + shoulder midpoint    |
| `setArmAnchors`   | `SegmentAnchor` | Shoulder → elbow → wrist           |
| `setHandAnchors`  | `SegmentAnchor` | Wrist → index finger tip           |
| `setLegAnchors`   | `SegmentAnchor` | Hip → knee → ankle                 |
| `setFootAnchors`  | `SegmentAnchor` | Ankle → foot index                 |

Anchors apply shift factors (scaled to torso dimensions) before returning. Landmarks with confidence < 0.3 are ignored and `undefined` is returned.

### `drawing-utils.ts`

Renders SVG body parts onto Canvas 2D context using affine transforms.

| Function         | Part types handled                          |
| ---------------- | ------------------------------------------- |
| `drawTorsoSvg`   | Torso (3-point affine from quad corners)    |
| `drawHeadSvg`    | Head (centered, scaled by torso hypotenuse) |
| `drawSegmentSvg` | Upper/lower arms and legs (segment affine)  |
| `drawHandSvg`    | Hands                                       |
| `drawLegSvg`     | Legs                                        |
| `drawFootSvg`    | Feet                                        |

All functions save/restore the canvas context state around their transform, return `true` on success, `false` if the anchor or image is missing.

### `render-part-svg.ts`

Top-level rendering orchestrator. Dispatches rendering for each frame.

- `renderPartSvg(part, img, scaledLandmarks, renderContext)` — renders one body part
- `renderFrame(scaledLandmarks, svgImages, renderContext)` — renders all 14 parts in order

`RenderContext` carries: canvas context, dimensions, `TorsoDimensions`, `EarDistance`, shift/scale factors, background color, debug flags.

`renderFrame` also updates facing state (front/back detection) and selects the appropriate SVG variant (front or back) per part.

### `pose-utils.ts`

Landmark scaling and shift application.

- `scaleLandmarks(frame, originalDims, targetDims)` — linearly rescales all keypoints from one resolution to another
- `applyShiftsToFrame(frame, shifts, torsoW, torsoH)` — offsets keypoints by shift factors (in torso-relative units)
- Batch variants: `scaleLandmarkFrames`, `applyShiftsToFrames`

### `frame-filter.ts`

Pre-processing pipeline for raw landmark frame sequences.

| Function                                    | Purpose                                                   |
| ------------------------------------------- | --------------------------------------------------------- |
| `isFrameValid(frame, ...)`                  | True if frame has valid confidence at required keypoints  |
| `filterAndInterpolateFrames(frames)`        | Remove invalid frames; fill gaps via linear interpolation |
| `interpolateLowConfidenceLandmarks(frames)` | Per-landmark hole filling across the sequence             |
| `applyFrameInterval(frames, n)`             | Keep every Nth frame (downsampling)                       |

Default minimum confidence: 0.3. Default required indices: 11, 12, 23, 24 (shoulders + hips — torso validation).

### `landmark-smoother.ts`

One-Euro filter for temporal smoothing of landmark sequences.

```typescript
smoothLandmarkFrames(frames, fps?, config?) → LandmarkFrame[]
```

Applies independent per-keypoint per-axis One-Euro filters. The adaptive cutoff (`minCutoff + beta × |derivative|`) reduces lag during fast motion while filtering noise during slow motion.

Default config: `minCutoff = 1.0, beta = 0.007, dCutoff = 1.0`. Applied in the Extract pipeline after frame collection, before saving to Supabase.

### `ear-distance.ts` — `EarDistance` class

EMA tracker for inter-ear distance (head width). Used in `AnimationCanvas` to size the head SVG consistently across frames. Alpha: 0.3 (10% new / 90% history).

### `torso-dimensions.ts` — `TorsoDimensions` class

EMA-tracked torso metrics used as the reference scale for all body-part sizing during animation rendering.

Properties tracked:

- `avgTorsoHeight`, `avgTorsoWidth`, `avgHipWidth`
- `avgTorsoHypotenuse` — diagonal for orientation-stable sizing (head, hands)
- `torsoSvgWidth`, `torsoSvgHeight` — source asset dimensions
- `facingSmoothed`, `upperBodyFacingSmoothed`, `lowerBodyFacingSmoothed` — facing score
- `isFront` getter — true when facing score > 0

EMA alphas: torso 0.1, hips 0.05, facing 0.15. Fresh instances are created at each animation play start to avoid carry-over.

### `svg-utils.ts`

Low-level SVG and affine transform utilities.

- `affineFrom3Points(src0, src1, src2, dst0, dst1, dst2)` → `{ a,b,c,d,e,f }` — compute the 2×3 affine matrix mapping three source points to three destination points
- `svgStringToImage(svgString)` → `Promise<HTMLImageElement | null>` — parse an SVG string and load it as an image
- `getSvgSize(img)` → `{ w, h }` — read the natural dimensions of an SVG image element

### `validation-utils.ts`

- `validateAnchors(anchors[], width, height)` → `boolean` — returns `true` if any anchor is null, undefined, NaN, or out of bounds. Used before drawing to skip parts with invalid data.

---

## `3d/`

A complete 3D transform pipeline that converts raw MediaPipe landmark frames into spatially-correct per-body-part transforms (position, orientation, dimensions). Designed as the future rendering backend to replace the current 2D Canvas affine pipeline.

**Status:** The pipeline is fully implemented; integration with a React Three Fiber rendering layer is pending.

See [docs/3d-pipeline-architecture.md](../docs/3d-pipeline-architecture.md) for full design documentation.

### Modules

#### `types.ts`

Core 3D types:

| Type              | Description                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| `Vec3`            | `{ x, y, z }` — 3D vector                                                   |
| `Basis3`          | `{ right, up, forward }` — orthonormal coordinate frame                     |
| `PartTransform3D` | `{ position, basis, width, height, confidence }` — full body part transform |
| `BodyTransforms`  | Map of `BodyPartKey → PartTransform3D \| null`                              |
| `BodyPartKey`     | Union of all 14 body part names                                             |
| `SceneConfig`     | `{ sceneWidth, sceneHeight, depthScale }` — coordinate mapping config       |
| `HierarchyNode`   | Parent-child tree node for body part hierarchy                              |
| `PlaneMapping`    | Per-part anchor convention, local offset, z-offset, render order            |
| `SmootherState`   | Per-part EMA state for `TemporalSmoother`                                   |

#### `math.ts`

Vector math utilities: construction, arithmetic (`add`, `sub`, `mul`, `negate`), `dot`, `cross`, `len`, `lenSq`, `dist`, `normalize`, `lerp`, `midpoint`, `projectOnPlane`, `lerpScalar`, `isNearZero`. All operate on `Vec3`.

#### `coordinate-system.ts`

Converts MediaPipe normalized coordinates `[0,1]` to right-handed scene space.

```
sceneX = (landmark.x − 0.5) × sceneWidth
sceneY = −(landmark.y − 0.5) × sceneHeight   // flip Y
sceneZ = −landmark.z × depthScale             // flip Z
```

- `DEFAULT_SCENE_CONFIG`: `{ sceneWidth: 2.0, sceneHeight: 2.0, depthScale: 0.5 }`
- `landmarkToScene(kp, config)` → `Vec3`
- `frameTo3D(frame, config)` → `Vec3[]` (all 33 landmarks)
- `frameConfidences(frame)` → `number[]`

#### `torso-frame.ts`

Computes the torso reference frame from the four torso landmarks (11, 12, 23, 24). The torso is the root reference for all other body parts.

```typescript
computeTorsoFrame(landmarks3D, confidences, prevForward) → PartTransform3D | null
```

Builds an orthonormal basis (right, up, forward) from shoulder and hip midpoints. Includes sign-flip protection to prevent the forward vector from reversing between frames. Also exports `isFrontFacing`, `getShoulderMidpoint`, `getTorsoWidth`.

#### `part-transforms.ts`

Computes `PartTransform3D` for each non-torso body part:

- `computeHeadTransform` — uses ear midpoint + nose-to-shoulder height reference
- `computeSegmentTransform` — for all 8 limb segments (upper/lower arms and legs)
- `computeHandTransform` — wrist → index finger tip
- `computeFootTransform` — ankle → foot index (with 1.3× length multiplier)
- `computeAllPartTransforms(landmarks3D, confidences, torso)` → all 14 transforms

Limb width ratios (as fraction of torso width): upper arm 0.25, lower arm 0.20, upper leg 0.30, lower leg 0.22, hand 0.18, foot 0.20.

#### `temporal-smoother.ts` — `TemporalSmoother`

Frame-to-frame EMA smoothing for all body part transforms.

```typescript
class TemporalSmoother {
  smooth(raw: BodyTransforms): BodyTransforms;
}
```

Alphas: position 0.4, basis vectors 0.3, width/height 0.2. Sign-flip protection for basis vectors. Stale frame handling: reuse up to 10 frames, then null (hide part). Recovery ramp over 3 frames when signal returns.

#### `body-hierarchy.ts`

Defines the parent-child body tree:

```
torso → head, leftUpperArm, rightUpperArm, leftUpperLeg, rightUpperLeg
      → upper arms → lower arms → hands
      → upper legs → lower legs → feet
```

Exports `BODY_HIERARCHY` (flat lookup), `HIERARCHY_BFS_ORDER` (root → leaves for rendering), `HIERARCHY_REVERSE_ORDER`, `ALL_PARTS`.

#### `svg-plane-mapping.ts`

Per-part metadata for SVG-to-transform anchoring:

- SVG anchor type: `'center'`, `'top-center'`, or `'bottom-center'`
- `localOffset: Vec3` — shift relative to transform center (e.g. head shifts up from neck)
- `zOffset: number` — small per-hierarchy-depth offset to prevent z-fighting (0.000–0.015)
- `renderOrder: number` — paint order for transparency handling

#### `scene-orchestrator.ts`

Main entry point. Combines `frameTo3D → computeTorsoFrame → computeAllPartTransforms → TemporalSmoother` into a single call:

```typescript
orchestrateFrame(frame: LandmarkFrame, smoother: TemporalSmoother, config?: SceneConfig) → BodyTransforms
```

#### `index.ts`

Barrel export — re-exports all types, utilities, and classes from the pipeline.
