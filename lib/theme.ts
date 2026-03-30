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
  bg: '#1c1826', // deepspace purple base
  surface: '#262238', // raised panel
  surfaceRaised: '#362f4f', // card / modal surface (palette dark)
  surfaceHover: '#3e3958', // card hover state

  // ── Borders ───────────────────────────────────────────────────────────────
  border: '#3a3358', // subtle purple border
  borderStrong: '#5b23ff', // electric violet (palette)

  // ── Text ──────────────────────────────────────────────────────────────────
  text: '#f4f2ff', // near-white with purple tint
  textMuted: '#8a82b8', // muted purple-grey

  // ── Accent – electric lime (palette #E4FF30) ───────────────────────────────
  accent: '#e4ff30',
  accentHover: '#ecff66',
  accentFaint: 'rgba(228, 255, 48, 0.12)',
  accentGlow: '0 0 18px rgba(228, 255, 48, 0.30)',

  // ── Secondary accent – electric blue (palette #008BFF) ────────────────────
  accentSecondary: '#008bff',

  // ── Danger ────────────────────────────────────────────────────────────────
  danger: '#ff4a6b',
  dangerMuted: 'rgba(255, 74, 107, 0.15)',

  // ── Pose canvas colors ───────────────────────────────────────────────────
  landmarkLeft: '#e4ff30', // electric lime – left side
  landmarkRight: '#008bff', // electric blue – right side
  landmarkCenter: '#f4f2ff', // near-white – midline
  connectors: '#5b23ff', // electric violet – skeleton lines
} as const;

export const lightTheme = {
  // ── Backgrounds ──────────────────────────────────────────────────────────
  bg: '#f0ecff', // soft lavender
  surface: '#e5dfff', // slightly deeper lavender
  surfaceRaised: '#d8d0ff', // card background
  surfaceHover: '#c8bcff', // card hover

  // ── Borders ───────────────────────────────────────────────────────────────
  border: '#b8b0e8',
  borderStrong: '#7b6bd0',

  // ── Text ──────────────────────────────────────────────────────────────────
  text: '#1c1826',
  textMuted: '#5a4e88',

  // ── Accent – electric violet (light mode primary) ─────────────────────────
  accent: '#5b23ff',
  accentHover: '#4015d4',
  accentFaint: 'rgba(91, 35, 255, 0.1)',
  accentGlow: '0 0 14px rgba(91, 35, 255, 0.25)',

  // ── Secondary accent – electric blue ──────────────────────────────────────
  accentSecondary: '#008bff',

  // ── Danger ────────────────────────────────────────────────────────────────
  danger: '#d6194b',
  dangerMuted: 'rgba(214, 25, 75, 0.12)',

  // ── Pose canvas colors ───────────────────────────────────────────────────
  landmarkLeft: '#5b23ff', // electric violet – left side
  landmarkRight: '#008bff', // electric blue – right side
  landmarkCenter: '#1c1826', // dark – midline
  connectors: '#8a7fcc', // muted violet – skeleton lines
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
