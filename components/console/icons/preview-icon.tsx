import { Monitor } from 'lucide-react';
import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

export const PreviewIcon = ({
  size = 12,
  color = 'currentColor',
  className,
}: IconProps) => (
  <Monitor
    size={size}
    color={color}
    strokeWidth={ICON_STROKE}
    className={className}
    aria-hidden={true}
  />
);
