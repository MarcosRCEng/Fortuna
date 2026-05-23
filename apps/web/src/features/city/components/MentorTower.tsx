import type { CityDistrict } from "../domain/cityTypes.js";
import { CityBuilding } from "./CityBuilding.js";
import { CityStatusBadge } from "./CityStatusBadge.js";
import { MissionMarker } from "./MissionMarker.js";

export function MentorTower({
  district,
  selected,
  onSelect,
}: {
  district: CityDistrict;
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
      className={`city-district city-district-mentor ${selected ? "selected" : ""} city-state-${district.state}`}
      style={positionStyle}
      onClick={onSelect}
      aria-label={`${district.name}: ${district.description}`}
    >
      <div className="city-tile" />
      <div className="city-building-stack">
        {district.buildings.map((building, index) => (
          <CityBuilding key={building.id} building={building} index={index + 2} />
        ))}
      </div>
      {district.state === "mission_available" ? <MissionMarker /> : null}
      <strong>{district.name}</strong>
      <CityStatusBadge state={district.state} />
    </button>
  );
}
