import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

export const RecordIcon = ({
  size = 20,
  color = 'currentColor',
  className,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden={true}
    className={className}
  >
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth={ICON_STROKE} />
    <circle cx="12" cy="12" r="5" stroke={color} strokeWidth={ICON_STROKE} />
    <circle cx="12" cy="12" r="1.5" fill={color} />
  </svg>
);
