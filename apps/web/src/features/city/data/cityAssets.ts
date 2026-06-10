import type { CityBuildingStatus, CityBuildingType } from "../city.types.js";
import type { CityVisualStage } from "../types/city-render.types.js";
import { resolveCityBuildingVisualState } from "./cityBuildingVisualState.js";

export const CITY_TERRAIN_ASSET_BASE_PATH = "/assets/city/terrain";
export const CITY_DECORATION_ASSET_BASE_PATH = "/assets/city/decorations";
export const CITY_BUILDING_ASSET_BASE_PATH = "/assets/city/buildings";

export type CityTerrainAssetKey = "grass" | "plaza" | "empty_lot";

export type CityRoadAssetKey =
  | "road_straight"
  | "road_corner"
  | "road_t"
  | "road_cross";

export type CityBuildingVisualType =
  | "city_hall"
  | "reserve_bank"
  | "city_exchange"
  | "financial_school"
  | "mentor_tower"
  | "income_park"
  | "financial_hall"
  | "real_estate_center";

export type CityBuildingAssetAnchor = {
  anchorX: number;
  anchorY: number;
  offsetX: number;
  offsetY: number;
};

export type CityBuildingVisualDefinition = CityBuildingAssetAnchor & {
  id: CityBuildingType;
  type: CityBuildingVisualType;
  assetPrefix: string;
  gridX: number;
  gridY: number;
  sizeX: number;
  sizeY: number;
  level: 1;
  asset: string;
  renderWidth: number;
  badgeOffsetY: number;
  layerWeight: number;
};

export const CITY_TERRAIN_ASSETS: Record<CityTerrainAssetKey, string> = {
  grass: `${CITY_TERRAIN_ASSET_BASE_PATH}/tile_grass.png`,
  plaza: `${CITY_TERRAIN_ASSET_BASE_PATH}/tile_plaza.png`,
  empty_lot: `${CITY_TERRAIN_ASSET_BASE_PATH}/tile_sidewalk.png`,
};

export const CITY_ROAD_ASSETS: Record<CityRoadAssetKey, string> = {
  road_straight: `${CITY_TERRAIN_ASSET_BASE_PATH}/road_straight_ne.png`,
  road_corner: `${CITY_TERRAIN_ASSET_BASE_PATH}/road_corner_ne.png`,
  road_t: `${CITY_TERRAIN_ASSET_BASE_PATH}/road_t_junction.png`,
  road_cross: `${CITY_TERRAIN_ASSET_BASE_PATH}/road_cross.png`,
};

export const CITY_DECORATION_ASSETS = {
  bench: `${CITY_DECORATION_ASSET_BASE_PATH}/bench_01.png`,
  fountain: `${CITY_DECORATION_ASSET_BASE_PATH}/fountain_01.png`,
  hedge: `${CITY_DECORATION_ASSET_BASE_PATH}/hedge_01.png`,
  lamp: `${CITY_DECORATION_ASSET_BASE_PATH}/lamp_01.png`,
  sparkle: `${CITY_DECORATION_ASSET_BASE_PATH}/progress_sparkle_soft.png`,
  tree: `${CITY_DECORATION_ASSET_BASE_PATH}/tree_small_01.png`,
  roundTree: `${CITY_DECORATION_ASSET_BASE_PATH}/tree_round_01.png`,
  coin: `${CITY_DECORATION_ASSET_BASE_PATH}/yield_coin_small.png`,
} as const;

export const cityBuildingVisualRegistry: Record<
  CityBuildingType,
  CityBuildingVisualDefinition
> = {
  financial_hall: createBuildingVisual({
    id: "financial_hall",
    type: "city_hall",
    assetPrefix: "building_financial_hall",
    gridX: 4,
    gridY: 2,
    sizeX: 2,
    sizeY: 2,
    renderWidth: 176,
    badgeOffsetY: -166,
    layerWeight: 0.4,
  }),
  financial_school: createBuildingVisual({
    id: "financial_school",
    type: "financial_school",
    assetPrefix: "building_financial_school",
    gridX: 1,
    gridY: 1,
    sizeX: 2,
    sizeY: 2,
    renderWidth: 158,
    badgeOffsetY: -142,
    layerWeight: 0.4,
  }),
  city_exchange: createBuildingVisual({
    id: "city_exchange",
    type: "city_exchange",
    assetPrefix: "building_city_exchange",
    gridX: 8,
    gridY: 1,
    sizeX: 2,
    sizeY: 2,
    renderWidth: 168,
    badgeOffsetY: -150,
    layerWeight: 0.4,
  }),
  reserve_bank: createBuildingVisual({
    id: "reserve_bank",
    type: "reserve_bank",
    assetPrefix: "building_reserve_bank",
    gridX: 1,
    gridY: 5,
    sizeX: 2,
    sizeY: 2,
    renderWidth: 154,
    badgeOffsetY: -138,
    layerWeight: 0.4,
  }),
  income_park: createBuildingVisual({
    id: "income_park",
    type: "income_park",
    assetPrefix: "building_income_park",
    gridX: 4,
    gridY: 6,
    sizeX: 2,
    sizeY: 2,
    renderWidth: 182,
    badgeOffsetY: -142,
    layerWeight: 0.4,
  }),
  mentor_tower: createBuildingVisual({
    id: "mentor_tower",
    type: "mentor_tower",
    assetPrefix: "building_mentor_tower",
    gridX: 8,
    gridY: 5,
    sizeX: 2,
    sizeY: 2,
    renderWidth: 164,
    badgeOffsetY: -178,
    layerWeight: 0.4,
  }),
  real_estate_center: createBuildingVisual({
    id: "real_estate_center",
    type: "real_estate_center",
    assetPrefix: "building_real_estate_center",
    gridX: 8,
    gridY: 8,
    sizeX: 2,
    sizeY: 2,
    renderWidth: 160,
    badgeOffsetY: -142,
    layerWeight: 0.4,
  }),
};

export function getBuildingAssetStage(
  level: number,
  status?: CityBuildingStatus,
): CityVisualStage {
  return resolveCityBuildingVisualState({ level, status }).visualStage;
}

export function getCityBuildingAssetPath(
  buildingId: CityBuildingType,
  level: number,
  status?: CityBuildingStatus,
) {
  const definition = cityBuildingVisualRegistry[buildingId];

  return `${CITY_BUILDING_ASSET_BASE_PATH}/${definition.assetPrefix}_stage_${getBuildingAssetStage(level, status)}.png`;
}

function createBuildingVisual(
  definition: Omit<
    CityBuildingVisualDefinition,
    keyof CityBuildingAssetAnchor | "level" | "asset"
  > &
    Partial<CityBuildingAssetAnchor>,
): CityBuildingVisualDefinition {
  return {
    anchorX: 0.5,
    anchorY: 1,
    offsetX: 0,
    offsetY: 0,
    level: 1,
    asset: `${CITY_BUILDING_ASSET_BASE_PATH}/${definition.assetPrefix}_stage_1.png`,
    ...definition,
  };
}
