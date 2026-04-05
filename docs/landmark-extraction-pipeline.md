# Landmark Extraction Pipeline

## Purpose

This document describes the pipeline for capturing human pose data from video — from MediaPipe detection through pre-processing to persisted JSON in Supabase.

## Scope

Covers: `app/extract/page.tsx`, `hooks/use-pose-detection.ts`, `lib/utils/landmark-smoother.ts`, `lib/utils/frame-filter.ts`, `app/api/storage/landmarks/route.ts`.

---

## Pipeline Overview

```
Video source (webcam or file)
  → MediaPipe detectForVideo()
  → LandmarkFrame[] (raw, 33 keypoints per frame)
  → smoothLandmarkFrames()        (One-Euro filter)
  → filterAndInterpolateFrames()  (remove bad frames, fill gaps)
  → interpolateLowConfidenceLandmarks()  (per-landmark hole filling)
  → applyFrameInterval()          (optional downsampling)
  → POST /api/storage/landmarks
  → Supabase landmarks bucket
```

---

## Stage 1: Video Source

**Live (webcam):**

- `navigator.mediaDevices.getUserMedia({ video: { width: 256, height: 224 } })`
- Tracks permission state; displays guidance if denied
- Feed begins immediately on permission grant

**Browse (video upload):**

- User selects a video file; object URL assigned to `<video>`
- Detection begins once `video.readyState >= 2` (current data available)
- Supports any browser-playable video format

---

## Stage 2: MediaPipe Detection (`usePoseDetection`)

### Model

- **Task:** Pose Landmarker Lite, float16
- **Source:** MediaPipe CDN (`cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/...`)
- **Running mode:** `VIDEO` (frame-level with timestamp, optimized for streaming)
- **GPU delegate:** Enabled
- **Max poses:** 1

### Singleton pattern

The landmarker instance (`sharedLandmarker`) is a module-level variable — not tied to component lifecycle. Created once on first `start()` call, persists across React mounts/unmounts and page navigations. Re-navigating to Extract is instant.

### Detection loop

```typescript
function detect() {
  if (!isDetecting) return;
  const result = landmarker.detectForVideo(videoElement, performance.now());
  if (result.landmarks.length > 0) {
    const frame = result.landmarks[0].map((kp) => ({
      x: kp.x,
      y: kp.y,
      z: kp.z,
      score: kp.visibility ?? 0,
    }));
    store.setCurrentFrame(frame); // live preview
    frames.push(frame);
    store.setFrames([...frames]);
  }
  requestAnimationFrame(detect);
}
```

Stops automatically after 9000 frames (~5 min at 30 fps).

### Output format (`LandmarkFrame`)

```typescript
type LandmarkFrame = Keypoint[]; // 33 keypoints
type Keypoint = { x: number; y: number; z: number; score: number };
```

`x` and `y` are normalized to `[0, 1]` relative to video frame dimensions. `z` is depth relative to the hip midpoint (negative = toward camera). `score` is landmark visibility confidence `[0, 1]`.

### Dimensions tracking

`useLandmarksStore.setDimensions({ width: video.videoWidth, height: video.videoHeight })` is called each frame. The console page uses these dimensions to scale landmarks correctly to the canvas size.

---

## Stage 3: Pre-Processing

Applied client-side before save (in `app/extract/page.tsx` after detection stops).

### One-Euro Smoothing (`smoothLandmarkFrames`)

Reduces per-frame noise while preserving fast motion.

- Per-keypoint, per-axis (x, y, z) independent One-Euro filter
- Adaptive cutoff: `cutoff = minCutoff + beta × |derivative|`
  - Low motion → low cutoff → strong smoothing
  - Fast motion → high cutoff → almost no lag
- Default config: `minCutoff = 1.0, beta = 0.007, dCutoff = 1.0`
- Applied at 30 fps

### Frame Validation and Interpolation (`filterAndInterpolateFrames`)

1. Marks frames as valid if all required keypoints (shoulders 11/12, hips 23/24) have confidence ≥ 0.3
2. For each invalid frame: linearly interpolates between the nearest valid frames before and after
3. If no valid neighbor exists, the frame is kept as-is (degenerate case)

Returns a sequence of the same length as input with gaps filled.

### Per-Landmark Hole Filling (`interpolateLowConfidenceLandmarks`)

Iterates each keypoint index independently. For any keypoint with confidence < 0.3, finds the nearest valid values before and after in the sequence and linearly interpolates position. Fills in occluded keypoints without affecting well-tracked ones.

### Frame Downsampling (`applyFrameInterval`)

Keeps every Nth frame. Default: 1 (keep all). User-adjustable via the `jitterInterval` slider (1–10). Reduces file size and animation speed for high-fps captures.

---

## Stage 4: Upload to Supabase

`POST /api/storage/landmarks`

**Request:**

```json
{
  "name": "capture-2026-04-04T14-30-00",
  "frames": [
    [{ "x": 0.48, "y": 0.31, "z": -0.05, "score": 0.97 }, ...],
    ...
  ],
  "dimensions": { "width": 256, "height": 224 }
}
```

**Server processing:**

1. Authenticate user via Supabase server client
2. Validate: non-empty frames array, positive dimensions, first frame structure check (keypoints with x/y)
3. Sanitize name (strip unsafe characters)
4. Serialize to JSON and upload to `landmarks/{userId}/{name}.json`
5. Uses admin client (bypasses RLS) with authenticated client fallback
6. Payload limit: 10 MB (checked via `Content-Length` header)

**Storage layout:**

```
landmarks/
  {userId}/
    capture-2026-04-04T14-30-00.json
    capture-2026-04-01T09-15-42.json
    ...
```

---

## Stage 5: Download (Console)

`GET /api/storage/landmarks?key={userId}/{name}.json`

1. Downloads the JSON file from the `landmarks` bucket
2. Parses and returns: `{ name, dimensions, frames }`

The console page stores loaded frames and dimensions in state and passes them to `AnimationCanvas` for rendering.

---

## Live Preview

During detection, `useLandmarksStore.currentFrame` is updated with each new `LandmarkFrame`. `PoseCanvas` renders a skeleton overlay in real time:

- Dots at each of 33 keypoints, colored by side (left = pink, right = blue, center = green)
- Lines connecting keypoints per `CONNECTED_KEYPOINTS`
- Updates on every frame via `useEffect` on `currentFrame`

After detection stops, stored frames are displayed as a frame-step replay using the same `PoseCanvas`.

---

## Key Modules

| Module                                  | Role                                                 |
| --------------------------------------- | ---------------------------------------------------- |
| `app/extract/page.tsx`                  | Orchestrates source, detection, pre-processing, save |
| `hooks/use-pose-detection.ts`           | MediaPipe singleton, RAF loop, frame collection      |
| `lib/utils/landmark-smoother.ts`        | One-Euro temporal smoothing                          |
| `lib/utils/frame-filter.ts`             | Frame validation, interpolation, downsampling        |
| `lib/stores/landmarks-store.ts`         | Cross-component frame state                          |
| `components/extract/canvas/pose-canvas` | Skeleton preview overlay                             |
| `app/api/storage/landmarks/route.ts`    | Upload/download landmark files                       |
| `lib/constants/landmark-descriptors`    | `KEYPOINT_NAMES`, `CONNECTED_KEYPOINTS`              |

---

## Data Flow Diagram

```
[Video source] webcam or file upload
         ↓
[MediaPipe] detectForVideo() → raw LandmarkFrame[] (33 keypoints × N frames)
         ↓
[useLandmarksStore] currentFrame → PoseCanvas (live skeleton preview)
         ↓ (on detection complete)
[smoothLandmarkFrames()] One-Euro per-keypoint noise reduction
         ↓
[filterAndInterpolateFrames()] remove invalid frames, fill temporal gaps
         ↓
[interpolateLowConfidenceLandmarks()] per-keypoint hole filling
         ↓
[applyFrameInterval(N)] optional downsampling
         ↓
[POST /api/storage/landmarks] JSON serialize → Supabase upload
         ↓
[landmarks bucket] {userId}/{name}.json
```

---

## Constraints and Design Decisions

- **Singleton model** — avoids the ~1s WASM load cost on every Extract page visit
- **VIDEO running mode** — MediaPipe's frame-stamped mode provides better temporal consistency than IMAGE mode for video streams
- **Pre-processing client-side** — keeps the API route simple and avoids server-side compute costs for signal processing
- **Per-landmark hole filling** — handles partial occlusion (e.g. one arm off-screen) without discarding the whole frame
- **10 MB payload limit** — a 5-minute capture at 30 fps with 33 keypoints × 4 floats ≈ ~7 MB uncompressed JSON; this stays within the limit
- **No video stored** — only landmark coordinates are persisted; raw video is never uploaded
