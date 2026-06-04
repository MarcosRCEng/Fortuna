import { useMemo, useState } from "react";
import type { CityBuildingViewModel } from "../city.types.js";
import {
  CITY_SCENE_GRID,
  cityIsoToScreen,
} from "../data/citySceneLayout.js";
import { CityBuildingLayer } from "./CityBuildingLayer.js";
import { CityDecorationLayer } from "./CityDecorationLayer.js";
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
  const sceneTiles = useMemo(() => {
    return Array.from(
      { length: CITY_SCENE_GRID.width * CITY_SCENE_GRID.height },
      (_, index) => {
        const tileX = index % CITY_SCENE_GRID.width;
        const tileY = Math.floor(index / CITY_SCENE_GRID.width);
        const position = cityIsoToScreen(tileX, tileY);
        const isPlaza = (tileX === 4 && tileY === 3) || (tileX === 4 && tileY === 4);
        const isGreen = tileX === 0 || tileY === 0 || tileX === 8 || tileY === 7;

        return {
          id: `tile-${tileX}-${tileY}`,
          className: isPlaza ? "city-base-tile-plaza" : isGreen ? "city-base-tile-green" : "",
          x: position.x,
          y: position.y,
        };
      },
    );
  }, []);

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
            <div className="city-layer city-base-layer" aria-hidden="true">
              {sceneTiles.map((tile) => (
                <span
                  key={tile.id}
                  className={`city-base-tile ${tile.className}`}
                  style={{ left: tile.x, top: tile.y }}
                />
              ))}
            </div>
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
