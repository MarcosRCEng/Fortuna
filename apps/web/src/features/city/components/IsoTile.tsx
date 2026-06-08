import { CITY_ROAD_ASSETS } from "../data/cityAssets.js";
import { CITY_MAP_CONFIG, type CityGridTile } from "../data/cityGridLayout.js";
import { isoToScreen } from "../data/isoMath.js";

export function IsoTile({
  tile,
  className = "",
  showDebugAsset = false,
}: {
  tile: CityGridTile;
  className?: string;
  showDebugAsset?: boolean;
}) {
  const position = isoToScreen(tile, CITY_MAP_CONFIG);
  const asset = tile.road ? CITY_ROAD_ASSETS[tile.road.variant] : tile.terrainAsset;
  const rotation = tile.road?.rotation ?? 0;
  const roadConnectionClassNames =
    tile.road?.connections.map((connection) => `city-road-connect-${connection}`) ?? [];
  const classNames = [
    "city-iso-tile",
    `city-iso-tile-${tile.type}`,
    `city-iso-tile-tone-${getTileTone(tile)}`,
    tile.road ? `city-iso-road-${tile.road.variant}` : "",
    ...roadConnectionClassNames,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      className={classNames}
      aria-hidden="true"
      data-grid-x={tile.gridX}
      data-grid-y={tile.gridY}
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
      }}
    >
      <span className="city-iso-tile-surface" />
      {tile.road ? (
        <span className="city-road-visual" aria-hidden="true">
          <span className="city-road-core" />
          {tile.road.connections.map((connection) => (
            <span
              key={connection}
              className={`city-road-arm city-road-arm-${connection}`}
            />
          ))}
        </span>
      ) : null}
      {showDebugAsset ? (
        <img
          className="city-iso-tile-asset"
          src={asset}
          alt=""
          draggable={false}
          style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
        />
      ) : null}
    </span>
  );
}

function getTileTone(tile: Pick<CityGridTile, "gridX" | "gridY">) {
  return (tile.gridX * 3 + tile.gridY * 5) % 4;
}
