import { cityIsoToScreen, cityRoadRoutes } from "../data/citySceneLayout.js";

export function CityRoadLayer() {
  return (
    <svg
      className="city-layer city-road-layer"
      aria-hidden="true"
      viewBox="0 0 900 600"
      preserveAspectRatio="none"
    >
      {cityRoadRoutes.map((route) => {
        const path = createRoadPath(route.points);

        return (
          <g key={route.id} className="city-road-route">
            <path className="city-road-curb" d={path} />
            <path className="city-road-asphalt" d={path} />
            <path className="city-road-centerline" d={path} />
          </g>
        );
      })}
    </svg>
  );
}

function createRoadPath(points: Array<{ tileX: number; tileY: number }>) {
  return points
    .map((point, index) => {
      const position = cityIsoToScreen(point.tileX, point.tileY);
      const command = index === 0 ? "M" : "L";

      return `${command} ${position.x} ${position.y}`;
    })
    .join(" ");
}
