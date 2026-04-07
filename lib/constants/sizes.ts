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

// Body-part proportions relative to torso height
export const BODY_PROPORTIONS = {
  torsoHeightRatio: 0.25, // of viewport height
  torsoWidthToHeight: 0.6, // torso width = height * ratio
  headToTorsoWidth: 1.0, // head size = torso width
  armLengthRatio: 0.65, // arm length = torso height * ratio
  legLengthRatio: 0.6, // leg length = torso height * ratio
  handWidthRatio: 0.3, // hand width = torso width * ratio
  handLengthRatio: 0.2, // hand length = torso height * ratio
  footWidthRatio: 0.25, // foot width = torso width * ratio
  footLengthRatio: 0.15, // foot length = torso height * ratio
} as const;

export const SMALL_SCREEN_BREAKPOINT = 600;

export const ICON_SIZES = {
  toolbarIcon: 18,
  buttonIconLarge: 20,
  buttonIconMedium: 16,
  buttonIconSmall: 14,
} as const;

export const SVG_LINE_WIDTH = { line: 1.5 } as const;
