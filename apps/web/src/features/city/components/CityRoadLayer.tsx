import { cityIsoToScreen, cityRoadRoutes } from "../data/citySceneLayout.js";

export function CityRoadLayer() {
  return (
    <svg
      className="city-layer city-road-layer"
      aria-hidden="true"
      viewBox="0 0 900 600"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="city-road-surface" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#7f8f8d" />
          <stop offset="55%" stopColor="#64757b" />
          <stop offset="100%" stopColor="#52636d" />
        </linearGradient>
      </defs>
      {cityRoadRoutes.map((route) => {
        const path = createRoadPath(route.points);

        return (
          <g key={route.id} className="city-road-route">
            <path className="city-road-bed" d={path} />
            <path className="city-road-curb" d={path} />
            <path className="city-road-asphalt" d={path} />
            {route.centerline ? <path className="city-road-centerline" d={path} /> : null}
          </g>
        );
      })}
    </svg>
  );
}

function createRoadPath(points: Array<{ tileX: number; tileY: number }>) {
  const screenPoints = points.map((point) => cityIsoToScreen(point.tileX, point.tileY));

  return screenPoints
    .map((point, index) => {
      if (index === 0) {
        return `M ${point.x} ${point.y}`;
      }

      const previous = screenPoints[index - 1];
      const controlX = (previous.x + point.x) / 2;
      const controlY = (previous.y + point.y) / 2;

      return `Q ${controlX} ${controlY} ${point.x} ${point.y}`;
    })
    .join(" ");
}
