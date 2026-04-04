// Draw scalpel icon – surgical scalpel for toolbar Tools panel
export const DrawScalpelIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    {/* Blade */}
    <path
      d="M2.5 11.5 L9 4 L10.5 5 L4.5 12.5 C3.8 13.1 2.5 13.2 2.2 12.5 C1.9 11.8 2.1 11.8 2.5 11.5Z"
      fill="currentColor"
      opacity="0.9"
    />
    {/* Handle / spine */}
    <path
      d="M8.5 3.5 L11.5 2 L12 2.5 L10.5 5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    {/* Guard notch */}
    <path
      d="M9 4 L10 3"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
      opacity="0.6"
    />
  </svg>
);
