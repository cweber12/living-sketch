import { LayoutGrid } from 'lucide-react';
import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

// TableIcon is used as the Layout section header icon in the sketch toolbar.
export const TableIcon = ({
  size = 14,
  color = 'currentColor',
  className,
}: IconProps) => (
  <LayoutGrid
    size={size}
    color={color}
    strokeWidth={ICON_STROKE}
    className={className}
    aria-hidden={true}
  />
);
