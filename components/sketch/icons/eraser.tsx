import { Eraser } from 'lucide-react';
import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

export const EraserIcon = ({
  size = 16,
  color = 'currentColor',
  className,
}: IconProps) => (
  <Eraser
    size={size}
    color={color}
    strokeWidth={ICON_STROKE}
    className={className}
    aria-hidden={true}
  />
);
