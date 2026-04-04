// Person view icons – front and back silhouettes
// Used by sketch page (side toggle) and console page (Creations label)

export const PersonFrontIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="7" cy="2.8" r="1.8" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="6.2" cy="2.5" r="0.42" fill="currentColor" />
    <circle cx="7.8" cy="2.5" r="0.42" fill="currentColor" />
    <path
      d="M4.5 5.5 L9.5 5.5 L9 9 L7.5 9 L7.5 13 L6.5 13 L6.5 9 L5 9 Z"
      stroke="currentColor"
      strokeWidth="1.1"
      fill="none"
      strokeLinejoin="round"
    />
    <path
      d="M4.5 6 L2.5 8 M9.5 6 L11.5 8"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
    />
  </svg>
);

export const PersonBackIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14 14"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="7" cy="2.8" r="1.8" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M5.5 1.8 Q7 1.2 8.5 1.8"
      stroke="currentColor"
      strokeWidth="0.9"
      fill="none"
      strokeLinecap="round"
      opacity="0.55"
    />
    <path
      d="M4.5 5.5 L9.5 5.5 L9 9 L7.5 9 L7.5 13 L6.5 13 L6.5 9 L5 9 Z"
      stroke="currentColor"
      strokeWidth="1.1"
      fill="none"
      strokeLinejoin="round"
    />
    <line
      x1="7"
      y1="5.5"
      x2="7"
      y2="9"
      stroke="currentColor"
      strokeWidth="0.8"
      opacity="0.5"
    />
    <path
      d="M4.5 6 L2.5 8 M9.5 6 L11.5 8"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
    />
  </svg>
);
