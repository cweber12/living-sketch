'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { PoseCanvas } from '@/components/canvas/pose-canvas';
import { usePoseDetection } from '@/hooks/use-pose-detection';
import { useLandmarksStore } from '@/lib/stores/landmarks-store';
import {
  Toolbar,
  ToolbarDropdown,
  SegmentedControl,
  type ToolbarMode,
} from '@/components/ui/toolbar';
import type { LandmarkFrame } from '@/lib/types';
import { smoothLandmarkFrames } from '@/lib/utils/landmark-smoother';
import {
  filterAndInterpolateFrames,
  applyFrameInterval,
} from '@/lib/utils/frame-filter';

const PREVIEW_FRAME_MS = 1000 / 30;

type Source = 'webcam' | 'upload';

export default function CapturePage() {
  /* ── State ──────────────────────────────────────────────────────── */
  const [source, setSource] = useState<Source>('upload');
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'done' | 'error'
  >('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraPermission, setCameraPermission] = useState<
    'prompt' | 'granted' | 'denied' | 'unknown'
  >('unknown');
  const [webcamReady, setWebcamReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFileName, setVideoFileName] = useState('');
  const [videoDims, setVideoDims] = useState({ w: 0, h: 0 });
  const [previewLandmarks, setPreviewLandmarks] =
    useState<LandmarkFrame | null>(null);
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>('side');
  const [jitterInterval, setJitterInterval] = useState(1);
  const [activeJitterInterval, setActiveJitterInterval] = useState(1);
  const [toolbarOpenId, setToolbarOpenId] = useState<string | null>('source');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const previewRafRef = useRef<number>(0);
  const previewIdxRef = useRef(0);
  const previewLastTimeRef = useRef(0);

  const { isLoading, isModelReady, isDetecting, frameCount, start, stop } =
    usePoseDetection();
  const { frames, currentFrame, dimensions } = useLandmarksStore();

  /* ── Webcam lifecycle ───────────────────────────────────────────── */
  const stopWebcam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setWebcamReady(false);
  }, []);

  const startWebcam = useCallback(async () => {
    stopWebcam();
    setErrorMsg('');

    // Check camera permission state if API is available
    try {
      if (navigator.permissions) {
        const status = await navigator.permissions.query({
          name: 'camera' as PermissionName,
        });
        setCameraPermission(status.state as 'prompt' | 'granted' | 'denied');
        if (status.state === 'denied') {
          setErrorMsg(
            'Camera access is blocked. Please allow camera access in your browser settings and reload the page.',
          );
          return;
        }
      }
    } catch {
      // permissions API not supported — proceed with getUserMedia
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      setCameraPermission('granted');
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setWebcamReady(true);
        };
      }
    } catch {
      setCameraPermission('denied');
      setErrorMsg(
        'Camera access denied. Please allow camera access in your browser settings and reload the page.',
      );
    }
  }, [stopWebcam]);

  useEffect(() => {
    if (source === 'webcam') {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [source, startWebcam, stopWebcam]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  /* ── Track actual video dimensions ─────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const updateDims = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoDims({ w: video.videoWidth, h: video.videoHeight });
      }
    };
    video.addEventListener('loadedmetadata', updateDims);
    video.addEventListener('resize', updateDims);
    if (video.videoWidth > 0) updateDims();
    return () => {
      video.removeEventListener('loadedmetadata', updateDims);
      video.removeEventListener('resize', updateDims);
    };
  }, []); // once — video element DOM node is stable

  /* ── File upload ────────────────────────────────────────────────── */
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      setVideoFileName(file.name);
      const url = URL.createObjectURL(file);
      blobUrlRef.current = url;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.onloadedmetadata = () => {
          setVideoReady(true);
        };
      }
    },
    [],
  );

  /* ── Detection controls ─────────────────────────────────────────── */
  const handleStart = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;

    setErrorMsg('');

    // For uploaded video, play from current position
    if (source === 'upload') video.play();

    // Wait for video to be playing (with timeout)
    try {
      await Promise.race([
        new Promise<void>((resolve) => {
          if (!video.paused) return resolve();
          video.addEventListener('playing', () => resolve(), { once: true });
        }),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Video playback timed out')), 5000),
        ),
      ]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Playback failed');
      return;
    }

    await start(video);
  }, [source, start]);

  const handleStop = useCallback(() => {
    stop();
    if (source === 'upload') videoRef.current?.pause();
  }, [stop, source]);

  const handleNewCapture = useCallback(() => {
    cancelAnimationFrame(previewRafRef.current);
    useLandmarksStore.getState().reset();
    setUploadStatus('idle');
    setErrorMsg('');
  }, []);

  /* ── Upload landmarks to Supabase ───────────────────────────────── */
  const handleUpload = useCallback(async () => {
    if (frames.length === 0) return;
    setUploadStatus('uploading');
    setErrorMsg('');
    try {
      const name = `capture-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      const res = await fetch('/api/storage/landmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, frames, dimensions }),
      });
      const json = (await res.json()) as { error?: string; path?: string };
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      setUploadStatus('done');
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 4000);
    }
  }, [frames, dimensions]);

  /* ── Video ended event (stop detection automatically) ───────────── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnded = () => {
      if (isDetecting) handleStop();
    };
    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
  }, [isDetecting, handleStop]);

  /* ── Derived ────────────────────────────────────────────────────── */
  const captureComplete = frames.length > 0 && !isDetecting && !isLoading;

  // Auto-open status panel when detection starts
  useEffect(() => {
    if (isDetecting) setToolbarOpenId('status');
  }, [isDetecting]);

  // Smoothed, filtered frames for preview — computed once after capture completes
  const smoothedBaseFrames = useMemo(() => {
    if (!captureComplete || frames.length === 0) return frames;
    return smoothLandmarkFrames(filterAndInterpolateFrames(frames));
  }, [captureComplete, frames]);

  // Apply jitter reduction interval on top of smoothed frames
  const previewFrames = useMemo(
    () => applyFrameInterval(smoothedBaseFrames, activeJitterInterval),
    [smoothedBaseFrames, activeJitterInterval],
  );

  // Re-detection is allowed: remove !captureComplete guard so users can
  // run detection again on the same or a new video after a capture.
  const canStart =
    isModelReady &&
    !isDetecting &&
    (source === 'webcam' ? webcamReady : videoReady);
  const canUpload = captureComplete && uploadStatus !== 'uploading';

  const videoW = videoDims.w || dimensions.width || 640;
  const videoH = videoDims.h || dimensions.height || 480;

  /* ── Animated skeleton preview ──────────────────────────────────── */
  useEffect(() => {
    if (!captureComplete || previewFrames.length === 0) {
      cancelAnimationFrame(previewRafRef.current);
      setPreviewLandmarks(null);
      return;
    }
    previewIdxRef.current = 0;
    previewLastTimeRef.current = 0;
    setPreviewLandmarks(previewFrames[0]);
    function loop(ts: number) {
      if (ts - previewLastTimeRef.current >= PREVIEW_FRAME_MS) {
        previewLastTimeRef.current = ts;
        setPreviewLandmarks(previewFrames[previewIdxRef.current]);
        previewIdxRef.current =
          (previewIdxRef.current + 1) % previewFrames.length;
      }
      previewRafRef.current = requestAnimationFrame(loop);
    }
    previewRafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(previewRafRef.current);
  }, [captureComplete, previewFrames]);

  /* ── Toolbar content ─────────────────────────────────────────── */
  // Source icon: jumper-cable clamps with spark — bio-electric
  const iconSource = (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      {/* Left cable */}
      <path
        d="M1 7 L4.5 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Left clamp */}
      <rect
        x="4"
        y="5"
        width="2"
        height="4"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
      />
      {/* Right cable */}
      <path
        d="M13 7 L9.5 7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Right clamp */}
      <rect
        x="8"
        y="5"
        width="2"
        height="4"
        rx="0.5"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="none"
      />
      {/* Spark between clamps */}
      <path
        d="M6.5 5.5 L7.5 7 L6.5 8.5"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
  // Status icon: EEG / pulse monitor trace
  const iconStatus = (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 8 L3.5 8 L4.5 5 L6 10 L7 4 L8.5 8 L10 8 L11 6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
  // Jitter icon: test tube / vial (reduce noise = purify sample)
  const iconJitter = (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      {/* Tube body */}
      <path
        d="M5 1.5 L5 9.5 C5 11 5.6 12 7 12 C8.4 12 9 11 9 9.5 L9 1.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Cap */}
      <path
        d="M4 1.5 L10 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Liquid fill */}
      <path
        d="M5 9 C5 11 5.6 12 7 12 C8.4 12 9 11 9 9 L9 7.5 L5 7.5 Z"
        fill="currentColor"
        opacity="0.65"
      />
    </svg>
  );

  return (
    <main className="flex flex-col flex-1 w-full overflow-hidden">
      {/* ── Action bar ── */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 shrink-0"
        style={{
          borderBottom: '1px solid var(--border-strong)',
          backgroundColor: 'var(--surface)',
        }}
      >
        {isDetecting ? (
          <button
            onClick={handleStop}
            className="rounded py-1.5 px-3 text-xs uppercase tracking-widest font-bold"
            style={{ backgroundColor: 'var(--danger)', color: 'var(--bg)' }}
          >
            Stop
          </button>
        ) : (
          <div className="flex gap-1.5">
            <button
              onClick={async () => {
                if (captureComplete) handleNewCapture();
                await handleStart();
              }}
              disabled={!canStart}
              className={`btn-primary rounded py-1.5 px-3 text-xs uppercase tracking-widest font-bold disabled:opacity-50${canStart && !captureComplete ? ' glow-pulse' : ''}`}
            >
              {captureComplete ? 'Re-detect' : 'Start'}
            </button>
            {captureComplete && (
              <button
                onClick={handleNewCapture}
                className="btn-ghost rounded py-1.5 px-2.5 text-xs uppercase tracking-widest font-bold"
                title="Clear capture and start fresh"
              >
                ✕
              </button>
            )}
          </div>
        )}
        <div className="ml-auto">
          <button
            onClick={handleUpload}
            disabled={!canUpload}
            className={`btn-primary rounded py-1.5 px-4 text-xs uppercase tracking-widest font-bold disabled:opacity-50${captureComplete && uploadStatus === 'idle' ? ' glow-pulse' : ''}`}
            title="Upload captured landmarks"
          >
            {uploadStatus === 'uploading' && '…'}
            {uploadStatus === 'done' && '✓ Saved'}
            {uploadStatus === 'error' && 'Error'}
            {uploadStatus === 'idle' && '↑ Save'}
          </button>
        </div>
      </div>

      {/* ── Toolbar + main content ── */}
      <div
        className={`flex flex-1 overflow-hidden ${toolbarMode === 'side' ? 'flex-row' : 'flex-col'}`}
      >
        <Toolbar
          onModeChange={setToolbarMode}
          openId={toolbarOpenId}
          onOpenIdChange={setToolbarOpenId}
        >
          {/* Source */}
          <ToolbarDropdown id="source" label="Source" icon={iconSource}>
            <SegmentedControl
              options={['webcam', 'upload'] as Source[]}
              value={source}
              onChange={(v) => {
                if (isDetecting) handleStop();
                if (v === 'webcam') {
                  setVideoReady(false);
                  setVideoFileName('');
                } else {
                  setWebcamReady(false);
                }
                setSource(v);
              }}
            />
            {source === 'upload' && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isDetecting}
                  className="btn-ghost rounded py-1.5 text-xs uppercase tracking-widest font-semibold disabled:opacity-50 w-full text-left px-2 truncate"
                  title={videoFileName || 'Choose File'}
                >
                  {videoFileName || 'Choose File…'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </>
            )}
          </ToolbarDropdown>

          {/* Status */}
          <ToolbarDropdown id="status" label="Status" icon={iconStatus}>
            <div
              className="flex flex-col gap-1 text-[10px] uppercase tracking-widest"
              style={{ color: 'var(--fg-muted)' }}
            >
              <span>
                Frames:{' '}
                <strong style={{ color: 'var(--fg)' }}>{frameCount}</strong>
              </span>
              {isDetecting && (
                <span className="flex items-center gap-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full animate-pulse"
                    style={{ backgroundColor: 'var(--danger)' }}
                  />
                  Detecting
                </span>
              )}
              {captureComplete && (
                <span style={{ color: 'var(--accent)' }}>Capture complete</span>
              )}
              {errorMsg && (
                <span style={{ color: 'var(--danger)' }}>{errorMsg}</span>
              )}
            </div>
          </ToolbarDropdown>

          {/* Reduce Jitter (shown only after capture complete) */}
          {captureComplete && (
            <ToolbarDropdown id="jitter" label="Jitter" icon={iconJitter}>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={jitterInterval}
                onChange={(e) => setJitterInterval(Number(e.target.value))}
                onMouseUp={() => {
                  setActiveJitterInterval(jitterInterval);
                  previewIdxRef.current = 0;
                }}
                className="w-full accent-accent"
                title="Frame interval"
              />
              <span
                className="text-[10px]"
                style={{ color: 'var(--fg-muted)' }}
              >
                Interval: {jitterInterval}
              </span>
            </ToolbarDropdown>
          )}
        </Toolbar>

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* ── Model loading overlay ── */}
          {isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
              <div
                className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
                style={{
                  borderColor: 'var(--accent)',
                  borderTopColor: 'transparent',
                }}
              />
              <p
                className="font-display text-sm uppercase tracking-widest text-center"
                style={{ color: 'var(--accent)' }}
              >
                Reanimating neural pathways…
              </p>
              <p
                className="text-[10px] uppercase tracking-widest"
                style={{ color: 'var(--fg-muted)' }}
              >
                Charging the locomotion automaton
              </p>
            </div>
          )}

          {/* ── Video + pose overlay ── */}
          {!isLoading && !captureComplete && (
            <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-2 min-h-0 overflow-hidden">
              <div
                className="relative rounded-lg overflow-hidden"
                style={{
                  aspectRatio: `${videoW} / ${videoH}`,
                  maxWidth: '100%',
                  maxHeight: '100%',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                }}
              >
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  controls={source === 'upload' && !isDetecting}
                  className="w-full h-full object-fill"
                  style={{ display: 'block' }}
                />
                {currentFrame && (
                  <PoseCanvas
                    width={videoW}
                    height={videoH}
                    landmarks={currentFrame}
                  />
                )}

                {/* Empty state */}
                {!webcamReady && source === 'webcam' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
                    {cameraPermission === 'denied' ? (
                      <>
                        <p
                          className="text-sm uppercase tracking-widest text-center"
                          style={{ color: 'var(--danger)' }}
                        >
                          Camera access blocked
                        </p>
                        <p
                          className="text-xs tracking-wider text-center max-w-xs"
                          style={{ color: 'var(--fg-muted)' }}
                        >
                          Allow camera access in your browser settings, then
                          reload the page.
                        </p>
                      </>
                    ) : (
                      <p
                        className="text-sm uppercase tracking-widest"
                        style={{ color: 'var(--fg-muted)' }}
                      >
                        {cameraPermission === 'prompt'
                          ? 'Allow camera access to continue…'
                          : 'Starting camera…'}
                      </p>
                    )}
                  </div>
                )}
                {source === 'upload' && !videoReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p
                      className="text-sm uppercase tracking-widest"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      Upload a video to begin
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Skeleton preview (capture complete) ── */}
          {captureComplete && (
            <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-4 min-h-0 overflow-hidden">
              <div
                className="relative"
                style={{
                  aspectRatio: `${videoW} / ${videoH}`,
                  height: '100%',
                  maxWidth: '100%',
                }}
              >
                <PoseCanvas
                  width={videoW}
                  height={videoH}
                  landmarks={previewLandmarks}
                  className="w-full h-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
