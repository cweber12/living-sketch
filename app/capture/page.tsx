'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { PoseCanvas } from '@/components/canvas/pose-canvas';
import { usePoseDetection } from '@/hooks/use-pose-detection';
import { useLandmarksStore } from '@/lib/stores/landmarks-store';
import {
  Toolbar,
  ToolbarSection,
  SegmentedControl,
} from '@/components/ui/toolbar';
import type { LandmarkFrame } from '@/lib/types';

const PREVIEW_FRAME_MS = 1000 / 30;

type Source = 'webcam' | 'upload';

export default function CapturePage() {
  /* ── State ──────────────────────────────────────────────────────── */
  const [source, setSource] = useState<Source>('webcam');
  const [uploadStatus, setUploadStatus] = useState<
    'idle' | 'uploading' | 'done' | 'error'
  >('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [webcamReady, setWebcamReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFileName, setVideoFileName] = useState('');
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

  /* ── Webcam lifecycle ───────────────────────────────────────────── */
  const stopWebcam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setWebcamReady(false);
  }, []);

  const startWebcam = useCallback(async () => {
    stopWebcam();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setWebcamReady(true);
        };
      }
    } catch {
      setErrorMsg('Camera access denied or unavailable.');
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

  const canStart =
    isModelReady &&
    !isDetecting &&
    !captureComplete &&
    (source === 'webcam' ? webcamReady : videoReady);
  const canUpload = captureComplete && uploadStatus !== 'uploading';

  const videoW = videoDims.w || dimensions.width || 640;
  const videoH = videoDims.h || dimensions.height || 480;

  /* ── Animated skeleton preview ──────────────────────────────────── */
  useEffect(() => {
    if (!captureComplete || frames.length === 0) {
      cancelAnimationFrame(previewRafRef.current);
      setPreviewLandmarks(null);
      return;
    }
    previewIdxRef.current = 0;
    previewLastTimeRef.current = 0;
    setPreviewLandmarks(frames[0]);
    function loop(ts: number) {
      if (ts - previewLastTimeRef.current >= PREVIEW_FRAME_MS) {
        previewLastTimeRef.current = ts;
        setPreviewLandmarks(frames[previewIdxRef.current]);
        previewIdxRef.current = (previewIdxRef.current + 1) % frames.length;
      }
      previewRafRef.current = requestAnimationFrame(loop);
    }
    previewRafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(previewRafRef.current);
  }, [captureComplete, frames]);

  /* ── Toolbar content ─────────────────────────────────────────── */
  const toolbarContent = (
    <>
      <ToolbarSection label="Source">
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

      <ToolbarSection label="Capture">
        {captureComplete ? (
          <button
            onClick={handleNewCapture}
            className="btn-ghost w-full rounded py-2 text-xs uppercase tracking-widest font-bold"
          >
            New Capture
          </button>
        ) : !isDetecting ? (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="btn-primary w-full rounded py-2 text-xs uppercase tracking-widest font-bold disabled:opacity-50"
          >
            Start Detection
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="w-full rounded py-2 text-xs uppercase tracking-widest font-bold"
            style={{
              backgroundColor: 'var(--danger)',
              color: 'var(--bg)',
            }}
          >
            Stop
          </button>
        )}
      </ToolbarSection>

      <ToolbarSection label="Status">
        <div
          className="flex flex-col gap-1.5 text-[10px] uppercase tracking-widest"
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
      </ToolbarSection>

      <div className="mt-auto">
        <button
          onClick={handleUpload}
          disabled={!canUpload}
          className="btn-primary w-full rounded py-2 text-xs uppercase tracking-widest font-bold disabled:opacity-50"
        >
          {uploadStatus === 'uploading' && 'Uploading…'}
          {uploadStatus === 'done' && 'Uploaded ✓'}
          {uploadStatus === 'error' && 'Error — retry'}
          {uploadStatus === 'idle' && 'Upload Landmarks'}
        </button>
      </div>
    </>
  );

  return (
    <main className="flex flex-col lg:flex-row flex-1 w-full overflow-hidden">
      <Toolbar sideWidth={176}>{toolbarContent}</Toolbar>

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
                <div className="absolute inset-0 flex items-center justify-center">
                  <p
                    className="text-sm uppercase tracking-widest"
                    style={{ color: 'var(--fg-muted)' }}
                  >
                    Starting camera…
                  </p>
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
