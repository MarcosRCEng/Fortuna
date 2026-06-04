import { getCityBuildingCatalogItem } from "../data/cityLayout.selectors.js";
import { CITY_BUILDING_IDS } from "./cityScene.constants.js";

export const CITY_BUILDING_ASSET_BASE_PATH = "/assets/city/buildings";

export const CITY_BUILDING_ASSET_MANIFEST = CITY_BUILDING_IDS.flatMap((buildingId) => {
  const { assetPrefix } = getCityBuildingCatalogItem(buildingId);

  return [
    `${CITY_BUILDING_ASSET_BASE_PATH}/${assetPrefix}_stage_1.png`,
    `${CITY_BUILDING_ASSET_BASE_PATH}/${assetPrefix}_stage_2.png`,
    `${CITY_BUILDING_ASSET_BASE_PATH}/${assetPrefix}_stage_3.png`,
  ];
});
