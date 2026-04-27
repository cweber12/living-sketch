import { Brain } from 'lucide-react';
import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

export const BrainIcon = ({
  size = 15,
  color = 'currentColor',
  className,
}: IconProps) => (
  <Brain
    size={size}
    color={color}
    strokeWidth={ICON_STROKE}
    className={className}
    aria-hidden={true}
  />
);
