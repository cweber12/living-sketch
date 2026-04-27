import { Scan } from 'lucide-react';
import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

// Used as the "Extract" action button — scanning/analysing video frames for pose data.
export const CircularSawIcon = ({
  size = 24,
  color = 'currentColor',
  className,
}: IconProps) => (
  <Scan
    size={size}
    color={color}
    strokeWidth={ICON_STROKE}
    className={className}
    aria-hidden={true}
  />
);
