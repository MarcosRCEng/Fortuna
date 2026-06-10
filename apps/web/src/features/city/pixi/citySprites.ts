import type { CityBuildingType } from "../city.types.js";
import type {
  CityBuildingSpriteRegistry,
  CityVisualStage,
} from "../types/city-render.types.js";
import {
  getCityBuildingCatalogItem,
  getCityBuildingPosition,
} from "../data/cityLayout.selectors.js";
import { CITY_BUILDING_IDS } from "./cityScene.constants.js";
import {
  CITY_BUILDING_ASSET_BASE_PATH,
  CITY_BUILDING_ASSET_MANIFEST_SET,
} from "./cityAssetManifest.js";
import { getCityVisualStageFromLevel } from "../data/cityBuildingVisualState.js";

const PLACEHOLDER_BASE_PATH = "/assets/city/placeholders";

export const GROUND_TILE_ASSET = `${PLACEHOLDER_BASE_PATH}/ground_tile.svg`;

export const CITY_BUILDING_SPRITES: CityBuildingSpriteRegistry =
  CITY_BUILDING_IDS.reduce((registry, buildingId) => {
    const { assetPrefix } = getCityBuildingCatalogItem(buildingId);

    registry[buildingId] = {
      0: `${CITY_BUILDING_ASSET_BASE_PATH}/${assetPrefix}_stage_0.png`,
      1: `${CITY_BUILDING_ASSET_BASE_PATH}/${assetPrefix}_stage_1.png`,
      2: `${CITY_BUILDING_ASSET_BASE_PATH}/${assetPrefix}_stage_2.png`,
      3: `${CITY_BUILDING_ASSET_BASE_PATH}/${assetPrefix}_stage_3.png`,
    };
    return registry;
  }, {} as CityBuildingSpriteRegistry);

export const CITY_BUILDING_PLACEHOLDER_SPRITES: CityBuildingSpriteRegistry =
  CITY_BUILDING_IDS.reduce((registry, buildingId) => {
    registry[buildingId] = {
      0: `${PLACEHOLDER_BASE_PATH}/building_${buildingId}_l0.svg`,
      1: `${PLACEHOLDER_BASE_PATH}/building_${buildingId}_l1.svg`,
      2: `${PLACEHOLDER_BASE_PATH}/building_${buildingId}_l2.svg`,
      3: `${PLACEHOLDER_BASE_PATH}/building_${buildingId}_l2.svg`,
    };
    return registry;
  }, {} as CityBuildingSpriteRegistry);

export function getVisualStageFromLevel(level: number): CityVisualStage {
  return getCityVisualStageFromLevel(level);
}

export function getVisualAssetStageFromLevel(level: number): CityVisualStage {
  return getVisualStageFromLevel(level);
}

export function getCityBuildingStageLabel(level: number): string {
  return `Stage ${getVisualStageFromLevel(level)}/3`;
}

export function getCityBuildingMaturityBadgeLabel(level: number): string {
  const stage = getVisualStageFromLevel(level);

  if (stage === 0) {
    return "Bloqueado";
  }

  if (stage === 1) {
    return "Primeiros passos";
  }

  if (stage === 2) {
    return "Em crescimento";
  }

  return "Maduro";
}

export function getBuildingSpriteScale(level: number): number {
  const stage = getVisualStageFromLevel(level);

  if (stage === 0) {
    return 0.11;
  }

  if (stage === 1) {
    return 0.14;
  }

  if (stage === 2) {
    return 0.17;
  }

  return 0.19;
}

export function getBuildingSprite(
  buildingId: CityBuildingType,
  level: number,
): string {
  const visualStage = getVisualStageFromLevel(level);
  const { assetPrefix } = getCityBuildingCatalogItem(buildingId);
  const assetPath = `${CITY_BUILDING_ASSET_BASE_PATH}/${assetPrefix}_stage_${visualStage}.png`;

  if (CITY_BUILDING_ASSET_MANIFEST_SET.has(assetPath)) {
    return assetPath;
  }

  return getBuildingPlaceholderSprite(buildingId, level);
}

export function getBuildingPlaceholderSprite(
  buildingId: CityBuildingType,
  level: number,
): string {
  return CITY_BUILDING_PLACEHOLDER_SPRITES[buildingId][getVisualStageFromLevel(level)];
}

export function validateCitySpriteRegistry(): boolean {
  return CITY_BUILDING_IDS.every((buildingId) => {
    const sprites = CITY_BUILDING_SPRITES[buildingId];

    return (
      Boolean(getCityBuildingPosition(buildingId)) &&
      Boolean(sprites[0]) &&
      Boolean(sprites[1]) &&
      Boolean(sprites[2]) &&
      Boolean(sprites[3])
    );
  });
}
