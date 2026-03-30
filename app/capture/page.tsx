// Capture page – pose detection & animation
// Replaces drawing-app/app/capture.jsx
//
// TODO: Implement with:
// - View modes: live (webcam), replay (recorded), select-video (upload)
// - TensorFlow.js MoveNet integration via usePoseDetection
// - SvgCanvas + PoseCanvas rendering
// - CaptureOptionButtons, CaptureToolButtons
// - Export/import landmarks
//
// NOTE: TensorFlow.js and webcam access require 'use client'
// and dynamic imports to avoid SSR issues.

export default function CapturePage() {
  return (
    <main className="flex flex-1 flex-col items-center p-4">
      <h1 className="text-2xl font-semibold">Motion Capture</h1>
      {/* TODO: CaptureHeaderButtons, video/webcam, SvgCanvas, PoseCanvas */}
    </main>
  );
}
