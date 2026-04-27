/**
 * Shared icon constants and prop interface.
 *
 * All icon components — both custom SVG and Lucide wrappers — conform to
 * IconProps so call sites are uniform.
 */

/** Single source-of-truth for stroke weight across all icons. */
export const ICON_STROKE = 1.75;

export interface IconProps {
  /** Icon render size in px. Always a plain number — no 'px' suffix. */
  size?: number;
  /** Icon colour. Defaults to `currentColor` so it inherits from CSS. */
  color?: string;
  /** Optional Tailwind / CSS class forwarded to the root SVG element. */
  className?: string;
}
