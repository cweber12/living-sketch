import { SVG_LINE_WIDTH } from '@/lib/constants/sizes';

export const BarrelIcon = ({
  size,
  color,
}: {
  size?: string;
  color?: string;
}) => (
  <svg
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
    width={size || '18px'}
    height={size || '18px'}
    fill={color || 'currentColor'}
  >
    <ellipse
      cx="16"
      cy="7"
      rx="9"
      ry="4"
      fill="none"
      stroke="currentColor"
      strokeWidth={SVG_LINE_WIDTH.line}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M25,13c0,2.2-4,4-9,4s-9-1.8-9-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={SVG_LINE_WIDTH.line}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M25,19c0,2.2-4,4-9,4s-9-1.8-9-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={SVG_LINE_WIDTH.line}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8,9v14.2c-0.6,0.5-1,1.2-1,1.8c0,2.2,4,4,9,4s9-1.8,9-4c0-0.7-0.4-1.3-1-1.8V9"
      fill="none"
      stroke="currentColor"
      strokeWidth={SVG_LINE_WIDTH.line}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
