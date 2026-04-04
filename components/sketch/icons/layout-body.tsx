// Layout body icon – stylised cadaver figure for toolbar Layout panel
export const LayoutBodyIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    {/* Head */}
    <circle cx="7" cy="2.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
    {/* Torso */}
    <path
      d="M4.5 5.5 L9.5 5.5 L9 9 L7.5 9 L7.5 13 L6.5 13 L6.5 9 L5 9 Z"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Arms */}
    <path
      d="M4.5 5.5 L2 8 M9.5 5.5 L12 8"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
    />
  </svg>
);
