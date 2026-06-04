export function CityGroundPlane() {
  return (
    <svg
      className="city-layer city-ground-plane"
      viewBox="0 0 900 600"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="city-ground-top" x1="0.26" x2="0.78" y1="0.15" y2="0.9">
          <stop offset="0%" stopColor="#e4f1dc" />
          <stop offset="45%" stopColor="#d3e8cf" />
          <stop offset="100%" stopColor="#b9d8bc" />
        </linearGradient>
        <linearGradient id="city-ground-left-side" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#99bea3" />
          <stop offset="100%" stopColor="#7fa890" />
        </linearGradient>
        <linearGradient id="city-ground-right-side" x1="1" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#8bb493" />
          <stop offset="100%" stopColor="#6f9a82" />
        </linearGradient>
        <filter id="city-ground-texture" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence baseFrequency="0.018" numOctaves="2" seed="7" type="fractalNoise" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.08" />
          </feComponentTransfer>
        </filter>
      </defs>

      <ellipse className="city-ground-shadow" cx="390" cy="520" rx="410" ry="62" />
      <path
        className="city-ground-side city-ground-side-left"
        d="M390 58 L850 284 L850 330 L390 560 L390 512 L804 306 Z"
      />
      <path
        className="city-ground-side city-ground-side-right"
        d="M390 58 L-70 284 L-70 330 L390 560 L390 512 L-24 306 Z"
      />
      <path className="city-ground-top" d="M390 58 L850 284 L390 512 L-70 284 Z" />
      <path className="city-ground-texture" d="M390 58 L850 284 L390 512 L-70 284 Z" />
      <path className="city-ground-rim" d="M390 58 L850 284 L390 512 L-70 284 Z" />
    </svg>
  );
}
