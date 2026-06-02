import type { CityBuildingType } from "../city.types.js";
import type {
  CityBuildingSpriteRegistry,
  CityVisualStage,
} from "../types/city-render.types.js";
import { CITY_BUILDING_IDS, CITY_BUILDING_POSITIONS } from "./cityScene.constants.js";

const PLACEHOLDER_BASE_PATH = "/assets/city/placeholders";

export const GROUND_TILE_ASSET = `${PLACEHOLDER_BASE_PATH}/ground_tile.svg`;

export const CITY_BUILDING_SPRITES: CityBuildingSpriteRegistry =
  CITY_BUILDING_IDS.reduce((registry, buildingId) => {
    registry[buildingId] = {
      0: `${PLACEHOLDER_BASE_PATH}/building_${buildingId}_l0.svg`,
      1: `${PLACEHOLDER_BASE_PATH}/building_${buildingId}_l1.svg`,
      2: `${PLACEHOLDER_BASE_PATH}/building_${buildingId}_l2.svg`,
    };
    return registry;
  }, {} as CityBuildingSpriteRegistry);

export function getVisualStageFromLevel(level: number): CityVisualStage {
  if (level <= 0) {
    return 0;
  }

  if (level <= 2) {
    return 1;
  }

  return 2;
}

export function getBuildingSprite(
  buildingId: CityBuildingType,
  level: number,
): string {
  return CITY_BUILDING_SPRITES[buildingId][getVisualStageFromLevel(level)];
}

export function validateCitySpriteRegistry(): boolean {
  return CITY_BUILDING_IDS.every((buildingId) => {
    const sprites = CITY_BUILDING_SPRITES[buildingId];

    return (
      Boolean(CITY_BUILDING_POSITIONS[buildingId]) &&
      Boolean(sprites[0]) &&
      Boolean(sprites[1]) &&
      Boolean(sprites[2])
    );
  });
}
