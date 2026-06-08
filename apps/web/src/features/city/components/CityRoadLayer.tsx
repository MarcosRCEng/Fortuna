import type { CityGridTile } from "../data/cityGridLayout.js";
import { sortByIsoDepth } from "../data/isoMath.js";
import { IsoTile } from "./IsoTile.js";

export function CityRoadLayer({
  tiles,
  showDebugAsset = false,
}: {
  tiles: CityGridTile[];
  showDebugAsset?: boolean;
}) {
  const roadTiles = sortByIsoDepth(tiles.filter((tile) => tile.type === "road"));

  return (
    <div className="city-layer city-road-layer" aria-hidden="true">
      {roadTiles.map((tile) => (
        <IsoTile key={tile.id} tile={tile} showDebugAsset={showDebugAsset} />
      ))}
    </div>
  );
}
