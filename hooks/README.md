# hooks/

Client-side React hooks. All hooks use `'use client'` where needed and are safe to import in client components only.

---

## Index

| Hook                   | Used by      | Purpose                                                  |
| ---------------------- | ------------ | -------------------------------------------------------- |
| `usePoseDetection`     | Extract page | MediaPipe detection loop and frame collection            |
| `useSketchCanvasRig`   | Sketch page  | 28-canvas management, undo, export, session persistence  |
| `useCacheSvgs`         | Console page | Convert SVG sources to cached `HTMLImageElement` objects |
| `useSetAnchorsAndDraw` | —            | Placeholder (not yet implemented)                        |

All hooks are re-exported from `hooks/index.ts`.

---

## `usePoseDetection`

**File:** `use-pose-detection.ts`  
**Used by:** `app/extract/page.tsx`

Manages the MediaPipe Pose Landmarker lifecycle and runs a real-time detection loop.

### Returns

```typescript
{
  isLoading: boolean;       // model is being fetched/initialized
  isModelReady: boolean;    // model is ready to detect
  isDetecting: boolean;     // detection loop is running
  frameCount: number;       // number of frames collected so far
  start: (video: HTMLVideoElement) => Promise<void>;
  stop: () => void;
}
```

### Key behaviors

**Singleton model:**  
`sharedLandmarker` is a module-level variable. The Pose Landmarker is created once on first `start()` call and kept alive across component mount/unmount cycles. Re-navigating to Extract does not reload the model.

**Model configuration:**

- Task: Pose Landmarker Lite (float16), loaded from MediaPipe CDN
- Running mode: `VIDEO` (optimized for streaming, not single images)
- GPU delegate: enabled
- Max poses: 1

**Detection loop:**  
Runs via `requestAnimationFrame`. Each tick calls `landmarker.detectForVideo(video, timestamp)` and converts the output to a `LandmarkFrame` array (all 33 normalized keypoints with `x`, `y`, `z`, `score`). Detected frames are pushed to `useLandmarksStore`.

**Frame limit:**  
Stops automatically after 9000 frames (~5 minutes at 30 fps) to prevent unbounded memory use.

**Dimensions tracking:**  
Updates `useLandmarksStore.setDimensions({ width, height })` based on the actual video element dimensions.

**Cleanup:**  
`stop()` cancels the RAF loop. The shared landmarker is not destroyed (intentional — avoids reload cost on re-navigation).

---

## `useSketchCanvasRig`

**File:** `use-sketch-canvas-rig.ts`  
**Used by:** `app/sketch/page.tsx`

Manages all 28 sketch canvases (14 body parts × front/back), the undo system, session persistence, and export.

### Exported Types

```typescript
type BodyPartName =
  | 'head'
  | 'torso'
  | 'rightUpperArm'
  | 'rightLowerArm'
  | 'rightHand'
  | 'leftUpperArm'
  | 'leftLowerArm'
  | 'leftHand'
  | 'rightUpperLeg'
  | 'rightLowerLeg'
  | 'rightFoot'
  | 'leftUpperLeg'
  | 'leftLowerLeg'
  | 'leftFoot';

type Side = 'front' | 'back';
```

### Returns

```typescript
{
  setCanvasRef(side: Side, part: BodyPartName, el: HTMLCanvasElement | null): void;
  pushUndoSnapshot(side: Side, part: BodyPartName): void;
  undo(): void;
  clearPart(side: Side, part: BodyPartName): void;
  clearAll(): void;
  exportAll(): { front: Record<string, string>; back: Record<string, string> };
  copyCanvas(fromSide, fromPart, toSide, toPart): void;
  mirrorCopyCanvas(fromSide, fromPart, toSide, toPart): void;
  saveToSession(): void;
}
```

### Key behaviors

**Canvas registration:**  
`setCanvasRef` is passed as `onMount` to each `SketchCanvas`. Canvases register themselves once they are mounted in the DOM.

**Undo system:**

- `pushUndoSnapshot(side, part)` saves the current canvas pixel data as an ImageData snapshot before a stroke begins
- `undo()` restores the most recent snapshot from the global history (cross-canvas — not per-canvas)
- Stack is capped at 40 entries per canvas

**Session persistence:**  
`saveToSession()` iterates all registered canvases, exports non-blank ones as data URLs, and writes to `sessionStorage` keyed by `{side}-{part}`. Saved data is restored on the next mount of `SketchCanvas`.

**Mirror copy:**  
`mirrorCopyCanvas(fromSide, fromPart, toSide, toPart)` copies a canvas with horizontal flip. Used to initialise the back-side canvases from the front on first navigation to the back view.

**Blank detection:**  
Export skips canvases where all pixels have alpha = 0 (blank canvases are omitted from the upload payload).

---

## `useCacheSvgs`

**File:** `use-cache-svgs.ts`  
**Used by:** `app/console/page.tsx` (via `AnimationCanvas`)

Converts a map of SVG sources (SVG strings or data URLs) into a stable map of cached `HTMLImageElement` objects.

### Signature

```typescript
function useCacheSvgs(
  svgs: SvgParts | null,
  torsoDimensionsRef: MutableRefObject<TorsoDimensions>,
): Record<string, HTMLImageElement>;
```

### Key behaviors

- Accepts `SvgParts` — a `Record<string, string>` where values are either SVG strings or `data:` URLs
- Converts each via `svgStringToImage()` or `dataUrlToImage()` from `lib/utils/svg-utils`
- When the torso image loads, calls `torsoDimensionsRef.current.updateTorsoSvgDimensions()` to set asset dimensions (needed for correct rendering proportions)
- Performs **shallow comparison** on the input — if the `SvgParts` reference hasn't changed, returns the cached result without reprocessing
- Cleans up on unmount: cancels any in-flight image loading to prevent state updates after unmount

---

## `useSetAnchorsAndDraw`

**File:** `use-set-anchors-and-draw.ts`  
**Status:** Placeholder — not yet implemented.

---

## Conventions

- All hooks are `'use client'` — never imported from Server Components
- Hooks do not own any UI; they return state and callbacks for pages/components to use
- Zustand stores are read directly inside hooks when needed (no prop drilling)
- Browser APIs (canvas, sessionStorage, requestAnimationFrame, matchMedia) are only accessed inside hooks, never in component render functions
