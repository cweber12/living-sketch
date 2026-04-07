// Fridge icons: open and closed
// Closed fridge: https://www.svgrepo.com/svg/331489/fridge
// -----------------------------------------------------------------------------
export const FridgeClosedIcon = ({
  size,
  color,
}: {
  size?: string;
  color?: string;
}) => (
  <svg
    width={size || '20px'}
    height={size || '20px'}
    viewBox="0 0 64 64"
    enableBackground="new 0 0 64 64"
    id="Layer_1"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    fill={color || 'currentColor'}
  >
    <g>
      <path
        d="M22,55c-0.552,0-1,0.448-1,1v2c0,0.552,0.448,1,1,1s1-0.448,1-1v-2C23,55.448,22.552,55,22,55z"
        fill={color || 'currentColor'}
      />
      <path
        d="M42,55c-0.552,0-1,0.448-1,1v2c0,0.552,0.448,1,1,1s1-0.448,1-1v-2C43,55.448,42.552,55,42,55z"
        fill={color || 'currentColor'}
      />
    </g>
    <g>
      <path
        d="M46,21V9c-0.004-2.207-1.793-3.996-4-4H22c-2.207,0.004-3.996,1.793-4,4v12H46z M23,11c0-0.552,0.448-1,1-1   s1,0.448,1,1v6c0,0.552-0.448,1-1,1s-1-0.448-1-1V11z"
        fill={color || 'currentColor'}
      />
      <path
        d="M18,23v30c0.004,2.207,1.793,3.996,4,4h20c2.207-0.004,3.996-1.793,4-4V23H18z M25,33c0,0.552-0.448,1-1,1   s-1-0.448-1-1v-6c0-0.552,0.448-1,1-1s1,0.448,1,1V33z"
        fill={color || 'currentColor'}
      />
    </g>
  </svg>
);

// Open fridge: https://www.svgrepo.com/svg/331490/fridge-open
// NOTE: This icon is more complex and may need to be simplified for better
// performance at small sizes.
// -----------------------------------------------------------------------------
export const FridgeOpenIcon = ({
  size,
  color,
}: {
  size?: string;
  color?: string;
}) => (
  <svg
    width={size || '18px'}
    height={size || '18px'}
    viewBox="0 0 64 64"
    enableBackground="new 0 0 64 64"
    id="Layer_1"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g>
      <path
        d="M13.782,52.114v1.844c0,0.552,0.448,1,1,1s1-0.448,1-1v-1.844c0-0.552-0.448-1-1-1   
        S13.782,51.562,13.782,52.114"
        fill={color || 'currentColor'}
      />
      <path
        d="M32.746,52.114v1.844c0,0.552,0.448,1,1,1s1-0.448,1-1v-1.844c0-0.552-0.448-1-1-1   
        S32.746,51.562,32.746,52.114"
        fill={color || 'currentColor'}
      />
    </g>
    <g>
      <path
        d="M36.958,19.991V9c-0.004-2.207-1.793-3.996-4-4H14.938c-2.207,0.004-3.996,1.793-4,4v11L36.958,19.991z    
        M16.074,11c0-0.552,0.448-1,1-1s1,0.448,1,1v5c0,0.552-0.448,1-1,1s-1-0.448-1-1V11z"
        fill={color || 'currentColor'}
      />
      <rect fill={color || 'currentColor'} height="4" width="3" x="20" y="26" />
      <path
        d="M10.938,49.114c0.004,2.207,1.793,3.996,4,4h18.021c2.207-0.004,3.996-1.793,4-4V22H10.938V49.114z M26,46   
        h-4c-0.552,0-1-0.448-1-1s0.448-1,1-1h4c0.552,0,1,0.448,1,1S26.552,46,26,46z M16,30h2v-5c0-0.263,0.106-0.521,0.293-0.707   
        C18.479,24.106,18.737,24,19,24h5c0.263,0,0.521,0.106,0.707,0.293C24.894,24.479,25,24.737,25,25v5h7c0.552,0,1,0.448,1,1   
        s-0.448,1-1,1h-8h-5h-3c-0.552,0-1-0.448-1-1S15.448,30,16,30z M16,40h8v-5c0-0.263,0.106-0.521,0.293-0.707   
        C24.479,34.106,24.737,34,25,34h5c0.263,0,0.521,0.106,0.707,0.293C30.894,34.479,31,34.737,31,35v5h1c0.552,0,1,0.448,1,1   
        s-0.448,1-1,1h-2h-5h-9c-0.552,0-1-0.448-1-1S15.448,40,16,40z"
        fill={color || 'currentColor'}
      />
      <rect fill={color || 'currentColor'} height="4" width="3" x="26" y="36" />
    </g>
    <path
      d="M39.002,22c0,0.004-0.002,0.006-0.002,0.01v27.51c0.004,1.045,0.383,2.059,0.964,2.933  
        c0.586,0.871,1.385,1.615,2.362,2.034l7.557,3.212C50.344,57.895,50.814,58,51.281,58c0.754,0.006,1.497-0.303,1.986-0.858  
        c0.497-0.553,0.734-1.294,0.733-2.09V27.72"
      fill={color || 'currentColor'}
    />
  </svg>
);

export const FridgeIcon = ({
  size,
  color,
}: {
  size?: string;
  color?: string;
}) => (
  <svg
    width={size || '24px'}
    height={size || '24px'}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10 14L9 14"
      stroke={color || 'currentColor'}
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 6L9 6"
      stroke={color || 'currentColor'}
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 10V2.6C5 2.26863 5.26863 2 5.6 2H18.4C18.7314 2 19 2.26863 19 2.6V10M5 10V21.4C5 21.7314 5.26863 22 5.6 22H18.4C18.7314 22 19 21.7314 19 21.4V10M5 10H19"
      stroke={color || 'currentColor'}
      strokeWidth="1"
    />
  </svg>
);
