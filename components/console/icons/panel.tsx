import { Menu } from 'lucide-react';
import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

export const PanelIcon = ({
  size = 12,
  color = 'currentColor',
  className,
}: IconProps) => (
  <Menu
    size={size}
    color={color}
    strokeWidth={ICON_STROKE}
    className={className}
    aria-hidden={true}
  />
);
