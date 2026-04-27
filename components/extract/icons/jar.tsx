import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

export const JarIcon = ({
  size = 18,
  color = 'currentColor',
  className,
}: IconProps) => (
  <svg
    fill="none"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden={true}
    className={className}
  >
    <path
      d="M17,5.59V3H7V5.59A3.41,3.41,0,0,1,6,8H6a3.41,3.41,0,0,0-1,2.41V20a1,1,0,0,0,1,1H18a1,1,0,0,0,1-1V10.41A3.41,3.41,0,0,0,18,8h0A3.41,3.41,0,0,1,17,5.59Z"
      style={{
        stroke: color,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: ICON_STROKE,
      }}
    />
    <line
      x1="18"
      y1="3"
      x2="6"
      y2="3"
      style={{
        stroke: color,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: ICON_STROKE,
      }}
    />
  </svg>
);
