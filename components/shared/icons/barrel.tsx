import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

export const BarrelIcon = ({
  size = 18,
  color = 'currentColor',
  className,
}: IconProps) => (
  <svg
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    fill="none"
    aria-hidden={true}
    className={className}
  >
    <ellipse
      cx="16"
      cy="7"
      rx="9"
      ry="4"
      stroke={color}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M25,13c0,2.2-4,4-9,4s-9-1.8-9-4"
      stroke={color}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M25,19c0,2.2-4,4-9,4s-9-1.8-9-4"
      stroke={color}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8,9v14.2c-0.6,0.5-1,1.2-1,1.8c0,2.2,4,4,9,4s9-1.8,9-4c0-0.7-0.4-1.3-1-1.8V9"
      stroke={color}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
