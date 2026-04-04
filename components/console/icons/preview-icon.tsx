// Preview icon – monitor/screen rectangle for Preview toolbar panel
export const PreviewIcon = ({ size = 12 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="1"
      y="2"
      width="10"
      height="7"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <path
      d="M4 10h4"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);
