/**
 * Living Sketch – Reanimation Theme
 *
 * Color tokens for both light (steel lab) and dark (deep lab) modes.
 * These mirror the CSS custom properties defined in app/globals.css.
 *
 * Use in:
 *  - Canvas rendering (pose skeleton lines, landmark dots)
 *  - Programmatic color access in hooks/utils
 *
 * Dark mode ("the deep lab"):
 *   Dark blue-black base, electric cyan accent for primary interactions,
 *   amber for signals/warnings, vivid red for danger.
 *
 * Light mode ("the modern lab"):
 *   Cool gray-white surfaces, deep blue accent,
 *   functional and high-contrast.
 */

export const darkTheme = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bg: '#0a0e14', // deep lab floor
  surface: '#111822', // raised panel
  surfaceRaised: '#172030', // card / modal surface
  surfaceHover: '#1e293b', // card hover state

  // ── Borders ───────────────────────────────────────────────────────────────
  border: '#1e3048', // subtle blue-dark border
  borderStrong: '#2d4a6a', // highlighted border

  // ── Text ──────────────────────────────────────────────────────────────────
  text: '#e2e8f0', // bright cool white
  textMuted: '#6b7e95', // muted steel blue

  // ── Accent – bright lime green ────────────────────────────────────────────
  accent: '#4ade80',
  accentHover: '#86efac',
  accentFaint: 'rgba(74, 222, 128, 0.08)',
  accentGlow: '0 0 20px rgba(74, 222, 128, 0.30)',

  // ── Signal – amber ────────────────────────────────────────────────────────
  signal: '#f59e0b',
  signalFaint: 'rgba(245, 158, 11, 0.10)',

  // ── Danger – vivid red ────────────────────────────────────────────────────
  danger: '#ef4444',
  dangerMuted: 'rgba(239, 68, 68, 0.12)',

  // ── Pose canvas colors ───────────────────────────────────────────────────
  landmarkLeft: '#4ade80',
  landmarkRight: '#86efac',
  landmarkCenter: '#bbf7d0',
  connectors: '#166534',
} as const;

export const lightTheme = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bg: '#000000', // cool gray-white
  surface: '#e8eaee', // raised surface
  surfaceRaised: '#dde0e6', // deeper card
  surfaceHover: '#d0d4dc', // card hover

  // ── Borders ───────────────────────────────────────────────────────────────
  border: '#bcc2cc', // steel border
  borderStrong: '#9aa0ae', // strong border

  // ── Text ──────────────────────────────────────────────────────────────────
  text: '#0f1219', // near-black
  textMuted: '#5c6370', // muted gray

  // ── Accent – dark forest green ────────────────────────────────────────────
  accent: '#16a34a',
  accentHover: '#15803d',
  accentFaint: 'rgba(22, 163, 74, 0.08)',
  accentGlow: '0 0 16px rgba(22, 163, 74, 0.20)',

  // ── Signal – amber ────────────────────────────────────────────────────────
  signal: '#d97706',
  signalFaint: 'rgba(217, 119, 6, 0.10)',

  // ── Danger – red ──────────────────────────────────────────────────────────
  danger: '#dc2626',
  dangerMuted: 'rgba(220, 38, 38, 0.10)',

  // ── Pose canvas colors ───────────────────────────────────────────────────
  landmarkLeft: '#16a34a',
  landmarkRight: '#15803d',
  landmarkCenter: '#166534',
  connectors: '#166534',
} as const;

export type Theme = typeof darkTheme;

/**
 * Maps CSS media-query preference to the correct theme object at runtime.
 * Use in canvas hooks where Tailwind classes aren't available.
 */
export function getActiveTheme(): Theme {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return darkTheme;
  }
  return lightTheme as unknown as Theme;
}
