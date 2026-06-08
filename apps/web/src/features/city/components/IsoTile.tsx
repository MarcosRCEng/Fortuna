import { CITY_ROAD_ASSETS } from "../data/cityAssets.js";
import { CITY_MAP_CONFIG, type CityGridTile } from "../data/cityGridLayout.js";
import { isoToScreen } from "../data/isoMath.js";

export function IsoTile({
  tile,
  className = "",
}: {
  tile: CityGridTile;
  className?: string;
}) {
  const position = isoToScreen(tile, CITY_MAP_CONFIG);
  const asset = tile.road ? CITY_ROAD_ASSETS[tile.road.variant] : tile.terrainAsset;
  const rotation = tile.road?.rotation ?? 0;
  const classNames = [
    "city-iso-tile",
    `city-iso-tile-${tile.type}`,
    tile.road ? `city-iso-road-${tile.road.variant}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <img
      className={classNames}
      src={asset}
      alt=""
      aria-hidden="true"
      draggable={false}
      data-grid-x={tile.gridX}
      data-grid-y={tile.gridY}
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      }}
    />
  );
}
