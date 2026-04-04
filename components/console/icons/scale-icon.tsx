// Scale icon – corner expand arrows for Scale Parts control
export const ScaleIcon = ({ size = 12 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M1.5 4.5V1.5h3M1.5 7.5V10.5h3M7.5 1.5H10.5v3M10.5 7.5V10.5H7.5"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
