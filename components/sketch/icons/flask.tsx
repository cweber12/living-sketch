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
      width={size}
      height={size}
      viewBox="0 0 24 24"
      id="flask-2"
      data-name="Flat Color"
      xmlns="http://www.w3.org/2000/svg"
      className="icon flat-color"
    >
      <path
        id="primary"
        d="M15,8.68V3a1,1,0,0,0-1-1H10A1,1,0,0,0,9,3V8.68a7,7,0,1,0,6,0Z"
        style={{ fill: color }}
      ></path>
      <path
        id="secondary"
        d="M15,4H9A1,1,0,0,1,9,2h6a1,1,0,0,1,0,2Z"
        style={{ fill: 'currentColor' }}
      >
        {' '}
      </path>
    </svg>
  );
};
