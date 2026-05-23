import type { CityDistrict as CityDistrictModel } from "../domain/cityTypes.js";
import { CityBuilding } from "./CityBuilding.js";
import { CityStatusBadge } from "./CityStatusBadge.js";
import { MissionMarker } from "./MissionMarker.js";
import { YieldIndicator } from "./YieldIndicator.js";

export function CityDistrict({
  district,
  selected,
  onSelect,
}: {
  district: CityDistrictModel;
  selected: boolean;
  onSelect(): void;
}) {
  const positionStyle = {
    left: `${(district.position.x / 760) * 100}%`,
    top: `${(district.position.y / 500) * 100}%`,
  };

  return (
    <button
      type="button"
      className={`city-district city-state-${district.state} ${selected ? "selected" : ""}`}
      style={positionStyle}
      onClick={onSelect}
      aria-label={`${district.name}: ${district.description}`}
    >
      <div className="city-tile" />
      <div className="city-building-stack">
        {district.buildings.map((building, index) => (
          <CityBuilding key={building.id} building={building} index={index} />
        ))}
      </div>
      {district.state === "yield_available" ? <YieldIndicator /> : null}
      {district.state === "mission_available" ? <MissionMarker /> : null}
      {district.state === "mission_completed" ? <MissionMarker completed /> : null}
      <strong>{district.name}</strong>
      <CityStatusBadge state={district.state} />
    </button>
  );
}
