import { useState } from "react";
import { featureFlags } from "../../../config/featureFlags.js";
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
  const firstUnlockedBuilding = buildings.find(
    (building) => building.status !== "locked",
  );
  const [selectedBuildingId, setSelectedBuildingId] = useState(
    firstActionBuilding?.id ?? firstUnlockedBuilding?.id ?? buildings[0]?.id,
  );
  const selectedBuilding =
    buildings.find((building) => building.id === selectedBuildingId) ??
    firstActionBuilding ??
    firstUnlockedBuilding ??
    buildings[0];
  const isIsometricCityEnabled = featureFlags.enableIsometricCity;

  function selectBuilding(building: CityBuildingViewModel) {
    setSelectedBuildingId(building.id);
    onBuildingClick(building);
  }

  return (
    <section className="city-scene-panel" aria-label="Mapa visual da Cidade Fortuna">
      <div className="city-scene-copy">
        <span className="section-kicker">
          {isIsometricCityEnabled
            ? "Mapa isometrico jogavel"
            : "Visualizacao experimental"}
        </span>
        <h2>
          {isIsometricCityEnabled
            ? "Cidade Fortuna em evolucao"
            : "Mapa isometrico oculto"}
        </h2>
        <p>
          {isIsometricCityEnabled
            ? "Predios individuais, ruas, pracas e alertas traduzem progresso financeiro educativo sem elementos de aposta."
            : "A visualizacao grafica da cidade esta desativada por configuracao. Os indicadores e cards educativos continuam disponiveis abaixo."}
        </p>
      </div>

      <div className="city-scene-shell">
        {isIsometricCityEnabled ? (
          <div
            className="city-scene-canvas"
            role="application"
            aria-label="Cidade isometrica interativa"
          >
            <CityMap
              buildings={buildings}
              selectedBuildingId={selectedBuilding?.id}
              onBuildingClick={selectBuilding}
            />
          </div>
        ) : (
          <div className="city-scene-fallback" role="status">
            <span className="section-kicker">Modo seguro</span>
            <h2>Visualizacao grafica em modo experimental</h2>
            <p>
              O mapa isometrico foi preservado no codigo e pode ser reativado
              quando a experiencia visual estiver pronta para validacao.
            </p>
          </div>
        )}

        {isIsometricCityEnabled && selectedBuilding ? (
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
