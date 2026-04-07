import { SVG_LINE_WIDTH } from '@/lib/constants/sizes';
// Table icon – stylised cadaver figure for toolbar Layout panel
export const TableIcon = ({
  size = 20,
  color = 'currentColor',
}: {
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 512 512"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    stroke={color ?? 'currentColor'}
    strokeWidth={SVG_LINE_WIDTH.line ?? 1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 143h480" />
    <path d="M96 239h320" />
    <path d="M92 151l-7 219" />
    <path d="M416 151l7 219" />
  </svg>
);
