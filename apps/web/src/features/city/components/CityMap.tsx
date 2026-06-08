import { useMemo } from "react";
import type { CityBuildingViewModel } from "../city.types.js";
import {
  CITY_MAP_CONFIG,
  cityGridTiles,
  createCityGridBuildings,
  type CityGridBuilding,
} from "../data/cityGridLayout.js";
import { isoToScreen, sortByIsoDepth } from "../data/isoMath.js";
import { CityBuildingLayer } from "./CityBuildingLayer.js";
import { CityDecorationLayer } from "./CityDecorationLayer.js";
import { CityGroundPlane } from "./CityGroundPlane.js";
import { CityOverlayBadge } from "./CityOverlayBadge.js";
import { CityRoadLayer } from "./CityRoadLayer.js";
import { IsoTile } from "./IsoTile.js";

export function CityMap({
  buildings,
  selectedBuildingId,
  onBuildingClick,
}: {
  buildings: CityBuildingViewModel[];
  selectedBuildingId?: string;
  onBuildingClick: (building: CityBuildingViewModel) => void;
}) {
  const gridBuildings = useMemo(() => createCityGridBuildings(buildings), [buildings]);
  const terrainTiles = useMemo(
    () =>
      sortByIsoDepth(
        cityGridTiles.filter(
          (tile) => tile.type === "grass" || tile.type === "empty_lot",
        ),
      ),
    [],
  );
  const plazaTiles = useMemo(
    () => sortByIsoDepth(cityGridTiles.filter((tile) => tile.type === "plaza")),
    [],
  );
  const selectedBuilding = gridBuildings.find(
    (building) => building.id === selectedBuildingId,
  );

  return (
    <div className="city-map-board">
      <div className="city-layer city-background-layer" aria-hidden="true">
        <div className="city-skyline" />
      </div>
      <CityGroundPlane />
      <div className="city-layer city-terrain-layer" aria-hidden="true">
        {terrainTiles.map((tile) => (
          <IsoTile key={tile.id} tile={tile} />
        ))}
      </div>
      <CityRoadLayer tiles={cityGridTiles} />
      <div className="city-layer city-plaza-layer" aria-hidden="true">
        {plazaTiles.map((tile) => (
          <IsoTile key={tile.id} tile={tile} />
        ))}
      </div>
      <CityBuildingShadowLayer buildings={gridBuildings} />
      <CityBuildingLayer
        gridBuildings={gridBuildings}
        selectedBuildingId={selectedBuildingId}
        onBuildingClick={onBuildingClick}
      />
      <CityDecorationLayer
        showYieldCoin={buildings.some(
          (building) => building.id === "income_park" && building.hasAction,
        )}
        showProgressSparkle={buildings.some((building) => building.level >= 3)}
      />
      <div className="city-layer city-badge-layer" aria-hidden="true">
        {gridBuildings.map((building) => (
          <CityOverlayBadge key={building.id} building={building} />
        ))}
      </div>
      <CitySelectionOverlay building={selectedBuilding} />
    </div>
  );
}

function CityBuildingShadowLayer({ buildings }: { buildings: CityGridBuilding[] }) {
  return (
    <div className="city-layer city-building-shadow-layer" aria-hidden="true">
      {buildings.map((building) => (
        <span
          key={building.id}
          className="city-building-shadow"
          style={{
            left: building.screenX,
            top: building.screenY - 6,
            width:
              CITY_MAP_CONFIG.tileWidth *
              Math.max(1.2, (building.sizeX + building.sizeY) * 0.64),
            height:
              CITY_MAP_CONFIG.tileHeight *
              Math.max(0.68, (building.sizeX + building.sizeY) * 0.24),
            zIndex: 90 + building.gridX + building.gridY,
          }}
        />
      ))}
    </div>
  );
}

function CitySelectionOverlay({ building }: { building?: CityGridBuilding }) {
  if (!building) {
    return null;
  }

  return (
    <svg
      className="city-layer city-selection-layer"
      viewBox="0 0 1040 680"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon
        className="city-selection-footprint"
        points={getFootprintPolygonPoints(building)}
      />
    </svg>
  );
}

function getFootprintPolygonPoints(building: CityGridBuilding) {
  const north = isoToScreen(
    { gridX: building.gridX, gridY: building.gridY },
    CITY_MAP_CONFIG,
  );
  const east = isoToScreen(
    { gridX: building.gridX + building.sizeX - 1, gridY: building.gridY },
    CITY_MAP_CONFIG,
  );
  const south = isoToScreen(
    {
      gridX: building.gridX + building.sizeX - 1,
      gridY: building.gridY + building.sizeY - 1,
    },
    CITY_MAP_CONFIG,
  );
  const west = isoToScreen(
    { gridX: building.gridX, gridY: building.gridY + building.sizeY - 1 },
    CITY_MAP_CONFIG,
  );

  return [
    `${north.x},${north.y - CITY_MAP_CONFIG.tileHeight / 2}`,
    `${east.x + CITY_MAP_CONFIG.tileWidth / 2},${east.y}`,
    `${south.x},${south.y + CITY_MAP_CONFIG.tileHeight / 2}`,
    `${west.x - CITY_MAP_CONFIG.tileWidth / 2},${west.y}`,
  ].join(" ");
}
