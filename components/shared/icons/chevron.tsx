import { SVG_LINE_WIDTH } from '@/lib/constants/sizes';
import path from 'path/win32';

export const ChevronDownIcon = ({
  size = 18,
  color = 'currentColor',
}: {
  size?: number | string;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9.5 10.5L12.1997 13.1997V13.1997C12.3656 13.3656 12.6344 13.3656 12.8003 13.1997V13.1997L15.5 10.5"
      stroke={color}
      stroke-width={SVG_LINE_WIDTH.line}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const ChevronUpIcon = ({
  size = 18,
  color = 'currentColor',
}: {
  size?: number | string;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15 13.5L12.3003 10.8003V10.8003C12.1344 10.6344 11.8656 10.6344 11.6997 10.8003V10.8003L9 13.5"
      stroke={color}
      stroke-width={SVG_LINE_WIDTH.line}
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);
