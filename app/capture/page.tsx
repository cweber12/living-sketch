'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { PoseCanvas } from '@/components/canvas/pose-canvas';
import { usePoseDetection } from '@/hooks/use-pose-detection';
import { useLandmarksStore } from '@/lib/stores/landmarks-store';
import {
  Toolbar,
  ToolbarSection,
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
  const iconSource = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="6" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M1.5 11a4.5 4.5 0 019 0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
  const iconStatus = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="7" width="2.5" height="4" rx="0.5" fill="currentColor" />
      <rect
        x="4.75"
        y="4.5"
        width="2.5"
        height="6.5"
        rx="0.5"
        fill="currentColor"
      />
      <rect
        x="8.5"
        y="1.5"
        width="2.5"
        height="9.5"
        rx="0.5"
        fill="currentColor"
      />
    </svg>
  );
  const iconJitter = (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 8l2-3 2 2 2-4 2 3 2-2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const toolbarContent = (
    <>
      <ToolbarSection label="Source" icon={iconSource} defaultOpen>
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
      </ToolbarSection>

      {/* ── Capture controls — direct toolbar items ── */}

      {isDetecting ? (
        <button
          onClick={handleStop}
          className="w-full rounded py-2 text-xs uppercase tracking-widest font-bold"
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
            className="btn-primary flex-1 rounded py-2 text-xs uppercase tracking-widest font-bold disabled:opacity-50"
          >
            {captureComplete ? 'Re-detect' : 'Start'}
          </button>
          {captureComplete && (
            <button
              onClick={handleNewCapture}
              className="btn-ghost rounded py-2 px-2.5 text-xs uppercase tracking-widest font-bold"
              title="Clear capture and start fresh"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* ── Status — direct toolbar item ── */}
      <div className="flex flex-col gap-1">
        <div
          className="flex items-center gap-1.5 px-0.5"
          style={{ color: 'var(--fg-muted)' }}
        >
          <span style={{ color: 'var(--accent)' }}>{iconStatus}</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">
            Status
          </span>
        </div>
        <div
          className="flex flex-col gap-1 text-[10px] uppercase tracking-widest px-0.5"
          style={{ color: 'var(--fg-muted)' }}
        >
          <span>
            Frames: <strong style={{ color: 'var(--fg)' }}>{frameCount}</strong>
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
      </div>

      {/* ── Reduce Jitter — shown only after capture complete ── */}
      {captureComplete && (
        <ToolbarSection label="Reduce Jitter" icon={iconJitter}>
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
        </ToolbarSection>
      )}

      {/* ── Save — direct toolbar item ── */}
      <button
        onClick={handleUpload}
        disabled={!canUpload}
        className="btn-primary w-full rounded py-2 text-xs uppercase tracking-widest font-bold disabled:opacity-50"
        title="Upload captured landmarks"
      >
        {uploadStatus === 'uploading' && 'Saving…'}
        {uploadStatus === 'done' && 'Saved ✓'}
        {uploadStatus === 'error' && 'Error'}
        {uploadStatus === 'idle' && 'Save'}
      </button>
    </>
  );

  return (
    <main
      className={`flex flex-1 w-full overflow-hidden ${toolbarMode === 'side' ? 'flex-row' : 'flex-col'}`}
    >
      <Toolbar sideWidth={176} onModeChange={setToolbarMode}>
        {toolbarContent}
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
    </main>
  );
}
