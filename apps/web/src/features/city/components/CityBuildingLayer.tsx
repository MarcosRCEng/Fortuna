import type { CityBuildingViewModel } from "../city.types.js";
import type { CityGridBuilding } from "../data/cityGridLayout.js";
import { IsoBuilding } from "./IsoBuilding.js";

export function CityBuildingLayer({
  gridBuildings,
  selectedBuildingId,
  onBuildingClick,
}: {
  gridBuildings: CityGridBuilding[];
  selectedBuildingId?: string;
  onBuildingClick: (building: CityBuildingViewModel) => void;
}) {
  return (
    <div className="city-layer city-building-layer">
      {gridBuildings.map((building) => (
        <IsoBuilding
          key={building.id}
          building={building}
          selected={building.id === selectedBuildingId}
          onSelect={onBuildingClick}
        />
      ))}
    </div>
  );
}
