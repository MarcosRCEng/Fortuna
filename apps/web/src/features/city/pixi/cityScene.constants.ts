import type { CityBuildingType } from "../city.types.js";
import type { CityTilePosition } from "../types/city-render.types.js";

export const CITY_SCENE_WIDTH = 920;
export const CITY_SCENE_HEIGHT = 520;
export const CITY_GRID_WIDTH = 9;
export const CITY_GRID_HEIGHT = 7;

export const CITY_BUILDING_IDS = [
  "financial_hall",
  "reserve_bank",
  "city_exchange",
  "real_estate_center",
  "financial_school",
  "income_park",
  "mentor_tower",
] as const satisfies readonly CityBuildingType[];

export const CITY_BUILDING_POSITIONS: Record<CityBuildingType, CityTilePosition> = {
  financial_hall: { tileX: 2, tileY: 2 },
  reserve_bank: { tileX: 1, tileY: 4 },
  city_exchange: { tileX: 5, tileY: 2 },
  real_estate_center: { tileX: 4, tileY: 4 },
  financial_school: { tileX: 2, tileY: 5 },
  income_park: { tileX: 5, tileY: 5 },
  mentor_tower: { tileX: 7, tileY: 3 },
};
