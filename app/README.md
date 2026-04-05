# app/

Next.js App Router directory. Contains all pages, layouts, API routes, server actions, and the in-app documentation page.

---

## Directory Structure

```
app/
  layout.tsx              Root layout (fonts, NavBar, metadata)
  page.tsx                Landing page
  globals.css             Global styles, CSS custom properties, theme tokens
  error.tsx               Global error boundary
  loading.tsx             Global loading state
  not-found.tsx           404 page
  actions/
    auth.ts               Server actions: login, register, logout
  api/
    storage/
      upload/             GET/POST — download or upload SVG sketch sets
      landmarks/          GET/POST — download or upload landmark frame files
      list/               GET — list files in a bucket for the current user
      files/              DELETE — delete a file from a bucket
  auth/
    callback/route.ts     OAuth callback handler
  sketch/                 Sketch editor page
  extract/                Pose detection and landmark capture page
  console/                Animation playback and file management page
  login/                  Login form
  register/               Registration form
  docs/                   In-app documentation page
```

---

## Global Layout (`layout.tsx`)

Root layout wraps every page with:

- Three Google Fonts: Geist (sans-serif), Geist Mono (monospace), Space Grotesk (display/headings)
- HTML `lang="en"` and antialiased body
- `<NavBar />` rendered at the top of every page
- Metadata: title, description

`globals.css` defines:

- Tailwind CSS v4 base
- CSS custom properties for all theme tokens: `--accent`, `--bg`, `--fg`, `--surface`, `--border`, `--danger`, and their variants
- Light and dark mode token overrides based on `prefers-color-scheme`
- Animation keyframes: `side-flip` (rotateY 360°), `glow-pulse`
- Shared component styles: `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.input-themed`, `.color-swatch`

---

## Authentication

### Server Actions (`actions/auth.ts`)

All marked `'use server'`. Use the Supabase server client (cookie-based).

| Action     | Input      | Behavior                                         |
| ---------- | ---------- | ------------------------------------------------ |
| `login`    | `FormData` | Signs in with email+password; redirects to `/`   |
| `register` | `FormData` | Creates account; redirects to login with message |
| `logout`   | —          | Signs out; redirects to `/login`                 |

Errors redirect back to the form with an `?error=` query param. Login success redirects to `/`.

### Middleware (`middleware.ts` at root)

Every request (except static assets) passes through `updateSession()` in `lib/supabase/middleware.ts`. This refreshes the Supabase session cookie and redirects unauthenticated users to `/login`.

---

## API Routes (`api/storage/`)

All routes authenticate the request via Supabase server client before operating on storage. Storage writes use the admin client (bypasses RLS) with an authenticated client as fallback. Storage paths are always scoped to `{userId}/...`.

### `POST /api/storage/upload`

Uploads a complete SVG sketch set (28 images — 14 parts × front/back).

**Request body:**

```json
{
  "setName": "my-sketch-001",
  "images": {
    "front": { "head": "data:image/webp;base64,...", ... },
    "back":  { "head": "data:image/webp;base64,...", ... }
  }
}
```

**Storage path:** `svgs/{userId}/{setName}/{partName}-{side}.webp`

**Response:** `{ paths: string[] }` or `{ error, details }`

### `GET /api/storage/upload?key={userId}/{setName}`

Downloads all `.webp` files under the given folder and returns them as base64 data URLs.

**Response:** `{ images: { "head-front": "data:image/webp;base64,...", ... } }`

### `POST /api/storage/landmarks`

Uploads a landmark frame sequence as JSON.

**Request body:**

```json
{
  "name": "capture-2026-04-04",
  "frames": [ [ { "x": 0.5, "y": 0.3, "z": -0.1, "score": 0.98 }, ... ], ... ],
  "dimensions": { "width": 256, "height": 224 }
}
```

**Storage path:** `landmarks/{userId}/{name}.json`

**Response:** `{ path: string }` or `{ error }`

### `GET /api/storage/landmarks?key={userId}/{name}.json`

Downloads and returns a landmark file.

**Response:** `{ name, dimensions, frames }`

### `GET /api/storage/list?bucket=svgs|landmarks|user_data`

Lists all files for the authenticated user in the given bucket.

**Response:** `{ files: [{ key, name, source: 'cloud' }] }`

### `DELETE /api/storage/files?bucket=...&key=...`

Deletes a specific file. Validates that the key belongs to the authenticated user.

**Response:** `{ success: true }` or `{ error }`

---

## Pages

### Sketch (`/sketch`)

**Purpose:** SVG body-part sketch editor.

**Scope:** The primary drawing interface. Users draw custom body-part artwork that will later be animated over pose landmarks.

**User flow:**

1. Open the sketch page
2. Select a tool (pen, line, rect, circle, ellipse) from the toolbar
3. Adjust brush size and color
4. Draw on the 14-part body grid — each body part has its own canvas
5. Toggle between front and back views
6. Save the sketch set to Supabase

**Grid layout:**

- Arms-up mode: 8-column grid representing the full body with arms extended horizontally
- Arms-down mode: 4-column grid with arms alongside the body (used automatically on mobile)
- Single-part focus mode: enlarges one part for detail work with prev/next navigation

**Drawing pipeline:**

- **Pen tool:** `perfect-freehand` converts pointer events (with pressure) → stroke outline → `Path2D` → `ctx.fill()` on Canvas 2D
- **Shape tools (line, rect, circle, ellipse):** pointer-down sets start; drag shows preview; pointer-up commits the shape
- **Eraser:** Sets `globalCompositeOperation = 'destination-out'` to remove pixels

**Canvas management (`useSketchCanvasRig`):**

- 28 canvases total (14 body parts × 2 sides), each 400×400 pixels
- 40-step undo stack per canvas; global undo tracks cross-canvas history
- `saveToSession()` persists all non-blank canvases to `sessionStorage` after every stroke
- `mirrorCopyCanvas()` initialises back-side canvases from front on first switch (with L/R flip)
- `exportAll()` returns `{ front: {...}, back: {...} }` keyed by body part, WebP format

**Save flow:**

1. `exportAll()` generates WebP data URLs for all 28 canvases
2. If arms-down layout was active, arm/hand canvases are rotated back to T-pose (90°/−90°) before saving, so the animation pipeline always receives consistently-oriented images
3. `POST /api/storage/upload` uploads the full set to `svgs/{userId}/{setName}/`

**State:**

- `side` — 'front' | 'back'
- `armPose` — 'up' | 'down' (desktop only; mobile always uses 'down')
- `viewMode` — 'body' | 'single'
- `tool`, `brushSize`, `color`, `isEraser` — active drawing settings
- `usedColors` — recent color history (up to 12)
- `saveStatus` — 'idle' | 'saving' | 'saved' | 'error'
- `sideAnimating` — triggers `side-flip` CSS animation on the body icon when toggling front/back

**Supabase integration:**

- Writes to `svgs` bucket via `POST /api/storage/upload`
- Requires authenticated session; upload uses admin client

---

### Extract (`/extract`)

**Purpose:** Capture human pose landmark data from a video source.

**Scope:** Takes a webcam stream or uploaded video file, runs MediaPipe Pose Landmarker on every frame, and saves the resulting landmark sequence to Supabase for use in Console.

**User flow:**

1. Choose a source: Live (webcam) or Browse (upload video file)
2. Detection runs automatically once video is ready
3. Preview the skeleton overlay live during capture; replay after capture completes
4. Save the frame sequence to Supabase

**Detection pipeline:**

```
Video source → MediaPipe detectForVideo() → LandmarkFrame[]
             → smoothLandmarkFrames()      (One-Euro filter, noise removal)
             → filterAndInterpolateFrames() (remove bad frames, fill gaps)
             → interpolateLowConfidenceLandmarks() (per-landmark hole filling)
             → applyFrameInterval()        (optional downsampling)
             → stored in useLandmarksStore
```

**MediaPipe integration:**

- Model: Pose Landmarker Lite, float16, GPU delegate — loaded from MediaPipe CDN
- Loaded as a module-level singleton (`sharedLandmarker`) — persists across page navigations, so re-opening Extract doesn't reload the model
- Mode: `VIDEO` (optimized for streaming); outputs 33 normalized keypoints per frame
- Detection loop: `requestAnimationFrame` at 30 fps, calling `landmarker.detectForVideo(video, timestamp)`
- Stops automatically after 9000 frames (~5 minutes at 30 fps)

**Live source (webcam):**

- `navigator.mediaDevices.getUserMedia({ video: true })`
- Tracks permission state: 'prompt' | 'granted' | 'denied' | 'unknown'
- Falls back gracefully if permission is denied

**Browse source (video upload):**

- User selects a video file; a blob URL is assigned to an `HTMLVideoElement`
- Detection starts once `video.readyState >= 2` (has current data)

**Visualization:**

- `PoseCanvas` renders a live skeleton overlay (colored landmark dots + connecting lines) over the video during detection
- After capture, the stored frames can be replayed as an animated skeleton

**Save flow:**

1. Frames optionally downsampled by `jitterInterval`
2. `POST /api/storage/landmarks` with `{ name, frames, dimensions }`
3. Stored at `landmarks/{userId}/{name}.json`

**State:**

- `source` — 'live' | 'browse'
- `uploadStatus` — 'idle' | 'uploading' | 'done' | 'error'
- `cameraPermission` — webcam permission state
- `jitterInterval` — frame downsampling factor (default 1 = no downsampling)
- `frames` / `currentFrame` / `dimensions` — from `useLandmarksStore`

**Supabase integration:**

- Writes to `landmarks` bucket via `POST /api/storage/landmarks`
- Requires authenticated session

---

### Console (`/console`)

**Purpose:** Preview and adjust animations combining landmark captures with SVG sketch sets.

**Scope:** The playback and tuning interface. Loads a landmark file and an SVG set, renders them combined at 30 fps, and provides per-joint position and scale controls. Can also save a final combined animation.

**User flow:**

1. Select a landmark archive from the Archives dropdown (Activity tab)
2. Select an SVG sketch set from the Archives dropdown (Creations tab)
3. Preview the animation playing back in real time
4. Use Shift and Scale controls to adjust part positioning and sizing
5. Optionally save the combined animation

**Animation pipeline:**

```
LandmarkFrame[]          — loaded from Supabase
→ scaleLandmarks()       — rescale keypoints to canvas size
→ applyShiftsToFrame()   — apply per-joint shift adjustments
→ setAnchors()           — compute 2D anchor positions (quads, segments, head)
→ draw*Svg()             — render each body part SVG via affine transform
→ Canvas 2D              — composited frame output
```

This pipeline runs per frame at 30 fps inside `AnimationCanvas`.

**File management:**

- `FileList` component loads from `/api/storage/list?bucket=...`
- Two views in the Archives dropdown:
  - **Activity** (brain icon): landmark files from `landmarks` bucket
  - **Creations** (person icon): SVG sketch sets from `svgs` bucket
- Files can be deleted in-panel via `DELETE /api/storage/files`

**Loading files:**

- Landmark file: `GET /api/storage/landmarks?key=...` returns `{ frames, dimensions }`
- SVG set: `GET /api/storage/upload?key=...` returns `{ images: { "partName-side": dataURL } }`
- SVGs are then cached as `HTMLImageElement` objects via `useCacheSvgs`

**Shift and Scale controls:**

- `ShiftControls`: 9 anchor points (torso, head, shoulder, elbow, wrist, hip, knee, ankle, foot), X/Y sliders (−10 to +10)
- `ScaleControls`: 5 groups (head, arm, hand, leg, foot), X/Y sliders (0–10)
- Updates go through Zustand stores (`useShiftFactorsStore`, `useScaleFactorsStore`)
- On pause: `AnimationCanvas` re-renders the current frame reactively when stores change
- On play: stores are read each frame for smooth real-time adjustment

**AnimationCanvas rendering:**

- Uses `TorsoDimensions` (EMA tracking of torso width/height) for normalizing body-part proportions across all frames
- Uses `EarDistance` (EMA tracking of ear separation) for head width sizing
- Fresh `TorsoDimensions` and `EarDistance` instances are created on each play start (avoids carry-over from previous sessions)
- `renderFrame()` dispatches to `renderPartSvg()` → per-part draw functions in `drawing-utils.ts`

**State:**

- `landmarkFile` / `svgFile` — selected file keys
- `frames` — loaded `LandmarkFrame[]`
- `svgParts` — `{ "partName-side": dataURL }` map
- `playing` — animation playback flag
- `toolsPanel` — 'shift' | 'scale' | null
- `fileView` — 'activity' | 'creations'
- `previewBgColor`, `previewScale` — render settings

**Supabase integration:**

- Reads from `landmarks` and `svgs` buckets via API routes
- Writes (save animation) to `user_data` bucket
- Deletes via `DELETE /api/storage/files`

---

## In-App Docs Page (`/docs`)

Static documentation page listing features and implementation notes for each major area of the app. Organized by section: Sketch, Extract, Console, Toolbar, Auth/Storage, and Tech Stack.
