import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

export const Flask2Icon = ({
  size = 18,
  color = 'currentColor',
  className,
  secondaryColor = 'none',
}: IconProps & { secondaryColor?: string }) => (
  <svg
    fill={color}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden={true}
    className={className}
  >
    <path
      d="M18,21H6a1,1,0,0,1-.88-1.47L10,10.46V3h4v7.46l4.88,9.07A1,1,0,0,1,18,21Z"
      style={{ fill: secondaryColor, strokeWidth: ICON_STROKE }}
    />
    <path
      d="M18,21H6a1,1,0,0,1-.88-1.47L10,10.46V3h4v7.46l4.88,9.07A1,1,0,0,1,18,21ZM9,3h6"
      style={{
        fill: 'none',
        stroke: color,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: ICON_STROKE,
      }}
    />
  </svg>
);
