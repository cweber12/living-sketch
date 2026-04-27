import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

export const CleaverIcon = ({
  size = 20,
  color = 'currentColor',
  className,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden={true}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3.29,9,7.54,4.71A1,1,0,0,1,9,4.71l7.46,7.46-4.95,5a1,1,0,0,1-1.41,0L3.29,10.36A1,1,0,0,1,3.29,9ZM18.17,19.59,21,16.76l-4.59-4.59L13.59,15Z"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={ICON_STROKE}
    />
  </svg>
);
