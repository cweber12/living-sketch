import { SVG_LINE_WIDTH } from '@/lib/constants/sizes';

export const Flask2Icon = ({
  size = 18,
  color = 'currentColor',
  secondaryColor = 'none',
}: {
  size?: number;
  color?: string;
  secondaryColor?: string;
}) => (
  <svg
    fill={color}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    id="flask-3"
    data-name="Flat Line"
    xmlns="http://www.w3.org/2000/svg"
    className="icon flat-line"
  >
    <path
      id="secondary"
      d="M18,21H6a1,1,0,0,1-.88-1.47L10,10.46V3h4v7.46l4.88,9.07A1,1,0,0,1,18,21Z"
      style={{ fill: secondaryColor, strokeWidth: SVG_LINE_WIDTH.line }}
    ></path>
    <path
      id="primary"
      d="M18,21H6a1,1,0,0,1-.88-1.47L10,10.46V3h4v7.46l4.88,9.07A1,1,0,0,1,18,21ZM9,3h6"
      style={{
        fill: 'none',
        stroke: color,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: SVG_LINE_WIDTH.line,
      }}
    ></path>
  </svg>
);
