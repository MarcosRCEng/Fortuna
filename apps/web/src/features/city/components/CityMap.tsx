import { useMemo } from "react";
import type { CityBuildingViewModel } from "../city.types.js";
import {
  CITY_MAP_CONFIG,
  cityGridTiles,
  createCityGridBuildings,
  type CityGridBuilding,
  type CityGridTile,
} from "../data/cityGridLayout.js";
import {
  formatIsoSvgPoints,
  getAnchoredFootprintDiamondPoints,
  sortByIsoDepth,
  type IsoScreenPoint,
} from "../data/isoMath.js";
import { CityBuildingLayer } from "./CityBuildingLayer.js";
import { CityDecorationLayer } from "./CityDecorationLayer.js";
import { CityGroundPlane } from "./CityGroundPlane.js";
import { CityOverlayBadge } from "./CityOverlayBadge.js";
import { CityRoadLayer } from "./CityRoadLayer.js";
import { IsoTile } from "./IsoTile.js";

export const SHOW_CITY_DEBUG_GRID = false;
const BUILDING_SHADOW_OFFSET_Y = -6;

export function CityMap({
  buildings,
  selectedBuildingId,
  onBuildingClick,
}: {
  buildings: CityBuildingViewModel[];
  selectedBuildingId?: string;
  onBuildingClick: (building: CityBuildingViewModel) => void;
}) {
  const gridBuildings = useMemo(
    () => createCityGridBuildings(buildings),
    [buildings],
  );
  const terrainTiles = useMemo(
    () =>
      sortByIsoDepth(
        cityGridTiles.filter((tile) => shouldRenderTerrainTile(tile)),
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
    <div
      className={`city-map-board${SHOW_CITY_DEBUG_GRID ? " city-map-board-debug" : ""}`}
    >
      <div className="city-layer city-background-layer" aria-hidden="true">
        <div className="city-skyline" />
      </div>
      <CityGroundPlane />
      <div className="city-layer city-terrain-layer" aria-hidden="true">
        {terrainTiles.map((tile) => (
          <IsoTile
            key={tile.id}
            tile={tile}
            showDebugAsset={SHOW_CITY_DEBUG_GRID}
          />
        ))}
      </div>
      <CityRoadLayer
        tiles={cityGridTiles}
        showDebugAsset={SHOW_CITY_DEBUG_GRID}
      />
      <div className="city-layer city-plaza-layer" aria-hidden="true">
        {plazaTiles.map((tile) => (
          <IsoTile
            key={tile.id}
            tile={tile}
            showDebugAsset={SHOW_CITY_DEBUG_GRID}
          />
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

function CityBuildingShadowLayer({
  buildings,
}: {
  buildings: CityGridBuilding[];
}) {
  return (
    <div className="city-layer city-building-shadow-layer" aria-hidden="true">
      {buildings.map((building) => (
        <span
          key={building.id}
          className={`city-building-shadow city-building-shadow-stage-${building.visualStage}`}
          style={{
            left: building.screenX,
            top: building.screenY + BUILDING_SHADOW_OFFSET_Y,
            width:
              CITY_MAP_CONFIG.tileWidth *
              Math.max(1.2, (building.sizeX + building.sizeY) * 0.64) *
              getBuildingShadowScale(building.visualStage),
            height:
              CITY_MAP_CONFIG.tileHeight *
              Math.max(0.68, (building.sizeX + building.sizeY) * 0.24) *
              getBuildingShadowScale(building.visualStage),
            zIndex: 90 + building.gridX + building.gridY,
          }}
        />
      ))}
    </div>
  );
}

function getBuildingShadowScale(visualStage: CityGridBuilding["visualStage"]) {
  return visualStage === 0 ? 0.64 : 1;
}

function CitySelectionOverlay({ building }: { building?: CityGridBuilding }) {
  if (!building) {
    return null;
  }

  const footprintPoints = getSelectionFootprintPoints(building);

  return (
    <svg
      className="city-layer city-selection-layer"
      viewBox="0 0 1040 680"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon
        className="city-selection-footprint-glow"
        points={footprintPoints}
      />
      <polygon
        className="city-selection-footprint"
        points={footprintPoints}
      />
    </svg>
  );
}

function shouldRenderTerrainTile(tile: CityGridTile) {
  if (tile.type === "empty_lot") {
    return true;
  }

  return tile.type === "grass" && !isNorthwestRimTile(tile);
}

function isNorthwestRimTile(tile: CityGridTile) {
  return tile.gridX === 0 || tile.gridY === 0;
}

function getSelectionFootprintPoints(building: CityGridBuilding) {
  return formatIsoSvgPoints(
    getAnchoredFootprintDiamondPoints(
      building,
      CITY_MAP_CONFIG,
      getBuildingBaseAnchor(building),
    ),
  );
}

function getBuildingBaseAnchor(building: CityGridBuilding): IsoScreenPoint {
  return {
    x: building.screenX,
    y: building.screenY,
  };
}
