import type { CityBuildingType } from "../city.types.js";
import type { CityTilePosition } from "../types/city-render.types.js";
import { cityBuildingsCatalog } from "../data/cityBuildingsCatalog.js";
import { CITY_MAP_CONFIG } from "../data/cityGridLayout.js";
import { getCityBuildingPosition } from "../data/cityLayout.selectors.js";

export const CITY_SCENE_WIDTH = 1040;
export const CITY_SCENE_HEIGHT = 680;
export const CITY_GRID_WIDTH = CITY_MAP_CONFIG.width;
export const CITY_GRID_HEIGHT = CITY_MAP_CONFIG.height;

export const CITY_BUILDING_IDS = cityBuildingsCatalog.map(
  (building) => building.id,
) as CityBuildingType[];

export const CITY_BUILDING_POSITIONS: Record<CityBuildingType, CityTilePosition> =
  CITY_BUILDING_IDS.reduce(
    (positions, buildingId) => ({
      ...positions,
      [buildingId]: getCityBuildingPosition(buildingId),
    }),
    {} as Record<CityBuildingType, CityTilePosition>,
  );
