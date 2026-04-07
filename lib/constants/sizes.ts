// Canvas & body-part sizing constants
// Migrated from drawing-app/constants/Sizes.js
// NOTE: In Next.js these will be calculated at runtime via hooks, not at import time.
// These are baseline ratios for SSR-safe defaults.

export const CANVAS_RATIO = {
  width: 0.45,
  height: 0.75,
} as const;

export const WEBCAM_DIMENSIONS = {
  width: 256,
  height: 224,
} as const;

export const SMALL_SCREEN_BREAKPOINT = 600;

export const ICON_SIZES = {
  toolbarIcon: 18,
  buttonIconLarge: 20,
  buttonIconMedium: 16,
  buttonIconSmall: 14,
} as const;

export const SVG_LINE_WIDTH = { line: 1.5 } as const;
