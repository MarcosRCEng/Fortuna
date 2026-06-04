import { CITY_BUILDING_IDS } from "./cityScene.constants.js";

export const CITY_BUILDING_ASSET_BASE_PATH = "/assets/city/buildings";

export const CITY_BUILDING_ASSET_MANIFEST = CITY_BUILDING_IDS.flatMap((buildingId) => [
  `${CITY_BUILDING_ASSET_BASE_PATH}/building_${buildingId}_stage_1.png`,
  `${CITY_BUILDING_ASSET_BASE_PATH}/building_${buildingId}_stage_2.png`,
  `${CITY_BUILDING_ASSET_BASE_PATH}/building_${buildingId}_stage_3.png`,
]);
