import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

// Running body: https://www.svgrepo.com/svg/331491/running
export const BodyRunningIcon = ({
  size = 18,
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
      d="M15 7C16.1046 7 17 6.10457 17 5C17 3.89543 16.1046 3 15 3C13.8954 3 13 3.89543 13 5C13 6.10457 13.8954 7 15 7Z"
      stroke={color}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12.6133 8.26691L9.30505 12.4021L13.4403 16.5374L11.3727 21.0861"
      stroke={color}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.4104 9.5075L9.79728 6.19931L12.6132 8.26692L15.508 11.5752H19.2297"
      stroke={color}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.89152 15.7103L7.65095 16.5374H4.34277"
      stroke={color}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Standing body: https://www.svgrepo.com/svg/331488/body
export const BodyIcon = ({
  size = 18,
  color = 'currentColor',
  className,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    stroke={color}
    strokeWidth={ICON_STROKE}
    strokeLinecap="round"
    strokeLinejoin="round"
    fill="none"
    aria-hidden={true}
    className={className}
  >
    <circle cx="12" cy="3" r="1" />
    <path d="M16 21L12 13M12 13V7M12 13L8 21M12 7L18 9M12 7L6 9" />
  </svg>
);
