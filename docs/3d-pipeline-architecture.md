# 3D SVG Body-Part Pipeline – Architecture

## 1. Architecture Overview

### Current 2D Rendering Pipeline (in use)

```
LandmarkFrame → scaleLandmarks() → applyShifts() → setAnchors() → draw*Svg() → Canvas 2D
```

Each body part gets a 2D anchor (quad, segment, or head-ear pair), mapped via an affine transform onto an HTML Canvas 2D context. Depth (z) is ignored entirely. Facing is detected via cross-product and used only for front/back SVG selection and z-ordering.

### Implemented 3D Transform Pipeline (lib/3d/)

The full 3D transform pipeline is implemented and tested in `lib/3d/`. It converts raw landmark frames into spatially-correct per-part transforms ready for 3D rendering.

```
LandmarkFrame → frameTo3D() → computeTorsoFrame() → computeAllPartTransforms()
                                                               ↓
                                                     TemporalSmoother.smooth()
                                                               ↓
                                                       BodyTransforms
```

`BodyTransforms` provides each of the 14 body parts with: world-space position (`Vec3`), orientation basis (`Basis3`: right, up, forward), and dimensions (width, height). These are ready to drive a 3D rendering layer.

### Pending: 3D Rendering Layer (not yet built)

The React Three Fiber rendering layer that would consume `BodyTransforms` is not yet built. The console page still uses the 2D `AnimationCanvas`.

```
BodyTransforms → R3F Scene → <BodyPartMesh> (textured PlaneGeometry) → WebGL Canvas
```

### What Is Implemented

| Module                         | Status                                         |
| ------------------------------ | ---------------------------------------------- |
| `lib/3d/types.ts`              | ✅ Implemented                                 |
| `lib/3d/math.ts`               | ✅ Implemented                                 |
| `lib/3d/coordinate-system.ts`  | ✅ Implemented                                 |
| `lib/3d/torso-frame.ts`        | ✅ Implemented                                 |
| `lib/3d/part-transforms.ts`    | ✅ Implemented (all 14 parts incl. hands/feet) |
| `lib/3d/temporal-smoother.ts`  | ✅ Implemented (EMA + sign-flip protection)    |
| `lib/3d/body-hierarchy.ts`     | ✅ Implemented                                 |
| `lib/3d/svg-plane-mapping.ts`  | ✅ Implemented                                 |
| `lib/3d/scene-orchestrator.ts` | ✅ Implemented                                 |
| `lib/3d/index.ts`              | ✅ Barrel export                               |

### What Is Not Yet Built

| Module / Component                | Status         |
| --------------------------------- | -------------- |
| React Three Fiber rendering       | ⬜ Not started |
| `<AnimationScene>` (R3F canvas)   | ⬜ Not started |
| `<BodyPartMesh>` (textured plane) | ⬜ Not started |
| SVG → Three.js texture loading    | ⬜ Not started |
| Occlusion/depth rendering tuning  | ⬜ Not started |

### What Stays Unchanged

| Module                                 | Status                                     |
| -------------------------------------- | ------------------------------------------ |
| MediaPipe capture (`usePoseDetection`) | Unchanged                                  |
| Landmark storage (`useLandmarksStore`) | Unchanged                                  |
| Sketch canvases (`useSketchCanvasRig`) | Unchanged                                  |
| SVG caching (`useCacheSvgs`)           | Unchanged (images → textures in future)    |
| Shift/scale stores                     | Unchanged (applied in 3D coordinate space) |
| Anchor descriptors (`ANCHOR_MAP`)      | Reused for joint index lookups             |
| Types (`LandmarkFrame`, `Keypoint`)    | Extended, not replaced                     |

### What the 2D Pipeline Modules Will Be Replaced By

| Current 2D module       | 3D replacement                                       |
| ----------------------- | ---------------------------------------------------- |
| `set-anchors.ts`        | `lib/3d/part-transforms.ts`                          |
| `drawing-utils.ts`      | R3F `<BodyPartMesh>` components (not yet built)      |
| `render-part-svg.ts`    | `lib/3d/scene-orchestrator.ts` + R3F scene           |
| `svg-utils.ts` (affine) | Three.js handles transforms natively                 |
| `AnimationCanvas`       | `<AnimationScene>` R3F Canvas (not yet built)        |
| `torso-dimensions.ts`   | `lib/3d/torso-frame.ts`                              |
| `ear-distance.ts`       | Absorbed into head transform in `part-transforms.ts` |

---

## 2. Coordinate Conversion

### Mapping Strategy

MediaPipe landmarks are normalized to `[0, 1]` for x/y and use a relative depth for z (negative = toward camera, relative to hip midpoint).

**Scene coordinate convention** (right-handed, matches Three.js):

| Axis | Direction     | Range                              |
| ---- | ------------- | ---------------------------------- |
| X    | Right         | `[-sceneWidth/2, +sceneWidth/2]`   |
| Y    | Up            | `[-sceneHeight/2, +sceneHeight/2]` |
| Z    | Toward camera | Scaled from landmark z             |

**Conversion formulas:**

```
sceneX = (landmark.x - 0.5) × sceneWidth
sceneY = -(landmark.y - 0.5) × sceneHeight   // flip Y (MediaPipe Y points down)
sceneZ = -landmark.z × depthScale             // flip Z (MediaPipe negative = near camera)
```

### Tunable Constants

| Constant       | Default | Purpose                                          |
| -------------- | ------- | ------------------------------------------------ |
| `SCENE_WIDTH`  | `2.0`   | Horizontal extent                                |
| `SCENE_HEIGHT` | `2.0`   | Vertical extent                                  |
| `DEPTH_SCALE`  | `0.5`   | Z multiplier (lower = flatter; higher = more 3D) |

### Stability

The mapping is purely linear with fixed constants, so it remains frame-stable by construction. Any per-frame instability comes from the landmarks themselves and is handled by the temporal smoother (§10).

---

## 3. Torso Reference Frame

### Landmarks Used

| Landmark       | Index | Role               |
| -------------- | ----- | ------------------ |
| Left shoulder  | 11    | Torso top-left     |
| Right shoulder | 12    | Torso top-right    |
| Left hip       | 23    | Torso bottom-left  |
| Right hip      | 24    | Torso bottom-right |

### Computation

1. `shoulderMid = midpoint(leftShoulder, rightShoulder)`
2. `hipMid = midpoint(leftHip, rightHip)`
3. `center = midpoint(shoulderMid, hipMid)`
4. `rawUp = normalize(shoulderMid − hipMid)`
5. `rawRight = normalize(rightShoulder − leftShoulder)`
6. `forward = normalize(cross(rawRight, rawUp))`
7. `up = rawUp` (already normalized)
8. `right = normalize(cross(up, forward))` — re-orthogonalized

### Output

```typescript
{
  position: center,
  basis: { right, up, forward },
  width: distance(leftShoulder, rightShoulder),
  height: distance(shoulderMid, hipMid),
  confidence: min(scores of indices 11, 12, 23, 24)
}
```

### Stabilization

- If `width < ε` (edge-on), the torso is nearly profile; fall back to previous frame's forward vector.
- `forward` sign consistency: if `dot(forward, prevForward) < 0`, negate forward (and right) to prevent sign flips.

### How Other Parts Reference the Torso

All body parts use `torsoFrame.basis` as a default orientation plane. Limb planes start from the torso plane and rotate only around their primary axis (joint-to-joint direction).

---

## 4. Head Transform

### Landmarks Used

| Landmark  | Index | Role               |
| --------- | ----- | ------------------ |
| Left ear  | 7     | Head width (left)  |
| Right ear | 8     | Head width (right) |
| Nose      | 0     | Height reference   |

### Computation

1. `earMid = midpoint(leftEar, rightEar)`
2. `width = distance(leftEar, rightEar)`
3. `heightRef = distance(nose, shoulderMid)`
4. `height = heightRef × HEAD_HEIGHT_MULTIPLIER`
5. `position = shoulderMid + torso.up × (height × 0.5 + NECK_OFFSET × torsoHeight)`
6. `basis = torso.basis` (head plane matches torso plane)

### Constants

| Constant                 | Default | Purpose                               |
| ------------------------ | ------- | ------------------------------------- |
| `HEAD_HEIGHT_MULTIPLIER` | `1.6`   | Nose-to-shoulder → full head height   |
| `NECK_OFFSET_RATIO`      | `0.08`  | Fraction of torso height for neck gap |

### Anchor Convention

SVG anchor: **bottom-center**. The head SVG hangs from the neck point, growing upward. The head base sits at the shoulder midpoint + neck offset.

### Stability

Width and height are EMA-smoothed (α = 0.25) to avoid frame-to-frame jitter in head size. Position is smoothed by the global temporal smoother.

---

## 5. Limb Transforms

### Segment Definitions

| Part            | From (index)  | To (index) |
| --------------- | ------------- | ---------- |
| Left upper arm  | 11 (shoulder) | 13 (elbow) |
| Left lower arm  | 13 (elbow)    | 15 (wrist) |
| Right upper arm | 12 (shoulder) | 14 (elbow) |
| Right lower arm | 14 (elbow)    | 16 (wrist) |
| Left upper leg  | 23 (hip)      | 25 (knee)  |
| Left lower leg  | 25 (knee)     | 27 (ankle) |
| Right upper leg | 24 (hip)      | 26 (knee)  |
| Right lower leg | 26 (knee)     | 28 (ankle) |

### Computation (per segment)

1. `from = landmarks3D[startIdx]`
2. `to = landmarks3D[endIdx]`
3. `center = midpoint(from, to)`
4. `segmentLength = distance(from, to)`
5. `direction = normalize(to − from)` — primary axis (local Y)
6. `refNormal = torso.forward` — default plane orientation
7. `right = normalize(cross(direction, refNormal))`
   - If `|cross| < ε` (limb parallel to forward): use `torso.right` as fallback
8. `forward = normalize(cross(right, direction))` — plane normal
9. `basis = { right, up: direction, forward }`
10. `width = torsoWidth × LIMB_WIDTH_RATIO[part]`
11. `height = segmentLength`

### Width Ratios (fraction of torso width)

| Part      | Ratio  |
| --------- | ------ |
| Upper arm | `0.25` |
| Lower arm | `0.20` |
| Upper leg | `0.30` |
| Lower leg | `0.22` |

### Stability

Limb basis vectors use the torso forward as reference, which is itself smoothed. This prevents random roll around the limb axis. The `ε`-check fallback ensures the basis remains valid when limbs point toward the camera.

---

## 6. Hands and Feet (First Pass)

### Hands

- **From**: wrist (15 / 16)
- **To**: index finger tip (19 / 20)
- **Algorithm**: Same as limb segments
- **Width**: `torsoWidth × 0.18`
- **Approximation**: Uses only wrist → finger direction; ignores finger splay. The hand plane aligns with the forearm direction when fingers are extended.
- **Future improvement**: Use all 5 finger landmarks from MediaPipe Hand Landmarker for detailed hand pose.

### Feet

- **From**: ankle (27 / 28)
- **To**: foot index (31 / 32)
- **Algorithm**: Same as limb segments
- **Width**: `torsoWidth × 0.20`
- **Length multiplier**: `1.3 ×` actual landmark distance (feet appear longer than the ankle-to-toe landmark span)
- **Approximation**: Foot orientation is derived from a single vector; no arch or heel differentiation.
- **Future improvement**: Use heel (29/30) + toe (31/32) for better foot plane estimation.

---

## 7. Part Hierarchy

```
torso (root)
├── head
├── leftUpperArm
│   └── leftLowerArm
│       └── leftHand
├── rightUpperArm
│   └── rightLowerArm
│       └── rightHand
├── leftUpperLeg
│   └── leftLowerLeg
│       └── leftFoot
└── rightUpperLeg
    └── rightLowerLeg
        └── rightFoot
```

### Transform Strategy

**Phase 1 (current)**: All transforms are computed in **world space** directly from landmarks. The hierarchy is used only for:

- Render ordering (parent before child)
- Fallback logic (if child landmarks are low-confidence, inherit parent orientation)
- Scene graph organization in R3F

**Phase 2+ (future)**: Convert to **local transforms** relative to parent. Benefits:

- Inverse kinematics support
- Constraint-based posing
- Procedural animation blending

The code structures the hierarchy as a tree so that transitioning from world-space to local-space transforms requires only changing the orchestrator, not the hierarchy definition.

---

## 8. SVG Plane Mapping

### Plane Construction

Each body part's SVG is rendered onto a transparent `PlaneGeometry` in Three.js:

- Plane width = `transform.width`
- Plane height = `transform.height`
- Position = `transform.position`
- Rotation from `transform.basis` (converted to Euler or quaternion)

### Anchor Conventions

| Part      | SVG Anchor    | Meaning                                             |
| --------- | ------------- | --------------------------------------------------- |
| Head      | bottom-center | Base of SVG sits at neck point; head extends upward |
| Torso     | center        | SVG centered on torso midpoint                      |
| Upper arm | top-center    | Top of SVG at shoulder; extends toward elbow        |
| Lower arm | top-center    | Top at elbow; extends toward wrist                  |
| Hand      | top-center    | Top at wrist; extends toward fingers                |
| Upper leg | top-center    | Top at hip; extends toward knee                     |
| Lower leg | top-center    | Top at knee; extends toward ankle                   |
| Foot      | top-center    | Top at ankle; extends toward toes                   |

### Local Offset

Each part has a `localOffset: Vec3` that shifts the SVG plane relative to the computed transform center. This is stored in `svg-plane-mapping.ts` and defaults to `(0, 0, 0)` for most parts. Head uses `(0, +height/2, 0)` to shift upward from the neck anchor.

### Texture Handling

- SVG `HTMLImageElement` → `THREE.CanvasTexture` (or `THREE.Texture` from data URL)
- `transparent: true`, `alphaTest: 0.01` (discard near-invisible pixels)
- `side: THREE.DoubleSide` (visible from front and back)

---

## 9. Rendering Stack

### Recommendation: `react-three-fiber` + `@react-three/drei`

| Factor                    | Assessment                                                                       |
| ------------------------- | -------------------------------------------------------------------------------- |
| **React integration**     | R3F is the standard React wrapper for Three.js — declarative scene graph via JSX |
| **Next.js compatibility** | Dynamic import with `ssr: false` (same pattern as MediaPipe)                     |
| **Depth handling**        | Native WebGL depth buffer — no manual z-sorting                                  |
| **Transparency**          | Alpha blending with `depthWrite: false` + `renderOrder`                          |
| **Performance**           | GPU-accelerated; renders 14 textured planes at 60 fps trivially                  |
| **Scene graph**           | Built-in `<group>` nesting matches body hierarchy                                |
| **Camera**                | `OrthographicCamera` preserves flat-puppet aesthetic                             |
| **Ecosystem**             | drei provides `useTexture`, `Billboard`, `OrthographicCamera` helpers            |

### Why Not Alternatives

- **CSS `transform-style: preserve-3d`**: No depth buffer, manual z-ordering, poor performance with many elements, limited 3D math.
- **Raw Three.js (no R3F)**: Imperative API clashes with React component model; harder to integrate with Zustand stores and hooks.
- **PixiJS**: 2D-first; 3D support is limited and unofficial.

### Integration

```tsx
// Dynamic import (no SSR)
const AnimationScene = dynamic(
  () => import('@/components/canvas/animation-scene'),
  {
    ssr: false,
  },
);
```

The `<AnimationScene>` component replaces `<AnimationCanvas>` with the same props interface. Internally it creates an R3F `<Canvas>` with an orthographic camera, iterates over `BodyTransforms`, and renders a `<BodyPartMesh>` for each non-null transform.

---

## 10. Temporal Smoothing

### Strategy

Frame-to-frame exponential moving average (EMA) applied to all transform components:

| Component          | Alpha | Rationale                              |
| ------------------ | ----- | -------------------------------------- |
| Position (x, y, z) | `0.4` | Responsive to motion                   |
| Basis vectors      | `0.3` | Smoother; orientation shouldn't jitter |
| Width / height     | `0.2` | Body proportions change slowly         |

### Sign-Flip Protection

For basis vectors (especially `forward`):

```
if dot(prev.forward, current.forward) < 0:
    current.forward = -current.forward
    current.right = -current.right   // maintain handedness
```

This prevents the torso (and all dependent parts) from flipping 180° when the cross-product changes sign due to noise.

### Low-Confidence Handling

- If a body part's confidence < `MIN_CONFIDENCE` (0.3): reuse last valid transform with a decay counter.
- After `MAX_STALE_FRAMES` (10) frames of reuse, set transform to `null` (hide the part).
- When a valid transform returns, blend from stale → fresh over 3 frames (ramp alpha from 0.1 → normal).

### State

The `TemporalSmoother` class stores per-part state:

```typescript
{
  prev: PartTransform3D | null,
  staleCount: number,
  isRecovering: boolean,
}
```

---

## 11. Occlusion and Depth

### Primary Strategy: Scene Depth

With an R3F/Three.js scene, body parts naturally occlude based on their z-position. Landmark z-values provide real depth separation — arms in front of the torso will render in front.

### Controlled Z-Offsets

Small additive z-offsets per hierarchy level prevent z-fighting when parts are coplanar:

| Level | Parts                        | Z-Offset |
| ----- | ---------------------------- | -------- |
| 0     | Torso                        | `0.000`  |
| 1     | Head, upper arms, upper legs | `0.005`  |
| 2     | Lower arms, lower legs       | `0.010`  |
| 3     | Hands, feet                  | `0.015`  |

These offsets are in scene units (scene range ~2.0) and are imperceptible visually but prevent WebGL z-fighting.

### Transparent Rendering

For overlapping transparent SVG planes:

1. Set `material.transparent = true`
2. Set `material.depthWrite = false` (prevents transparent pixels from blocking later draws)
3. Set `material.alphaTest = 0.01` (discard fully transparent pixels early)
4. Use `renderOrder` per hierarchy level to enforce back-to-front rendering
5. `renderer.sortObjects = true` (default) handles remaining depth cases

### Facing-Based Render Order

When the character is front-facing:

- Torso renders first (behind limbs)
- Limbs render on top

When back-facing (detected via torso forward direction):

- Limbs render first (behind torso)
- Torso renders last (on top)

This matches the existing 2D pipeline's z-ordering logic.

---

## 12. Integration Status and Next Steps

### Completed

All `lib/3d/` modules are implemented:

- ✅ Types (`Vec3`, `Basis3`, `PartTransform3D`, `BodyTransforms`)
- ✅ Vector math (`lib/3d/math.ts`)
- ✅ Coordinate conversion (`lib/3d/coordinate-system.ts`)
- ✅ Torso reference frame (`lib/3d/torso-frame.ts`)
- ✅ All 14 part transforms including hands and feet (`lib/3d/part-transforms.ts`)
- ✅ Body hierarchy definition (`lib/3d/body-hierarchy.ts`)
- ✅ Temporal EMA smoother with sign-flip protection (`lib/3d/temporal-smoother.ts`)
- ✅ SVG plane mapping metadata (`lib/3d/svg-plane-mapping.ts`)
- ✅ Scene orchestrator entry point (`lib/3d/scene-orchestrator.ts`)
- ✅ Unit tests for math, coordinate system, hierarchy, and transforms (`lib/3d/__tests__/`)

### Next: R3F Rendering Layer (Phase 1 remaining)

**Steps to connect the pipeline to 3D rendering:**

1. Install `three`, `@react-three/fiber`, `@react-three/drei`
2. Create `<AnimationScene>` component — R3F `<Canvas>` with `<OrthographicCamera>`
3. Create `<BodyPartMesh>` — `<PlaneGeometry>` with SVG texture; accepts a `PartTransform3D`
4. Wire `scene-orchestrator.ts` into `<AnimationScene>` to produce `BodyTransforms` per frame
5. Replace `<AnimationCanvas>` in `app/console/page.tsx` with `<AnimationScene>`
6. Load SVGs as `THREE.CanvasTexture` (from existing `HTMLImageElement` cache via `useCacheSvgs`)
7. Dynamically import `<AnimationScene>` with `ssr: false` (same pattern as MediaPipe)

**Integration approach:**

`<AnimationScene>` should match the props interface of the current `<AnimationCanvas>` as closely as possible to minimize changes to `app/console/page.tsx`.

### Phase 2 — Hierarchy and Fallbacks (after R3F rendering is live)

- Hierarchy-based confidence fallbacks: inherit parent orientation when child landmarks are low-confidence
- Tune width ratios and offset constants for all parts

### Phase 3 — Depth and Occlusion Polish

- Tune z-offsets to eliminate any remaining z-fighting
- Facing-based render order switching (torso front/back logic)
- EMA alpha tuning per part

### Phase 4 — Advanced Features (optional)

- Local-space transforms relative to parent (prerequisite for inverse kinematics)
- Perspective camera option
- Shadow planes
- Motion trails

---

## 13. Validation Checklist

| Area                       | Checks                                                                       |
| -------------------------- | ---------------------------------------------------------------------------- |
| **Transform correctness**  | Parts attached at correct joints; no floating limbs; torso centered          |
| **Anatomical consistency** | Head proportional to torso; limbs correct length; no inversion               |
| **Visual stability**       | No jitter at rest; smooth motion during movement; no sign flips              |
| **Depth behavior**         | Arms in front of torso when extended forward; correct layering on turns      |
| **Responsiveness**         | Pose-to-render latency < 2 frames; 30 fps maintained                         |
| **Maintainability**        | All constants named and tunable; clear module boundaries; < 200 LOC per file |
| **Performance**            | < 4ms per frame for transform computation; GPU frame time < 8ms              |
| **Cross-pose**             | Works for T-pose, arms down, sitting, profile, back-facing                   |
| **Screen sizes**           | Scales correctly on phone (375px), tablet (768px), laptop (1440px)           |
