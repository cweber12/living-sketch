export const JarIcon = ({ size, color }: { size?: string; color?: string }) => (
  <svg
    fill={color || 'currentColor'}
    width={size || '18px'}
    height={size || '18px'}
    viewBox="0 0 24 24"
    id="jam"
    data-name="Line Color"
    xmlns="http://www.w3.org/2000/svg"
    className="icon line-color"
  >
    <g id="SVGRepo_bgCarrier" strokeWidth="0" />
    <g
      id="SVGRepo_tracerCarrier"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <g id="SVGRepo_iconCarrier">
      <path
        id="primary"
        d="M17,5.59V3H7V5.59A3.41,3.41,0,0,1,6,8H6a3.41,3.41,0,0,0-1,2.41V20a1,1,0,0,0,1,1H18a1,1,0,0,0,1-1V10.41A3.41,3.41,0,0,0,18,8h0A3.41,3.41,0,0,1,17,5.59Z"
        style={{
          fill: 'none',
          stroke: color || 'currentColor',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: 2,
        }}
      />
      <line
        id="secondary"
        x1="18"
        y1="3"
        x2="6"
        y2="3"
        style={{
          fill: 'none',
          stroke: color || 'currentColor',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: 2,
        }}
      />
    </g>
  </svg>
);
