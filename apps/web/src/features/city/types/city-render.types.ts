import type { CityBuildingType, CityBuildingViewModel } from "../city.types.js";

export type CityVisualStage = 0 | 1 | 2 | 3;

export type CityBuildingVisualId = CityBuildingType;

export interface CityTilePosition {
  tileX: number;
  tileY: number;
}

export interface CityScreenPosition {
  x: number;
  y: number;
}

export type CityBuildingSpriteRegistry = Record<
  CityBuildingVisualId,
  Record<CityVisualStage, string>
>;

export type CitySceneBuilding = CityBuildingViewModel;
