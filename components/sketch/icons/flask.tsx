import type { IconProps } from '@/lib/constants/icons';

// Two-tone filled flask. The 'color' prop controls the primary fill;
// secondary path always renders in currentColor (inherits from CSS).
export const FlaskIcon = ({
  size = 18,
  color = 'currentColor',
  className,
}: IconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={true}
      className={className}
    >
      <path
        d="M15,8.68V3a1,1,0,0,0-1-1H10A1,1,0,0,0,9,3V8.68a7,7,0,1,0,6,0Z"
        fill={color}
      />
      <path
        d="M15,4H9A1,1,0,0,1,9,2h6a1,1,0,0,1,0,2Z"
        fill="currentColor"
        opacity="0.6"
      />
    </svg>
  );
};
