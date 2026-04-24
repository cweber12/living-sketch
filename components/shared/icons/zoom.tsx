export const ZoomIcon = ({
  size = '18px',
  color = 'currentColor',
}: {
  size?: string;
  color?: string;
}) => (
  <svg
    version="1.0"
    id="Layer_1"
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 64 64"
    enableBackground="new 0 0 64 64"
  >
    <path
      fill={color}
      d="M62.828,57.172L50.402,44.746C53.902,40.07,56,34.289,56,28C56,12.535,43.465,0,28,0S0,12.535,0,28
	s12.535,28,28,28c6.289,0,12.074-2.098,16.75-5.598l12.422,12.426c1.562,1.562,4.094,1.562,5.656,0S64.391,58.734,62.828,57.172z"
    />
  </svg>
);
