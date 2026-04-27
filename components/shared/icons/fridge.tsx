import { ICON_STROKE } from '@/lib/constants/icons';
import type { IconProps } from '@/lib/constants/icons';

// Closed fridge: https://www.svgrepo.com/svg/331489/fridge
export const FridgeClosedIcon = ({
  size = 24,
  color = 'currentColor',
  className,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden={true}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4.5365 19.3206V4.67986C4.5365 3.66912 5.35586 2.84976 6.36659 2.84976H17.3472C18.3579 2.84976 19.1773 3.66912 19.1773 4.67986V19.3206C19.1773 20.3314 18.3579 21.1507 17.3472 21.1507H6.36659C5.35586 21.1507 4.5365 20.3314 4.5365 19.3206Z"
      stroke={color}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
    <path
      d="M4.53625 9.25487H19.177"
      stroke={color}
      strokeWidth={ICON_STROKE}
      strokeLinecap="square"
    />
    <path
      d="M8.19653 12L8.19653 15.6602"
      stroke={color}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
    <path
      d="M8.19653 5.59467L8.19653 6.50997"
      stroke={color}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
    />
  </svg>
);

// Open fridge: https://www.svgrepo.com/svg/331490/fridge-open
export const FridgeOpenIcon = ({
  size = 18,
  color = 'currentColor',
  className,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden={true}
    className={className}
  >
    <g>
      <path
        d="M13.782,52.114v1.844c0,0.552,0.448,1,1,1s1-0.448,1-1v-1.844c0-0.552-0.448-1-1-1   
        S13.782,51.562,13.782,52.114"
        fill={color}
      />
      <path
        d="M32.746,52.114v1.844c0,0.552,0.448,1,1,1s1-0.448,1-1v-1.844c0-0.552-0.448-1-1-1   
        S32.746,51.562,32.746,52.114"
        fill={color}
      />
    </g>
    <g>
      <path
        d="M36.958,19.991V9c-0.004-2.207-1.793-3.996-4-4H14.938c-2.207,0.004-3.996,1.793-4,4v11L36.958,19.991z    
        M16.074,11c0-0.552,0.448-1,1-1s1,0.448,1,1v5c0,0.552-0.448,1-1,1s-1-0.448-1-1V11z"
        fill={color}
      />
      <rect fill={color} height="4" width="3" x="20" y="26" />
      <path
        d="M10.938,49.114c0.004,2.207,1.793,3.996,4,4h18.021c2.207-0.004,3.996-1.793,4-4V22H10.938V49.114z M26,46   
        h-4c-0.552,0-1-0.448-1-1s0.448-1,1-1h4c0.552,0,1,0.448,1,1S26.552,46,26,46z M16,30h2v-5c0-0.263,0.106-0.521,0.293-0.707   
        C18.479,24.106,18.737,24,19,24h5c0.263,0,0.521,0.106,0.707,0.293C24.894,24.479,25,24.737,25,25v5h7c0.552,0,1,0.448,1,1   
        s-0.448,1-1,1h-8h-5h-3c-0.552,0-1-0.448-1-1S15.448,30,16,30z M16,40h8v-5c0-0.263,0.106-0.521,0.293-0.707   
        C24.479,34.106,24.737,34,25,34h5c0.263,0,0.521,0.106,0.707,0.293C30.894,34.479,31,34.737,31,35v5h1c0.552,0,1,0.448,1,1   
        s-0.448,1-1,1h-2h-5h-9c-0.552,0-1-0.448-1-1S15.448,40,16,40z"
        fill={color}
      />
      <rect fill={color} height="4" width="3" x="26" y="36" />
    </g>
    <path
      d="M39.002,22c0,0.004-0.002,0.006-0.002,0.01v27.51c0.004,1.045,0.383,2.059,0.964,2.933  
        c0.586,0.871,1.385,1.615,2.362,2.034l7.557,3.212C50.344,57.895,50.814,58,51.281,58c0.754,0.006,1.497-0.303,1.986-0.858  
        c0.497-0.553,0.734-1.294,0.733-2.09V27.72"
      fill={color}
    />
  </svg>
);

export const FridgeIcon = ({
  size = 24,
  color = 'currentColor',
  className,
}: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden={true}
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10 14L9 14"
      stroke={color}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 6L9 6"
      stroke={color}
      strokeWidth={ICON_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 10V2.6C5 2.26863 5.26863 2 5.6 2H18.4C18.7314 2 19 2.26863 19 2.6V10M5 10V21.4C5 21.7314 5.26863 22 5.6 22H18.4C18.7314 22 19 21.7314 19 21.4V10M5 10H19"
      stroke={color}
      strokeWidth={ICON_STROKE}
    />
  </svg>
);
