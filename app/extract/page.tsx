'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PoseCanvas } from '@/components/extract/canvas/pose-canvas';
import { usePoseDetection } from '@/hooks/use-pose-detection';
import { useLandmarksStore } from '@/lib/stores/landmarks-store';
import {
  ToolbarLayout,
  PageToolbar,
} from '@/components/shared/toolbar/toolbar-main';
import { DropdownPanel } from '@/components/shared/toolbar/dropdown-panel';
import { BrainIcon } from '@/components/shared/icons/brain';
import { CircularSawIcon } from '@/components/extract/icons/circular-saw';
import { PulseIcon } from '@/components/extract/icons/pulse';
import {
  FridgeOpenIcon,
  FridgeClosedIcon,
} from '@/components/shared/icons/fridge';
import { RecordIcon } from '@/components/extract/icons/record';
import { BodyRunningIcon } from '@/components/shared/icons/body';
import type { LandmarkFrame, Dimensions } from '@/lib/types';
import { smoothLandmarkFrames } from '@/lib/utils/landmark-smoother';
import { filterAndInterpolateFrames } from '@/lib/utils/frame-filter';
import {
  computeSubjectCrop,
  transformFramesToCrop,
  cropToDimensions,
} from '@/lib/utils/frame-crop';

const PREVIEW_FRAME_MS = 1000 / 30;

type Source = 'live' | 'browse';
type ExtractPhase = 'source-select' | 'ready' | 'detecting' | 'complete';

export default function ExtractPage() {
  const router = useRouter();

  const [source, setSource] = useState<Source>('browse');
  const [sourceSelected, setSourceSelected] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'done' | 'error'
  >('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [cameraPermission, setCameraPermission] = useState<
    'prompt' | 'granted' | 'denied' | 'unknown'
  >('unknown');
  const [webcamReady, setWebcamReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [, setVideoFileName] = useState('');
  const [videoDims, setVideoDims] = useState({ w: 0, h: 0 });
  const [previewLandmarks, setPreviewLandmarks] =
    useState<LandmarkFrame | null>(null);
  const [reExtractDropdownOpen, setReExtractDropdownOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const reExtractBtnRef = useRef<HTMLButtonElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const previewRafRef = useRef<number>(0);
  const previewIdxRef = useRef(0);
  const previewLastTimeRef = useRef(0);

  const { isLoading, isModelReady, isDetecting, frameCount, start, stop } =
    usePoseDetection();
  const { frames, currentFrame, dimensions } = useLandmarksStore();

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
        video: { facingMode: 'user' },
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
    if (source === 'live' && sourceSelected) {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [source, sourceSelected, startWebcam, stopWebcam]);

  // Cleanup blob URLs and extract state on unmount
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      useLandmarksStore.getState().reset();
      cancelAnimationFrame(previewRafRef.current);
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
      // Clear any previous capture when a new file is chosen
      cancelAnimationFrame(previewRafRef.current);
      useLandmarksStore.getState().reset();
      setUploadStatus('idle');
      setErrorMsg('');
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

    // For uploaded video: seek to start before playing so re-extraction works
    if (source === 'browse') {
      video.currentTime = 0;
      try {
        await video.play();
      } catch {
        // play() rejection (e.g. AbortError on rapid clicks) is handled below
      }
    }

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
    if (source === 'browse') videoRef.current?.pause();
  }, [stop, source]);

  /* ── Derived (needed by upload handler) ─────────────────────────── */
  const videoW = videoDims.w || dimensions.width || 640;
  const videoH = videoDims.h || dimensions.height || 480;

  const captureComplete = frames.length > 0 && !isDetecting && !isLoading;

  // Subject crop — computed once after capture completes
  const cropData = useMemo(() => {
    if (!captureComplete || frames.length === 0) return null;
    const frameDims: Dimensions = { width: videoW, height: videoH };
    const crop = computeSubjectCrop(frames, frameDims);
    return {
      croppedFrames: transformFramesToCrop(frames, crop),
      cropDimensions: cropToDimensions(crop),
    };
  }, [captureComplete, frames, videoW, videoH]);

  const croppedFrames = useMemo(
    () => cropData?.croppedFrames ?? [],
    [cropData],
  );
  const cropDimensions: Dimensions = useMemo(
    () => cropData?.cropDimensions ?? { width: videoW, height: videoH },
    [cropData, videoW, videoH],
  );

  /* ── Upload landmarks to Supabase ───────────────────────────────── */
  const handleUpload = useCallback(async () => {
    if (croppedFrames.length === 0) return;
    setUploadStatus('uploading');
    setErrorMsg('');
    try {
      const name = `extract-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      const res = await fetch('/api/storage/landmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          frames: croppedFrames,
          dimensions: cropDimensions,
        }),
      });
      const json = (await res.json()) as { error?: string; path?: string };
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      setUploadStatus('done');
      router.push('/console');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 4000);
    }
  }, [croppedFrames, cropDimensions, router]);
  const handleReExtractNewSource = useCallback(() => {
    setReExtractDropdownOpen(false);
    useLandmarksStore.getState().reset();
    window.location.reload();
  }, []);

  const handleReExtractSameSource = useCallback(() => {
    setReExtractDropdownOpen(false);
    useLandmarksStore.getState().reset();
    setUploadStatus('idle');
    setErrorMsg('');
    cancelAnimationFrame(previewRafRef.current);
    setPreviewLandmarks(null);
    if (source === 'browse' && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
    }
  }, [source]);
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

  /* ── Other derived ──────────────────────────────────────────────── */
  // Phase-based toolbar state machine
  const extractPhase: ExtractPhase = !sourceSelected
    ? 'source-select'
    : isDetecting
      ? 'detecting'
      : captureComplete
        ? 'complete'
        : 'ready';

  // Toolbar renders only once media source is ready OR during/after detection
  const showToolbar =
    webcamReady || videoReady || isDetecting || captureComplete;

  // Smoothed, filtered frames for preview — computed once after capture completes
  const smoothedBaseFrames = useMemo(() => {
    if (!captureComplete || croppedFrames.length === 0) return croppedFrames;
    return smoothLandmarkFrames(filterAndInterpolateFrames(croppedFrames));
  }, [captureComplete, croppedFrames]);

  // Re-detection is allowed: remove !captureComplete guard so users can
  // run detection again on the same or a new video after a capture.
  const canStart =
    isModelReady &&
    !isDetecting &&
    (source === 'live' ? webcamReady : videoReady);
  const canUpload =
    captureComplete &&
    croppedFrames.length > 0 &&
    uploadStatus !== 'uploading' &&
    uploadStatus !== 'done';

  /* ── Animated skeleton preview ──────────────────────────────────── */
  useEffect(() => {
    if (!captureComplete || smoothedBaseFrames.length === 0) {
      cancelAnimationFrame(previewRafRef.current);
      setPreviewLandmarks(null);
      return;
    }
    previewIdxRef.current = 0;
    previewLastTimeRef.current = 0;
    setPreviewLandmarks(smoothedBaseFrames[0]);
    function loop(ts: number) {
      if (ts - previewLastTimeRef.current >= PREVIEW_FRAME_MS) {
        previewLastTimeRef.current = ts;
        setPreviewLandmarks(smoothedBaseFrames[previewIdxRef.current]);
        previewIdxRef.current =
          (previewIdxRef.current + 1) % smoothedBaseFrames.length;
      }
      previewRafRef.current = requestAnimationFrame(loop);
    }
    previewRafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(previewRafRef.current);
  }, [captureComplete, smoothedBaseFrames]);

  return (
    <main className="flex w-full flex-1 overflow-hidden">
      {/*
       * disableAutoCollapse: touch-scroll should not collapse the toolbar here.
       * noToolbar: no bottom padding when toolbar is hidden (source-select phase).
       */}
      <ToolbarLayout disableAutoCollapse noToolbar={!showToolbar}>
        {/* ── Phase-based toolbar ── */}
        {showToolbar && (
          <PageToolbar
            onSave={extractPhase === 'complete' ? handleUpload : undefined}
            saveStatus={
              uploadStatus === 'uploading'
                ? 'saving'
                : uploadStatus === 'done'
                  ? 'saved'
                  : uploadStatus === 'error'
                    ? 'error'
                    : 'idle'
            }
            saveDisabled={!canUpload}
          >
            {/* Compact centered action buttons */}
            <div className="flex flex-1 items-center justify-center gap-3 px-4">
              {/* Phase: ready */}
              {extractPhase === 'ready' && (
                <button
                  onClick={handleStart}
                  disabled={!canStart}
                  className="btn-primary flex h-8 items-center gap-1.5 rounded px-4 text-xs font-bold tracking-widest uppercase"
                  title="Start pose extraction"
                >
                  <CircularSawIcon />
                  Extract
                </button>
              )}

              {/* Phase: detecting */}
              {extractPhase === 'detecting' && (
                <>
                  <button
                    onClick={handleStop}
                    className="flex h-8 items-center gap-1.5 rounded px-4 text-xs font-bold tracking-widest uppercase"
                    style={{
                      backgroundColor: 'var(--danger)',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 0 10px rgba(180,0,0,0.25)',
                    }}
                    title="Stop extraction"
                  >
                    <span aria-hidden="true">■</span>
                    Stop
                  </button>
                  <span
                    className="flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase"
                    style={{ color: 'var(--fg-muted)' }}
                    aria-live="polite"
                  >
                    <PulseIcon />
                    {frameCount} frames
                  </span>
                </>
              )}

              {/* Phase: complete — Re-Extract dropdown + Save */}
              {extractPhase === 'complete' && (
                <>
                  <button
                    ref={reExtractBtnRef}
                    onClick={() => setReExtractDropdownOpen((v) => !v)}
                    className="btn-ghost flex h-8 items-center gap-1.5 rounded px-4 text-xs font-bold tracking-widest uppercase"
                    aria-haspopup="true"
                    aria-expanded={reExtractDropdownOpen}
                    title="Re-extract options"
                  >
                    <CircularSawIcon />
                    Re-Extract
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 10 10"
                      fill="none"
                      aria-hidden="true"
                      style={{
                        transform: reExtractDropdownOpen
                          ? 'rotate(180deg)'
                          : 'none',
                        transition: 'transform 150ms ease',
                      }}
                    >
                      <path
                        d="M2 3.5L5 6.5L8 3.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <DropdownPanel
                    anchorRef={reExtractBtnRef}
                    open={reExtractDropdownOpen}
                    onClose={() => setReExtractDropdownOpen(false)}
                    width={180}
                  >
                    <div className="flex flex-col py-1">
                      <button
                        onClick={handleReExtractNewSource}
                        className="hover:bg-surface-hover w-full px-4 py-2.5 text-left text-xs font-semibold tracking-wide uppercase"
                        style={{
                          color: 'var(--fg)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'background-color 100ms ease',
                        }}
                      >
                        New Source
                      </button>
                      <button
                        onClick={handleReExtractSameSource}
                        className="hover:bg-surface-hover w-full px-4 py-2.5 text-left text-xs font-semibold tracking-wide uppercase"
                        style={{
                          color: 'var(--fg)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'background-color 100ms ease',
                        }}
                      >
                        Same Source
                      </button>
                    </div>
                  </DropdownPanel>
                  <button
                    onClick={handleUpload}
                    disabled={!canUpload}
                    className="btn-primary flex h-8 items-center gap-1.5 rounded px-4 text-xs font-bold tracking-widest uppercase"
                    title={
                      uploadStatus === 'done'
                        ? 'Motion saved'
                        : uploadStatus === 'uploading'
                          ? 'Saving…'
                          : 'Save extracted motion'
                    }
                  >
                    <FridgeClosedIcon size="14px" />
                    {uploadStatus === 'uploading'
                      ? 'Saving…'
                      : uploadStatus === 'done'
                        ? 'Saved!'
                        : 'Save'}
                  </button>
                </>
              )}
            </div>
          </PageToolbar>
        )}

        {/* ── Main content ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* ── Error banner ── */}
          {errorMsg && (
            <div className="alert-danger mx-4 mt-3 shrink-0 px-4 py-2.5 text-xs">
              {errorMsg}
            </div>
          )}

          {/* ── Model loading overlay ── */}
          {isLoading && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6">
              <div className="border-accent h-10 w-10 animate-spin rounded-full border-2 border-t-transparent" />
              <p className="font-display text-accent text-center text-sm tracking-widest uppercase">
                Reanimating neural pathways…
              </p>
              <p className="text-3xs text-muted tracking-widest uppercase">
                Loading pose detection model
              </p>
            </div>
          )}

          {/* ── Source cards (initial state: no source selected) ── */}
          {!isLoading && !sourceSelected && !captureComplete && (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-8">
              <div className="flex w-full max-w-2xl flex-col items-center gap-8">
                {/* Header */}
                <div className="text-accent mb-2 flex flex-row items-center justify-center gap-2">
                  <BrainIcon size={24} />
                  <p className="text-xs font-bold tracking-[0.35em] uppercase">
                    Select a source.
                  </p>
                </div>
                {/* Cards */}
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Live card */}
                  <button
                    onClick={() => {
                      setSource('live');
                      setSourceSelected(true);
                    }}
                    className="card-themed group focus-visible:ring-accent flex flex-col gap-4 rounded-xl p-6 text-left focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]"
                  >
                    <div>
                      <div className="text-accent mb-2 flex flex-row items-center gap-2">
                        <RecordIcon />
                        <h3 className="font-display text-foreground mb-0 text-lg font-bold uppercase">
                          Live
                        </h3>
                      </div>
                      <p className="text-muted text-sm leading-relaxed">
                        Use your webcam to capture live movement.
                      </p>
                    </div>
                    <span className="text-accent mt-auto inline-flex items-center gap-1 text-xs font-semibold tracking-widest uppercase transition-transform group-hover:translate-x-1">
                      Start Capture →
                    </span>
                  </button>

                  {/* Browse card */}
                  <button
                    onClick={() => {
                      setSource('browse');
                      setSourceSelected(true);
                      fileInputRef.current?.click();
                    }}
                    className="card-themed group focus-visible:ring-accent flex flex-col gap-4 rounded-xl p-6 text-left focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]"
                  >
                    <div>
                      <div className="text-accent flex flex-row items-center gap-2">
                        <FridgeOpenIcon size={'24px'} />
                        <h3 className="font-display text-foreground mb-2 text-lg font-bold uppercase">
                          Browse Saved
                        </h3>
                      </div>
                      <p className="text-muted text-sm leading-relaxed">
                        Upload a saved video file to extract motion.
                      </p>
                    </div>
                    <span className="text-accent mt-auto inline-flex items-center gap-1 text-xs font-semibold tracking-widest uppercase transition-transform group-hover:translate-x-1">
                      Select Recording →
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hidden file input — available at all times for source cards */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/*
           * ── Video + pose overlay ──
           * flex-1 + absolute positioning fills available space between navbar
           * and toolbar without overflowing or causing page scroll on iOS.
           * object-contain on the video preserves aspect ratio with letterboxing.
           * PoseCanvas covers the same container; both scale from videoW×videoH
           * coordinates to CSS container size uniformly, keeping overlay aligned.
           */}
          {!isLoading && sourceSelected && !captureComplete && (
            <div className="bg-surface relative min-h-0 flex-1 overflow-hidden">
              <video
                ref={videoRef}
                playsInline
                muted
                controls={source === 'browse' && !isDetecting}
                className="absolute inset-0 block h-full w-full object-contain"
              />
              {currentFrame && (
                <PoseCanvas
                  sourceWidth={videoW}
                  sourceHeight={videoH}
                  landmarks={currentFrame}
                  className="pointer-events-none absolute inset-0 h-full w-full"
                />
              )}

              {/* Empty state: camera not yet ready */}
              {!webcamReady && source === 'live' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
                  {cameraPermission === 'denied' ? (
                    <>
                      <p className="text-danger text-center text-sm tracking-widest uppercase">
                        Camera access blocked
                      </p>
                      <p className="text-muted max-w-xs text-center text-xs tracking-wider">
                        Allow camera access in your browser settings, then
                        reload the page.
                      </p>
                    </>
                  ) : (
                    <p className="text-muted text-sm tracking-widest uppercase">
                      {cameraPermission === 'prompt'
                        ? 'Allow camera access to continue…'
                        : 'Starting camera…'}
                    </p>
                  )}
                </div>
              )}

              {/* Empty state: no video file selected */}
              {source === 'browse' && !videoReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-muted text-sm tracking-widest uppercase">
                    Browse to select a video
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Skeleton preview (capture complete) ── */}
          {captureComplete && (
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <PoseCanvas
                sourceWidth={cropDimensions.width}
                sourceHeight={cropDimensions.height}
                landmarks={previewLandmarks}
                className="absolute inset-0 h-full w-full"
              />
            </div>
          )}
        </div>
      </ToolbarLayout>
    </main>
  );
}
