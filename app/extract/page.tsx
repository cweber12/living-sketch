'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PoseCanvas } from '@/components/extract/canvas/pose-canvas';
import { usePoseDetection } from '@/hooks/use-pose-detection';
import { useLandmarksStore } from '@/lib/stores/landmarks-store';
import {
  ToolbarLayout,
  PageToolbar,
  ToolbarSection,
} from '@/components/shared/ui/toolbar';
import { BrainIcon } from '@/components/shared/icons/brain';
import { CircularSawIcon } from '@/components/extract/icons/circular-saw';
import { PulseIcon } from '@/components/extract/icons/pulse';
import { FridgeIcon, FridgeOpenIcon } from '@/components/shared/icons/fridge';
import { BodyRunningIcon } from '@/components/shared/icons/body';
import type { LandmarkFrame } from '@/lib/types';
import { smoothLandmarkFrames } from '@/lib/utils/landmark-smoother';
import { filterAndInterpolateFrames } from '@/lib/utils/frame-filter';

const PREVIEW_FRAME_MS = 1000 / 30;

type Source = 'live' | 'browse';
type ExtractPhase = 'source-select' | 'ready' | 'detecting' | 'complete';

export default function ExtractPage() {
  /* â”€â”€ Router for post-save navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const router = useRouter();

  /* â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

  /* â”€â”€ Webcam lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
      // permissions API not supported â€” proceed with getUserMedia
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

  /* â”€â”€ Track actual video dimensions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
  }, []); // once â€” video element DOM node is stable

  /* â”€â”€ File upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

  /* â”€â”€ Detection controls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

  /* â”€â”€ Upload landmarks to Supabase â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const handleUpload = useCallback(async () => {
    if (frames.length === 0) return;
    setUploadStatus('uploading');
    setErrorMsg('');
    try {
      const name = `extract-${new Date().toISOString().replace(/[:.]/g, '-')}`;
      const res = await fetch('/api/storage/landmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, frames, dimensions }),
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
  }, [frames, dimensions, router]);
  const handleReExtract = useCallback(() => {
    window.location.reload();
  }, []);
  /* â”€â”€ Video ended event (stop detection automatically) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnded = () => {
      if (isDetecting) handleStop();
    };
    video.addEventListener('ended', onEnded);
    return () => video.removeEventListener('ended', onEnded);
  }, [isDetecting, handleStop]);

  /* â”€â”€ Derived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
  const captureComplete = frames.length > 0 && !isDetecting && !isLoading;

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

  // Smoothed, filtered frames for preview â€” computed once after capture completes
  const smoothedBaseFrames = useMemo(() => {
    if (!captureComplete || frames.length === 0) return frames;
    return smoothLandmarkFrames(filterAndInterpolateFrames(frames));
  }, [captureComplete, frames]);

  // Re-detection is allowed: remove !captureComplete guard so users can
  // run detection again on the same or a new video after a capture.
  const canStart =
    isModelReady &&
    !isDetecting &&
    (source === 'live' ? webcamReady : videoReady);
  const canUpload =
    captureComplete && uploadStatus !== 'uploading' && uploadStatus !== 'done';

  const videoW = videoDims.w || dimensions.width || 640;
  const videoH = videoDims.h || dimensions.height || 480;

  /* â”€â”€ Animated skeleton preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
    <main className="flex flex-1 w-full overflow-hidden">
      {/*
       * disableAutoCollapse: touch-scroll should not collapse the toolbar here.
       * noToolbar: no bottom padding when toolbar is hidden (source-select phase).
       */}
      <ToolbarLayout disableAutoCollapse noToolbar={!showToolbar}>
        {/* â”€â”€ Phase-based toolbar â”€â”€ */}
        {showToolbar && (
          <PageToolbar>
            {/* Phase: ready â€” Extract only, centered */}
            {extractPhase === 'ready' && (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'stretch',
                }}
              >
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

            {/* Phase: detecting â€” Stop + inline Status */}
            {extractPhase === 'detecting' && (
              <>
                <ToolbarSection
                  icon={<span>â– </span>}
                  label="Stop"
                  danger
                  onClick={handleStop}
                  title="Stop extraction"
                />
                <ToolbarSection
                  icon={<PulseIcon />}
                  label="Status"
                  active
                  inlineContent={
                    <span
                      className="flex items-center gap-1 text-[10px] uppercase tracking-widest"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: 'var(--danger)' }}
                      />
                      {frameCount}
                    </span>
                  }
                />
              </>
            )}

            {/* Phase: complete â€” Re-Extract + Save */}
            {extractPhase === 'complete' && (
              <>
                <ToolbarSection
                  icon={<CircularSawIcon />}
                  label="Re-Extract"
                  onClick={handleReExtract}
                  title="Reload and start a new extraction"
                />
                <ToolbarSection
                  icon={<FridgeIcon />}
                  label={
                    uploadStatus === 'uploading'
                      ? 'â€¦'
                      : uploadStatus === 'done'
                        ? 'Saved'
                        : uploadStatus === 'error'
                          ? 'Error'
                          : 'Save'
                  }
                  primary={uploadStatus === 'idle'}
                  glow={uploadStatus === 'idle'}
                  disabled={!canUpload}
                  onClick={handleUpload}
                  title="Save landmarks and go to Re-Animate"
                />
              </>
            )}
          </PageToolbar>
        )}

        {/* â”€â”€ Main content â”€â”€ */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* â”€â”€ Error banner â”€â”€ */}
          {errorMsg && (
            <div
              className="shrink-0 px-4 py-2 text-xs"
              style={{ backgroundColor: 'var(--danger)', color: '#fff' }}
            >
              {errorMsg}
            </div>
          )}

          {/* â”€â”€ Model loading overlay â”€â”€ */}
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
                Reanimating neural pathwaysâ€¦
              </p>
              <p
                className="text-[10px] uppercase tracking-widest"
                style={{ color: 'var(--fg-muted)' }}
              >
                Charging the locomotion automaton
              </p>
            </div>
          )}

          {/* â”€â”€ Source cards (initial state: no source selected) â”€â”€ */}
          {!isLoading && !sourceSelected && !captureComplete && (
            <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
              <div className="flex flex-col items-center gap-8 max-w-2xl w-full">
                {/* Header */}
                <div className="text-center" style={{ color: 'var(--accent)' }}>
                  <div className="flex flex-row items-center justify-center mb-2 gap-2">
                    <BrainIcon size={24} />
                    <p className="text-xs font-bold tracking-[0.35em] uppercase">
                      The Extraction Chamber
                    </p>
                  </div>
                  <p
                    className="text-sm leading-relaxed max-w-sm"
                    style={{ color: 'var(--fg-muted)' }}
                  >
                    Select a source to extract motor functions.
                  </p>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  {/* Live card */}
                  <button
                    onClick={() => {
                      setSource('live');
                      setSourceSelected(true);
                    }}
                    className="card-themed rounded-xl p-6 flex flex-col gap-4 group text-left transition-all hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div>
                      <div
                        className="flex flex-row items-center gap-2"
                        style={{ color: 'var(--accent)' }}
                      >
                        <BodyRunningIcon size={24} />
                        <p className="text-xs font-bold tracking-[0.3em] uppercase mb-1">
                          Live
                        </p>
                      </div>
                      <h3
                        className="font-display font-bold uppercase text-lg mb-2"
                        style={{ color: 'var(--fg)' }}
                      >
                        Living Subject
                      </h3>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: 'var(--fg-muted)' }}
                      >
                        Transmit motion directly from a living subject via
                        camera feed in real time.
                      </p>
                    </div>
                    <span
                      className="mt-auto text-xs font-semibold tracking-widest uppercase inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                      style={{ color: 'var(--accent)' }}
                    >
                      Begin Capture â†’
                    </span>
                  </button>

                  {/* Browse card */}
                  <button
                    onClick={() => {
                      setSource('browse');
                      setSourceSelected(true);
                      fileInputRef.current?.click();
                    }}
                    className="card-themed rounded-xl p-6 flex flex-col gap-4 group text-left transition-all hover:brightness-110 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div
                      className="w-12 h-12 flex items-center justify-center rounded-lg shrink-0"
                      style={{ backgroundColor: 'var(--accent-faint)' }}
                    >
                      <FridgeOpenIcon />
                    </div>
                    <div>
                      <p
                        className="text-xs font-bold tracking-[0.3em] uppercase mb-1"
                        style={{ color: 'var(--accent)' }}
                      >
                        Browse
                      </p>
                      <h3
                        className="font-display font-bold uppercase text-lg mb-2"
                        style={{ color: 'var(--fg)' }}
                      >
                        Motion Recording
                      </h3>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: 'var(--fg-muted)' }}
                      >
                        Recover a kinetic sequence from a preserved video
                        recording.
                      </p>
                    </div>
                    <span
                      className="mt-auto text-xs font-semibold tracking-widest uppercase inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                      style={{ color: 'var(--accent)' }}
                    >
                      Select Recording â†’
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hidden file input â€” available at all times for source cards */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/*
           * â”€â”€ Video + pose overlay â”€â”€
           * flex-1 + absolute positioning fills available space between navbar
           * and toolbar without overflowing or causing page scroll on iOS.
           * object-contain on the video preserves aspect ratio with letterboxing.
           * PoseCanvas covers the same container; both scale from videoWÃ—videoH
           * coordinates to CSS container size uniformly, keeping overlay aligned.
           */}
          {!isLoading && sourceSelected && !captureComplete && (
            <div
              className="flex-1 min-h-0 overflow-hidden relative"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <video
                ref={videoRef}
                playsInline
                muted
                controls={source === 'browse' && !isDetecting}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ display: 'block' }}
              />
              {currentFrame && (
                <PoseCanvas
                  width={videoW}
                  height={videoH}
                  landmarks={currentFrame}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
              )}

              {/* Empty state: camera not yet ready */}
              {!webcamReady && source === 'live' && (
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
                        ? 'Allow camera access to continueâ€¦'
                        : 'Starting cameraâ€¦'}
                    </p>
                  )}
                </div>
              )}

              {/* Empty state: no video file selected */}
              {source === 'browse' && !videoReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p
                    className="text-sm uppercase tracking-widest"
                    style={{ color: 'var(--fg-muted)' }}
                  >
                    Browse to select a video
                  </p>
                </div>
              )}
            </div>
          )}

          {/* â”€â”€ Skeleton preview (capture complete) â”€â”€ */}
          {captureComplete && (
            <div className="flex-1 min-h-0 overflow-hidden relative">
              <PoseCanvas
                width={videoW}
                height={videoH}
                landmarks={previewLandmarks}
                className="absolute inset-0 w-full h-full"
              />
            </div>
          )}
        </div>
      </ToolbarLayout>
    </main>
  );
}
