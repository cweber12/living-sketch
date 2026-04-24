export const EllipseIcon = ({ size = 16 }: { size?: number | string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <ellipse
      cx="8"
      cy="8"
      rx="7"
      ry="4.5"
      stroke="currentColor"
      strokeWidth="2.5"
    />
  </svg>
);
