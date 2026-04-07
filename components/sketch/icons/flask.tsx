import { SVG_LINE_WIDTH } from '@/lib/constants/sizes';

export const FlaskIcon = ({
  size = 18,
  color = 'currentColor',
}: {
  size?: number;
  color?: string;
}) => {
  return (
    <svg
      fill={color}
      width={`${size}px`}
      height={`${size}px`}
      viewBox="0 0 24 24"
      id="flask-2"
      data-name="Flat Line"
      xmlns="http://www.w3.org/2000/svg"
      className="icon flat-line"
    >
      <path
        id="secondary"
        d="M18,15a6,6,0,1,1-8-5.65V3h4V9.35A6,6,0,0,1,18,15Z"
        style={{ fill: color, strokeWidth: SVG_LINE_WIDTH.line }}
      ></path>
      <path
        id="primary"
        d="M18,15a6,6,0,1,1-8-5.65V3h4V9.35A6,6,0,0,1,18,15ZM9,3h6"
        style={{
          fill: 'none',
          stroke: 'currentColor',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: SVG_LINE_WIDTH.line,
        }}
      ></path>
    </svg>
  );
};
