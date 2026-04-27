import { Trash2 } from 'lucide-react';
import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

export const TrashIcon = ({
  size = 16,
  color = 'currentColor',
  className,
}: IconProps) => (
  <Trash2
    size={size}
    color={color}
    strokeWidth={ICON_STROKE}
    className={className}
    aria-hidden={true}
  />
);
