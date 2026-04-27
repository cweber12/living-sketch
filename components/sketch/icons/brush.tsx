import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

// Brush size cursor: outer circle shows brush boundary, crosshair shows center.
// Matches the classic painting-app brush cursor, communicating adjustable size.
export const BrushIcon = ({
  size = 16,
  color = 'currentColor',
  className,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden={true}
    className={className}
  >
    <circle cx="8" cy="8" r="5.5" stroke={color} strokeWidth={ICON_STROKE} />
    <line
      x1="8"
      y1="5"
      x2="8"
      y2="11"
      stroke={color}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
    <line
      x1="5"
      y1="8"
      x2="11"
      y2="8"
      stroke={color}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
  </svg>
);
