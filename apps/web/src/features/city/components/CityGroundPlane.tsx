import { CITY_MAP_CONFIG } from "../data/cityGridLayout.js";
import { getIsoMapDiamondPoints } from "../data/isoMath.js";

export function CityGroundPlane() {
  const [north, east, south, west] = getIsoMapDiamondPoints(CITY_MAP_CONFIG);
  const topPath = [
    `M${north.x} ${north.y - CITY_MAP_CONFIG.tileHeight / 2}`,
    `L${east.x + CITY_MAP_CONFIG.tileWidth / 2} ${east.y}`,
    `L${south.x} ${south.y + CITY_MAP_CONFIG.tileHeight / 2}`,
    `L${west.x - CITY_MAP_CONFIG.tileWidth / 2} ${west.y}`,
    "Z",
  ].join(" ");
  const leftSidePath = [
    `M${west.x - CITY_MAP_CONFIG.tileWidth / 2} ${west.y}`,
    `L${south.x} ${south.y + CITY_MAP_CONFIG.tileHeight / 2}`,
    `L${south.x} ${south.y + 76}`,
    `L${west.x - CITY_MAP_CONFIG.tileWidth / 2} ${west.y + 28}`,
    "Z",
  ].join(" ");
  const rightSidePath = [
    `M${east.x + CITY_MAP_CONFIG.tileWidth / 2} ${east.y}`,
    `L${south.x} ${south.y + CITY_MAP_CONFIG.tileHeight / 2}`,
    `L${south.x} ${south.y + 76}`,
    `L${east.x + CITY_MAP_CONFIG.tileWidth / 2} ${east.y + 28}`,
    "Z",
  ].join(" ");

  return (
    <svg
      className="city-layer city-ground-plane"
      viewBox="0 0 1040 680"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="city-ground-top" x1="0.24" x2="0.8" y1="0.12" y2="0.92">
          <stop offset="0%" stopColor="#edf4df" />
          <stop offset="48%" stopColor="#dceccb" />
          <stop offset="100%" stopColor="#c3ddb8" />
        </linearGradient>
        <linearGradient id="city-ground-left-side" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#a8c6a4" />
          <stop offset="100%" stopColor="#8fb795" />
        </linearGradient>
        <linearGradient id="city-ground-right-side" x1="1" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#9bc19b" />
          <stop offset="100%" stopColor="#80aa88" />
        </linearGradient>
        <filter id="city-ground-texture" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence baseFrequency="0.018" numOctaves="2" seed="7" type="fractalNoise" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.08" />
          </feComponentTransfer>
        </filter>
      </defs>

      <ellipse
        className="city-ground-shadow"
        cx={south.x}
        cy={south.y + 92}
        rx="450"
        ry="64"
      />
      <path className="city-ground-side city-ground-side-left" d={leftSidePath} />
      <path className="city-ground-side city-ground-side-right" d={rightSidePath} />
      <path className="city-ground-top" d={topPath} />
      <path className="city-ground-texture" d={topPath} />
      <path className="city-ground-rim" d={topPath} />
    </svg>
  );
}
