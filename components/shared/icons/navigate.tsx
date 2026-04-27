import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

export const PrevIcon = ({
  size = 20,
  color = 'currentColor',
  className,
}: IconProps) => (
  <ChevronLeft
    size={size}
    color={color}
    strokeWidth={ICON_STROKE}
    className={className}
    aria-hidden={true}
  />
);

export const NextIcon = ({
  size = 20,
  color = 'currentColor',
  className,
}: IconProps) => (
  <ChevronRight
    size={size}
    color={color}
    strokeWidth={ICON_STROKE}
    className={className}
    aria-hidden={true}
  />
);
