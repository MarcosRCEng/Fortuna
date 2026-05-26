import { CityBuildingCard } from "./CityBuildingCard.js";
import type { CityBuildingViewModel } from "./city.types.js";

export function CityBuildingsGrid({
  buildings,
}: {
  buildings: CityBuildingViewModel[];
}) {
  return (
    <section className="city-grid" aria-label="Construcoes da Cidade Fortuna">
      {buildings.map((building) => (
        <CityBuildingCard key={building.id} building={building} />
      ))}
    </section>
  );
}
