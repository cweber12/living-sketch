// Shift icon – directional arrows cross for Shift Anchors control
export const ShiftIcon = ({ size = 12 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M6 1.5v9M1.5 6h9"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <path
      d="M4.5 3L6 1.5 7.5 3M4.5 9L6 10.5 7.5 9M3 4.5L1.5 6 3 7.5M9 4.5L10.5 6 9 7.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
