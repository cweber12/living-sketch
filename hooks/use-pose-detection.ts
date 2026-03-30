// TensorFlow.js pose detection lifecycle hook
// TODO: Migrate from drawing-app/hooks/usePoseDetection.js
//
// Responsibilities:
// - Load MoveNet model (SINGLEPOSE_LIGHTNING)
// - Run detection loop via requestAnimationFrame at ~30 FPS
// - Scale video landmarks to canvas coordinates
// - Cache frames for replay mode
// - On stop: smooth + estimate feet + update store
//
// Next.js note: This is a client-only hook ('use client').
// TensorFlow.js must be dynamically imported to avoid SSR issues.

export {};
