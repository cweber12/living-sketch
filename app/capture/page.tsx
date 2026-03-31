'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { PoseCanvas } from '@/components/canvas/pose-canvas';
import { usePoseDetection } from '@/hooks/use-pose-detection';
import { useLandmarksStore } from '@/lib/stores/landmarks-store';

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  const { isLoading, isDetecting, frameCount, start, stop } =
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
  const canStart =
    !isDetecting &&
    !isLoading &&
    (source === 'webcam' ? webcamReady : videoReady);
  const canUpload =
    frames.length > 0 && !isDetecting && uploadStatus !== 'uploading';

  const videoW = videoRef.current?.videoWidth ?? 640;
  const videoH = videoRef.current?.videoHeight ?? 480;

  return (
    <main className="flex flex-col flex-1 w-full max-w-7xl mx-auto overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2 px-3 sm:px-4 pt-3 sm:pt-5 pb-2 sm:pb-3">
        <div className="min-w-0">
          <p
            className="text-[10px] sm:text-xs font-bold tracking-[0.35em] uppercase mb-0.5"
            style={{ color: 'var(--accent)' }}
          >
            II — Capture
          </p>
          <h1
            className="font-display font-black uppercase tracking-wider text-lg sm:text-2xl truncate"
            style={{ color: 'var(--fg)' }}
          >
            Motion Capture
          </h1>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div
        className="w-full px-3 sm:px-4 py-2 border-y flex items-center gap-2 flex-wrap"
        style={{
          borderColor: 'var(--border)',
          backgroundColor: 'var(--surface)',
        }}
      >
        {/* Source toggle */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => {
              if (isDetecting) handleStop();
              setSource('webcam');
              setVideoReady(false);
              setVideoFileName('');
            }}
            className="px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-widest transition-colors btn-ghost"
            style={
              source === 'webcam'
                ? { backgroundColor: 'var(--accent)', color: 'var(--bg)' }
                : {}
            }
          >
            Webcam
          </button>
          <button
            onClick={() => {
              if (isDetecting) handleStop();
              setSource('upload');
              setWebcamReady(false);
            }}
            className="px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-widest transition-colors btn-ghost"
            style={
              source === 'upload'
                ? { backgroundColor: 'var(--accent)', color: 'var(--bg)' }
                : {}
            }
          >
            Upload
          </button>
        </div>

        <div
          className="w-px h-5 hidden sm:block"
          style={{ backgroundColor: 'var(--border)' }}
        />

        {/* File input trigger */}
        {source === 'upload' && (
          <>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isDetecting}
              className="btn-ghost rounded px-3 py-1.5 text-xs uppercase tracking-widest font-semibold disabled:opacity-50"
            >
              {videoFileName || 'Choose File'}
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

        {/* Detection controls */}
        {!isDetecting ? (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="btn-primary rounded px-3 sm:px-5 py-1.5 text-xs uppercase tracking-widest font-bold disabled:opacity-50"
          >
            {isLoading ? 'Loading Model…' : 'Start Detection'}
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="rounded px-3 sm:px-5 py-1.5 text-xs uppercase tracking-widest font-bold"
            style={{
              backgroundColor: 'var(--danger)',
              color: 'var(--bg)',
            }}
          >
            Stop
          </button>
        )}

        {/* Upload landmarks */}
        <button
          onClick={handleUpload}
          disabled={!canUpload}
          className="btn-primary rounded px-3 sm:px-5 py-1.5 text-xs uppercase tracking-widest font-bold disabled:opacity-50 ml-auto"
        >
          {uploadStatus === 'uploading' && 'Uploading…'}
          {uploadStatus === 'done' && 'Uploaded ✓'}
          {uploadStatus === 'error' && 'Error — retry'}
          {uploadStatus === 'idle' && 'Upload Landmarks'}
        </button>
      </div>

      {/* ── Status bar ── */}
      <div
        className="w-full px-3 sm:px-4 py-1 flex items-center gap-3 text-[10px] uppercase tracking-widest"
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
        {isLoading && <span>Loading model…</span>}
        {errorMsg && <span style={{ color: 'var(--danger)' }}>{errorMsg}</span>}
      </div>

      {/* ── Video + pose overlay ── */}
      <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-4 min-h-0">
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            aspectRatio: `${videoW} / ${videoH}`,
            width: '100%',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-contain"
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
          {!webcamReady && source === 'webcam' && !isLoading && (
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
    </main>
  );
}
