import { X } from 'lucide-react';
import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

export const CloseIcon = ({
  size = 12,
  color = 'currentColor',
  className,
}: IconProps) => (
  <X
    size={size}
    color={color}
    strokeWidth={ICON_STROKE}
    className={className}
    aria-hidden={true}
  />
);
