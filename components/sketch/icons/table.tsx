// Table icon – stylised cadaver figure for toolbar Layout panel
export const TableIcon = ({
  size = 14,
  color = 'currentColor',
}: {
  size?: number;
  color?: string;
}) => (
  <svg
    height={`${size}px`}
    width={`${size}px`}
    fill={color}
    version="1.1"
    id="_x32_"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
  >
    <g>
      <polygon points="432.475,27.965 79.525,27.965 0,190.032 512,190.032 	" />
      <polygon
        points="0,270.083 0,484.035 58.684,484.035 58.684,302.921 453.293,302.921 453.293,484.035 512,484.035 
      512,270.083 512,218.837 0,218.837 	"
      />
    </g>
  </svg>
);
