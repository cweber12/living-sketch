export const CleaverIcon = ({
  size,
  color,
}: {
  size?: string;
  color?: string;
}) => (
  <svg
    width={size || '20px'}
    height={size || '20px'}
    viewBox="0 0 24 24"
    id="Line"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      id="primary"
      d="M3.29,9,7.54,4.71A1,1,0,0,1,9,4.71l7.46,7.46-4.95,5a1,1,0,0,1-1.41,0L3.29,10.36A1,1,0,0,1,3.29,9ZM18.17,19.59,21,16.76l-4.59-4.59L13.59,15Z"
      style={{
        fill: 'none',
        stroke: color || 'currentColor',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: '1px',
      }}
    ></path>
  </svg>
);
