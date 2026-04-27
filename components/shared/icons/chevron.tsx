import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

export const ChevronDownIcon = ({
  size = 12,
  color = 'currentColor',
  className,
}: IconProps) => (
  <ChevronDown
    size={size}
    color={color}
    strokeWidth={ICON_STROKE}
    className={className}
    aria-hidden={true}
  />
);

export const ChevronUpIcon = ({
  size = 12,
  color = 'currentColor',
  className,
}: IconProps) => (
  <ChevronUp
    size={size}
    color={color}
    strokeWidth={ICON_STROKE}
    className={className}
    aria-hidden={true}
  />
);

export const ChevronLeftIcon = ({
  size = 12,
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

export const ChevronRightIcon = ({
  size = 12,
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
