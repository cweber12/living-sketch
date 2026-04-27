import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

export const EllipseIcon = ({
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
    <ellipse
      cx="8"
      cy="8"
      rx="7"
      ry="4.5"
      stroke={color}
      strokeWidth={ICON_STROKE}
    />
  </svg>
);
