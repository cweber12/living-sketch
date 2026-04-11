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
import { ToolbarSection } from '@/components/shared/toolbar/toolbar-section';
import { BrainIcon } from '@/components/shared/icons/brain';
import { CircularSawIcon } from '@/components/extract/icons/circular-saw';
import { PulseIcon } from '@/components/extract/icons/pulse';
import { FridgeOpenIcon } from '@/components/shared/icons/fridge';
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
  const handleReExtract = useCallback(() => {
    window.location.reload();
  }, []);
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
            {/* Phase: ready — Extract only, centered */}
            {extractPhase === 'ready' && (
              <div className="flex flex-1 items-stretch justify-center">
                <ToolbarSection
                  icon={<CircularSawIcon />}
                  label="Extract"
                  primary={canStart}
                  glow={canStart}
                  disabled={!canStart}
                  onClick={handleStart}
                  title="Start pose extraction"
                />
              </div>
            )}

            {/* Phase: detecting — Stop + inline Status */}
            {extractPhase === 'detecting' && (
              <>
                <ToolbarSection
                  icon={<span>■</span>}
                  label="Stop"
                  danger
                  onClick={handleStop}
                  title="Stop extraction"
                />
                <ToolbarSection
                  icon={<PulseIcon />}
                  label={`Status: ${frameCount}`}
                  active
                />
              </>
            )}

            {/* Phase: complete — Re-Extract + Save */}
            {extractPhase === 'complete' && (
              <ToolbarSection
                icon={<CircularSawIcon />}
                label="Re-Extract"
                onClick={handleReExtract}
                title="Reload and start a new extraction"
              />
            )}
          </PageToolbar>
        )}

        {/* ── Main content ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* ── Error banner ── */}
          {errorMsg && (
            <div className="bg-danger shrink-0 px-4 py-2 text-xs text-white">
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
                Charging the locomotion automaton
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
                    className="card-themed group focus-visible:ring-accent flex flex-col gap-4 rounded-xl p-6 text-left transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]"
                  >
                    <div>
                      <div className="text-accent flex flex-row items-center gap-2">
                        <BodyRunningIcon size={24} />
                        <p className="mb-1 text-xs font-bold tracking-[0.3em] uppercase">
                          Live
                        </p>
                      </div>
                      <h3 className="font-display text-foreground mb-2 text-lg font-bold uppercase">
                        Living Subject
                      </h3>
                      <p className="text-muted text-sm leading-relaxed">
                        Transmit motion directly from a living subject via
                        camera feed in real time.
                      </p>
                    </div>
                    <span className="text-accent mt-auto inline-flex items-center gap-1 text-xs font-semibold tracking-widest uppercase transition-transform group-hover:translate-x-1">
                      Begin Capture →
                    </span>
                  </button>

                  {/* Browse card */}
                  <button
                    onClick={() => {
                      setSource('browse');
                      setSourceSelected(true);
                      fileInputRef.current?.click();
                    }}
                    className="card-themed group focus-visible:ring-accent flex flex-col gap-4 rounded-xl p-6 text-left transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98]"
                  >
                    <div className="bg-accent-faint flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
                      <FridgeOpenIcon />
                    </div>
                    <div>
                      <p className="text-accent mb-1 text-xs font-bold tracking-[0.3em] uppercase">
                        Browse
                      </p>
                      <h3 className="font-display text-foreground mb-2 text-lg font-bold uppercase">
                        Motion Recording
                      </h3>
                      <p className="text-muted text-sm leading-relaxed">
                        Recover a kinetic sequence from a preserved video
                        recording.
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
