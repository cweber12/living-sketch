import { ZoomIn } from 'lucide-react';
import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

export const ZoomIcon = ({
  size = 16,
  color = 'currentColor',
  className,
}: IconProps) => (
  <ZoomIn
    size={size}
    color={color}
    strokeWidth={ICON_STROKE}
    className={className}
    aria-hidden={true}
  />
);
