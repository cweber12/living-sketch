export const LineIcon = ({ size = 16 }: { size?: number | string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <line
      x1="3"
      y1="13"
      x2="13"
      y2="3"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);
