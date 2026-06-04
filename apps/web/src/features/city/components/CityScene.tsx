import { useState } from "react";
import type { CityBuildingViewModel } from "../city.types.js";
import { cityBuildingPads, cityIsoToScreen } from "../data/citySceneLayout.js";
import { CityBuildingLayer } from "./CityBuildingLayer.js";
import { CityDecorationLayer } from "./CityDecorationLayer.js";
import { CityGroundPlane } from "./CityGroundPlane.js";
import { CityHudOverlay } from "./CityHudOverlay.js";
import { CityRoadLayer } from "./CityRoadLayer.js";

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
          <div className="city-skyline" aria-hidden="true" />
          <div className="city-map-board">
            <CityGroundPlane />
            <svg
              className="city-layer city-pad-layer"
              viewBox="0 0 900 600"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {cityBuildingPads.map((pad) => {
                const position = cityIsoToScreen(pad.tileX, pad.tileY);

                return (
                  <polygon
                    key={pad.id}
                    className={`city-building-pad city-building-pad-${pad.variant}`}
                    points={createDiamondPoints(position.x, position.y, pad.width, pad.height)}
                  />
                );
              })}
            </svg>
            <CityRoadLayer />
            <CityDecorationLayer
              showYieldCoin={buildings.some((building) => building.id === "income_park" && building.hasAction)}
              showProgressSparkle={buildings.some((building) => building.level >= 3)}
            />
            <CityBuildingLayer
              buildings={buildings}
              selectedBuildingId={selectedBuilding?.id}
              onBuildingClick={selectBuilding}
            />
          </div>
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

function createDiamondPoints(centerX: number, centerY: number, width: number, height: number) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return [
    `${centerX},${centerY - halfHeight}`,
    `${centerX + halfWidth},${centerY}`,
    `${centerX},${centerY + halfHeight}`,
    `${centerX - halfWidth},${centerY}`,
  ].join(" ");
}
