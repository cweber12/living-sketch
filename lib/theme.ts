/**
 * Living Sketch – Reanimation Theme
 *
 * Color tokens for both light (aged parchment) and dark (lab darkness) modes.
 * These mirror the CSS custom properties defined in app/globals.css.
 *
 * Use in:
 *  - Canvas rendering (pose skeleton lines, landmark dots)
 *  - Programmatic color access in hooks/utils
 *
 * Dark mode ("the laboratory at night"):
 *   Near-black with a faint green tint, acid chartreuse accent (Frankenstein
 *   lightning), blood red for danger.
 *
 * Light mode ("the aged journal"):
 *   Yellowed parchment background, dark sepia ink, bottle-green accent,
 *   dried-blood crimson for danger.
 */

export const darkTheme = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bg: '#050a05', // near-black lab floor
  surface: '#0c1a0a', // raised panel
  surfaceRaised: '#122008', // card / modal surface
  surfaceHover: '#183010', // card hover state

  // ── Borders ───────────────────────────────────────────────────────────────
  border: '#1d3816', // subtle green-dark border
  borderStrong: '#2e5c22', // highlighted border

  // ── Text ──────────────────────────────────────────────────────────────────
  text: '#d0ecbc', // pale green-white (moonlit lab glass)
  textMuted: '#5f8052', // muted sage

  // ── Accent – volt green (Frankenstein lightning bolt) ─────────────────────
  accent: '#7ffe00',
  accentHover: '#9dff33',
  accentFaint: 'rgba(127, 254, 0, 0.08)',
  accentGlow: '0 0 18px rgba(127, 254, 0, 0.35)',

  // ── Danger – blood red ────────────────────────────────────────────────────
  danger: '#c42828',
  dangerMuted: 'rgba(196, 40, 40, 0.15)',

  // ── Pose canvas colors ───────────────────────────────────────────────────
  landmarkLeft: '#7ffe00',
  landmarkRight: '#a3ff4d',
  landmarkCenter: '#ccff99',
  connectors: '#3d8b00',
} as const;

export const lightTheme = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bg: '#f0e8d0', // aged parchment
  surface: '#e4d8bc', // parchment raised  ─ card background
  surfaceRaised: '#d8cab0', // deeper card
  surfaceHover: '#ccba9c', // card hover

  // ── Borders ───────────────────────────────────────────────────────────────
  border: '#b0a07a', // worn parchment edge
  borderStrong: '#8a7850', // darkened parchment

  // ── Text ──────────────────────────────────────────────────────────────────
  text: '#180e04', // dark brown-black sepia ink
  textMuted: '#5a4830', // faded sepia

  // ── Accent – forest green (old lab bottle) ────────────────────────────────
  accent: '#3a7005',
  accentHover: '#2a5004',
  accentFaint: 'rgba(58, 112, 5, 0.10)',
  accentGlow: '0 0 14px rgba(58, 112, 5, 0.25)',

  // ── Danger – dried blood crimson ──────────────────────────────────────────
  danger: '#8b1414',
  dangerMuted: 'rgba(139, 20, 20, 0.12)',

  // ── Pose canvas colors ───────────────────────────────────────────────────
  landmarkLeft: '#3a7005',
  landmarkRight: '#2a5004',
  landmarkCenter: '#1a3002',
  connectors: '#1a3002',
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
