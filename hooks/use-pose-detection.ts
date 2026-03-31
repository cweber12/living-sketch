'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useLandmarksStore } from '@/lib/stores/landmarks-store';
import type { LandmarkFrame, Keypoint } from '@/lib/types';

// ── Lazy-loaded MediaPipe types ─────────────────────────────────────────────
type PoseLandmarker = import('@mediapipe/tasks-vision').PoseLandmarker;

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm';
const MAX_FRAMES = 9000; // ~5 min at 30 fps

interface UsePoseDetectionOpts {
  /** Target detection FPS (default 30) */
  fps?: number;
}

interface UsePoseDetectionReturn {
  /** True while the model is loading */
  isLoading: boolean;
  /** True once the model has successfully loaded and is ready */
  isModelReady: boolean;
  /** True while detection loop is running */
  isDetecting: boolean;
  /** Number of frames collected so far */
  frameCount: number;
  /** Start detection on the given video element */
  start: (video: HTMLVideoElement) => Promise<void>;
  /** Stop detection and finalize frames */
  stop: () => void;
}

export function usePoseDetection(
  opts: UsePoseDetectionOpts = {},
): UsePoseDetectionReturn {
  const { fps = 30 } = opts;
  const minInterval = 1000 / fps;

  const [isLoading, setIsLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [frameCount, setFrameCount] = useState(0);

  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);
  const framesBuffer = useRef<LandmarkFrame[]>([]);

  const { setCurrentFrame, setDimensions } = useLandmarksStore();

  // ── Load model ────────────────────────────────────────────────────────────
  const loadModel = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;

    setIsLoading(true);
    const vision = await import('@mediapipe/tasks-vision');
    const { PoseLandmarker, FilesetResolver } = vision;

    const wasmFileset = await FilesetResolver.forVisionTasks(WASM_URL);

    const landmarker = await PoseLandmarker.createFromOptions(wasmFileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numPoses: 1,
    });

    landmarkerRef.current = landmarker;
    if (mountedRef.current) {
      setIsLoading(false);
      setIsModelReady(true);
    }
    return landmarker;
  }, []);

  // ── Convert MediaPipe result to our Keypoint format ──────────────────────
  const toFrame = useCallback(
    (
      landmarks: { x: number; y: number; z: number; visibility: number }[],
    ): LandmarkFrame => {
      const video = videoRef.current;
      const w = video?.videoWidth ?? 1;
      const h = video?.videoHeight ?? 1;
      return landmarks.map(
        (lm): Keypoint => ({
          x: lm.x * w,
          y: lm.y * h,
          z: lm.z,
          score: lm.visibility,
        }),
      );
    },
    [],
  );

  // ── Flush buffered frames to store ────────────────────────────────────────
  const flushFrames = useCallback(() => {
    const store = useLandmarksStore.getState();
    store.setFrames(framesBuffer.current);
  }, []);

  // ── Eagerly load model on mount so detection is instant when started ──────
  useEffect(() => {
    loadModel().catch((err) => console.error('Pose model load failed:', err));
  }, [loadModel]);

  // ── Detection loop ────────────────────────────────────────────────────────
  const detect = useCallback(() => {
    const landmarker = landmarkerRef.current;
    const video = videoRef.current;
    if (!landmarker || !video || video.paused || video.ended) return;

    const now = performance.now();
    if (now - lastTimeRef.current >= minInterval) {
      lastTimeRef.current = now;
      try {
        const result = landmarker.detectForVideo(video, now);
        if (result.landmarks && result.landmarks.length > 0) {
          const frame = toFrame(result.landmarks[0]);
          framesBuffer.current.push(frame);
          setCurrentFrame(frame);
          setFrameCount((c) => c + 1);

          if (framesBuffer.current.length >= MAX_FRAMES) {
            cancelAnimationFrame(rafRef.current);
            if (mountedRef.current) {
              setIsDetecting(false);
              setCurrentFrame(null);
              flushFrames();
            }
            return;
          }
        }
      } catch (err) {
        console.error('Pose detection error:', err);
        cancelAnimationFrame(rafRef.current);
        if (mountedRef.current) {
          setIsDetecting(false);
          setCurrentFrame(null);
          flushFrames();
        }
        return;
      }
    }

    rafRef.current = requestAnimationFrame(detect);
  }, [setCurrentFrame, minInterval, toFrame, flushFrames]);

  // ── Public API ────────────────────────────────────────────────────────────
  const start = useCallback(
    async (video: HTMLVideoElement) => {
      if (startingRef.current) return;
      startingRef.current = true;

      try {
        videoRef.current = video;
        setDimensions({ width: video.videoWidth, height: video.videoHeight });
        framesBuffer.current = [];
        setFrameCount(0);

        await loadModel();
        if (!mountedRef.current) return;

        lastTimeRef.current = 0;
        setIsDetecting(true);
        rafRef.current = requestAnimationFrame(detect);
      } finally {
        startingRef.current = false;
      }
    },
    [loadModel, detect, setDimensions],
  );

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setIsDetecting(false);
    setCurrentFrame(null);
    flushFrames();
  }, [setCurrentFrame, flushFrames]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
    };
  }, []);

  return { isLoading, isModelReady, isDetecting, frameCount, start, stop };
}
