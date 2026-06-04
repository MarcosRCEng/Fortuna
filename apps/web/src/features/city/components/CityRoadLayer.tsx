import { useEffect, useRef } from "react";
import { Application, Graphics } from "pixi.js";
import { cityRoadSegments, type CityRoadSegment } from "../data/cityRoadLayout.js";
import { cityIsoToScreen } from "../data/citySceneLayout.js";

type RoadConnection = {
  tileX: number;
  tileY: number;
  width: number;
  kind: CityRoadSegment["kind"];
  count: number;
};

export function CityRoadLayer() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;

    if (!host) {
      return;
    }

    let isDisposed = false;
    let isInitialized = false;
    const app = new Application();

    void app
      .init({
        width: 900,
        height: 600,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      })
      .then(() => {
        isInitialized = true;

        if (isDisposed) {
          app.destroy(true);
          return;
        }

        app.canvas.className = "city-road-canvas";
        host.appendChild(app.canvas);
        drawRoads(app.stage);
      });

    return () => {
      isDisposed = true;
      if (isInitialized) {
        app.destroy(true);
      }
    };
  }, []);

  return <div ref={hostRef} className="city-layer city-road-layer" aria-hidden="true" />;
}

function drawRoads(stage: Application["stage"]) {
  const shadows = new Graphics();
  const roadBeds = new Graphics();
  const roadSurfaces = new Graphics();
  const connectionShadows = new Graphics();
  const connections = new Graphics();
  const connectionEdges = new Graphics();

  for (const segment of cityRoadSegments) {
    const polygon = createRoadPolygon(segment);
    const shadowPolygon = polygon.map((value, index) => value + (index % 2 === 0 ? 0 : 4));

    shadows.poly(shadowPolygon, true).fill({ color: 0x23333b, alpha: 0.14 });
    roadBeds.poly(expandPolygon(polygon, 5), true).fill({ color: 0xd9d2bf, alpha: 0.92 });
    roadSurfaces
      .poly(polygon, true)
      .fill({ color: segment.kind === "main" ? 0x64747a : 0x718286, alpha: 0.98 });
  }

  for (const connection of getRoadConnections()) {
    const position = cityIsoToScreen(connection.tileX, connection.tileY);
    const halfWidth = connection.width / 2 + 8;
    const halfHeight = halfWidth * 0.52;

    connectionShadows
      .poly(createDiamond(position.x, position.y + 4, halfWidth + 3, halfHeight + 2), true)
      .fill({ color: 0x23333b, alpha: 0.12 });
    connections
      .poly(createDiamond(position.x, position.y, halfWidth, halfHeight), true)
      .fill({ color: connection.kind === "main" ? 0x69797d : 0x74858a, alpha: 0.98 });
    connectionEdges
      .poly(createDiamond(position.x, position.y, halfWidth + 5, halfHeight + 3), true)
      .stroke({ color: 0xe4decf, alpha: 0.46, width: 2 });
  }

  stage.addChild(shadows, connectionShadows, roadBeds, roadSurfaces, connections, connectionEdges);
}

function createRoadPolygon(segment: CityRoadSegment) {
  const from = cityIsoToScreen(segment.from.tileX, segment.from.tileY);
  const to = cityIsoToScreen(segment.to.tileX, segment.to.tileY);
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY) || 1;
  const normalX = (-deltaY / length) * (segment.width / 2);
  const normalY = (deltaX / length) * (segment.width / 2);

  return [
    from.x + normalX,
    from.y + normalY,
    to.x + normalX,
    to.y + normalY,
    to.x - normalX,
    to.y - normalY,
    from.x - normalX,
    from.y - normalY,
  ];
}

function getRoadConnections() {
  const connections = new Map<string, RoadConnection>();

  for (const segment of cityRoadSegments) {
    for (const point of [segment.from, segment.to]) {
      const key = `${point.tileX}:${point.tileY}`;
      const current = connections.get(key);

      connections.set(key, {
        tileX: point.tileX,
        tileY: point.tileY,
        width: Math.max(current?.width ?? 0, segment.width),
        kind: current?.kind === "main" || segment.kind === "main" ? "main" : "secondary",
        count: (current?.count ?? 0) + 1,
      });
    }
  }

  return [...connections.values()].filter((connection) => connection.count > 1);
}

function createDiamond(centerX: number, centerY: number, halfWidth: number, halfHeight: number) {
  return [
    centerX,
    centerY - halfHeight,
    centerX + halfWidth,
    centerY,
    centerX,
    centerY + halfHeight,
    centerX - halfWidth,
    centerY,
  ];
}

function expandPolygon(polygon: number[], amount: number) {
  const center = polygon.reduce(
    (accumulator, value, index) => {
      if (index % 2 === 0) {
        accumulator.x += value;
      } else {
        accumulator.y += value;
      }

      return accumulator;
    },
    { x: 0, y: 0 },
  );
  const pointCount = polygon.length / 2;
  center.x /= pointCount;
  center.y /= pointCount;

  return polygon.map((value, index) => {
    const isX = index % 2 === 0;
    const pointX = isX ? value : polygon[index - 1];
    const pointY = isX ? polygon[index + 1] : value;
    const deltaX = pointX - center.x;
    const deltaY = pointY - center.y;
    const length = Math.hypot(deltaX, deltaY) || 1;

    return value + ((isX ? deltaX : deltaY) / length) * amount;
  });
}
