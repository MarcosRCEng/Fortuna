import type { CityBuilding as CityBuildingModel } from "../domain/cityTypes.js";

const districtClass = {
  safe_reserve: "city-building-safe",
  fixed_income: "city-building-fixed",
  real_estate: "city-building-real-estate",
  stocks: "city-building-stocks",
  education: "city-building-education",
  mentor: "city-building-mentor",
  market: "city-building-market",
  reports: "city-building-reports",
};

export function CityBuilding({
  building,
  index,
}: {
  building: CityBuildingModel;
  index: number;
}) {
  const height = 22 + building.level * 10 + index * 5;

  return (
    <div
      className={`city-building ${districtClass[building.districtType]} city-building-${building.state}`}
      style={{ height }}
      title={building.name}
    >
      <span />
    </div>
  );
}
