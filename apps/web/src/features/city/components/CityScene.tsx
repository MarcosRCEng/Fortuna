import { useState } from "react";
import type { CityBuildingViewModel } from "../city.types.js";
import { CityHudOverlay } from "./CityHudOverlay.js";
import { CityMap } from "./CityMap.js";

export function CityScene({
  buildings,
  onBuildingClick,
}: {
  buildings: CityBuildingViewModel[];
  onBuildingClick: (building: CityBuildingViewModel) => void;
}) {
  const firstActionBuilding = buildings.find((building) => building.hasAction);
  const firstUnlockedBuilding = buildings.find((building) => building.status !== "locked");
  const [selectedBuildingId, setSelectedBuildingId] = useState(
    firstActionBuilding?.id ?? firstUnlockedBuilding?.id ?? buildings[0]?.id,
  );
  const selectedBuilding =
    buildings.find((building) => building.id === selectedBuildingId) ??
    firstActionBuilding ??
    firstUnlockedBuilding ??
    buildings[0];

  function selectBuilding(building: CityBuildingViewModel) {
    setSelectedBuildingId(building.id);
    onBuildingClick(building);
  }

  return (
    <section className="city-scene-panel" aria-label="Mapa visual da Cidade Fortuna">
      <div className="city-scene-copy">
        <span className="section-kicker">Mapa isometrico jogavel</span>
        <h2>Cidade Fortuna em evolucao</h2>
        <p>
          Predios individuais, ruas, pracas e alertas traduzem progresso financeiro
          educativo sem elementos de aposta.
        </p>
      </div>

      <div className="city-scene-shell">
        <div className="city-scene-canvas" role="application" aria-label="Cidade isometrica interativa">
          <CityMap
            buildings={buildings}
            selectedBuildingId={selectedBuilding?.id}
            onBuildingClick={selectBuilding}
          />
        </div>

        {selectedBuilding ? (
          <CityHudOverlay
            selectedBuilding={selectedBuilding}
            activeCount={buildings.filter((building) => building.level > 0).length}
            actionCount={buildings.filter((building) => building.hasAction).length}
            onOpenDetails={() => onBuildingClick(selectedBuilding)}
          />
        ) : null}
      </div>
    </section>
  );
}
