import { Axe } from 'lucide-react';
import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

export const CleaverIcon = ({
  size = 20,
  color = 'currentColor',
  className,
}: IconProps) => (
  <Axe
    size={size}
    color={color}
    strokeWidth={ICON_STROKE}
    className={className}
    aria-hidden={true}
  />
);
