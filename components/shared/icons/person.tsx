import type { IconProps } from '@/lib/constants/icons';

export const PersonArmsUpIcon = ({
  size = 20,
  color = 'currentColor',
  className,
}: IconProps) => (
  <svg
    fill={color}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden={true}
    className={className}
  >
    <path d="M12 1a2 2 0 1 1-2 2 2 2 0 0 1 2-2zm8.79 4.546L14.776 6H9.223l-6.012-.454a.72.72 0 0 0-.168 1.428l6.106.97a.473.473 0 0 1 .395.409L10 12 6.865 22.067a.68.68 0 0 0 .313.808l.071.04a.707.707 0 0 0 .994-.338L12 13.914l3.757 8.663a.707.707 0 0 0 .994.338l.07-.04a.68.68 0 0 0 .314-.808L14 12l.456-3.647a.473.473 0 0 1 .395-.409l6.106-.97a.72.72 0 0 0-.168-1.428z" />
    <path fill="none" d="M0 0h24v24H0z" />
  </svg>
);

export const PersonArmsDownIcon = ({
  size = 20,
  color = 'currentColor',
  className,
}: IconProps) => (
  <svg
    fill={color}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden={true}
    className={className}
  >
    <path d="M13.9 2.999A1.9 1.9 0 1 1 12 1.1a1.9 1.9 0 0 1 1.9 1.899zM13.544 6h-3.088a1.855 1.855 0 0 0-1.8 1.405l-1.662 6.652a.667.667 0 0 0 .14.573.873.873 0 0 0 .665.33.718.718 0 0 0 .653-.445L10 9.1V13l-.922 9.219a.71.71 0 0 0 .707.781h.074a.69.69 0 0 0 .678-.563L12 14.583l1.463 7.854a.69.69 0 0 0 .678.563h.074a.71.71 0 0 0 .707-.781L14 13V9.1l1.548 5.415a.718.718 0 0 0 .653.444.873.873 0 0 0 .665-.329.667.667 0 0 0 .14-.573l-1.662-6.652A1.855 1.855 0 0 0 13.544 6z" />
    <path fill="none" d="M0 0h24v24H0z" />
  </svg>
);
