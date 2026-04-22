import { SVG_LINE_WIDTH } from '@/lib/constants/sizes';
export const OptionsIcon = ({
  size = 20,
  color = 'currentColor',
}: {
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <rect x="2" y="3" width="12" height="1.5" rx="0.75" fill="currentColor" />
    <rect
      x="2"
      y="7.25"
      width="12"
      height="1.5"
      rx="0.75"
      fill="currentColor"
    />
    <rect
      x="2"
      y="11.5"
      width="12"
      height="1.5"
      rx="0.75"
      fill="currentColor"
    />
  </svg>
);
